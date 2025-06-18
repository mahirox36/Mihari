import asyncio
from contextlib import asynccontextmanager
import logging
from typing import Optional
from fastapi import (
    FastAPI,
    BackgroundTasks,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    APIRouter,
)
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import uuid
from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme

from asyncyt import (
    Downloader,
    DownloadRequest,
    SearchRequest,
    PlaylistRequest,
    DownloadResponse,
    SearchResponse,
    PlaylistResponse,
    HealthResponse,
    DownloadProgress,
    VideoInfo,
    DownloadConfig,
    Quality,
    AudioFormat,
    VideoFormat,
)
from libs.Models import Downloads, init as _db_init

downloader: Downloader = Downloader()
HEARTBEAT_INTERVAL = 15


custom_theme = Theme(
    {
        "logging.level.debug": "bold italic #9b59b6",
        "logging.level.info": "bold #00c3ff",
        "logging.level.warning": "bold italic #ffae00",
        "logging.level.error": "bold #ff5c8a",
        "logging.level.critical": "bold blink reverse #ff0080 on #fff0f5",
    }
)
console = Console(force_terminal=True, theme=custom_theme)
rich_handler = RichHandler(
    level=logging.INFO,
    console=console,
    markup=True,
    rich_tracebacks=True,
    show_time=False,
    show_path=False,
)
root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
root_logger.handlers.clear()

# Add handlers to root logger
root_logger.addHandler(rich_handler)

for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    logger = logging.getLogger(name)
    logger.handlers.clear()
    logger.propagate = False  # Prevent double logs
    logger.setLevel(logging.DEBUG if "access" not in name else logging.INFO)
    logger.addHandler(rich_handler)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global downloader
    await downloader.setup_binaries()
    logger.info("http://0.0.0.0:8153/api/docs")
    await _db_init()
    yield


app = FastAPI(
    title="AsyncYT API",
    description="A high-performance async YouTube downloader API for Mihari",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)
api = APIRouter(prefix="/api/v1")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["0.0.0.0", "localhost", "127.0.0.1"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




def create_progress_callback(download: Downloads):
    async def progress_callback(progress: DownloadProgress):
        await download.update_progress(progress)

    return progress_callback


@api.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Check API and binary health status"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")

    return await downloader.health_check()


@api.get("/info", response_model=VideoInfo, tags=["Info"])
async def get_video_info(url: str):
    """Get detailed information about a video"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")

    try:
        info = await downloader.get_video_info(url)
        return info
    except Exception as e:
        console.print_exception(show_locals=True)
        raise HTTPException(
            status_code=400, detail=f"Failed to get video info: {str(e)}"
        )


@api.post("/search", response_model=SearchResponse, tags=["Search"])
async def search_videos(request: SearchRequest):
    """Search for videos on YouTube"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")

    return await downloader.search_with_response(request)


@api.post("/download", response_model=DownloadResponse, tags=["Download"])
async def download_video(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Download a single video"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")

    try:
        download = await Downloads.create_download(request.url, request.config)
        await download.start_download()
        response = await downloader.download_with_response(request)
        await download.determine_success(response)
        return response
    except Exception as e:
        await download.set_failed(str(e))
        raise HTTPException(500, str(e))


async def download_async(
    request: DownloadRequest, progress_callback, download: Downloads
):
    try:
        await download.start_download()
        response = await downloader.download_with_response(request, progress_callback)
        await download.determine_success(response)
    except Exception as e:
        await download.set_failed(str(e))
        raise HTTPException(500, str(e))


@api.post("/download/async", tags=["Download"])
async def download_video_async(
    request: DownloadRequest, background_tasks: BackgroundTasks
):
    """Start an async download and return task ID for progress tracking"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")

    download = await Downloads.create_download(request.url, request.config)

    progress_callback = create_progress_callback(download)

    background_tasks.add_task(download_async, request, progress_callback, download)

    return {"id": download.id, "message": "Download started", "status": "processing"}


@api.get("/download/progress/{id}", tags=["Download"])
async def get_download_progress(id: str):
    """Get progress of an async download"""
    result = await Downloads.get_or_none(id=id)
    if not result:
        raise HTTPException(status_code=404, detail="Task not found")
    return result.to_dict()


@api.post("/download/playlist", response_model=PlaylistResponse, tags=["Download"])
async def download_playlist(request: PlaylistRequest):
    """Download an entire playlist"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")

    try:
        download = await Downloads.create_download(request.url, request.config)
        await download.start_download()
        response = await downloader.download_playlist_with_response(request)
        await download.determine_success(response)
        return response
    except Exception as e:
        await download.set_failed(str(e))
        raise HTTPException(500, str(e))


@api.get("/formats", tags=["Info"])
async def get_supported_formats():
    """Get all supported audio and video formats"""
    return {
        "audio_formats": [format.value for format in AudioFormat],
        "video_formats": [format.value for format in VideoFormat],
        "quality_options": [quality.value for quality in Quality],
    }


@api.post("/validate-config", tags=["Config"])
async def validate_config(config: DownloadConfig):
    """Validate a download configuration"""
    try:

        return {"valid": True, "config": config.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid configuration: {str(e)}")


class BatchDownloadRequest(BaseModel):
    urls: list[str]
    config: Optional[DownloadConfig] = None


@api.post("/batch-download", tags=["Batch"])
async def batch_download(
    request: BatchDownloadRequest, background_tasks: BackgroundTasks
):
    """Download multiple videos in batch"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")

    if len(request.urls) > 50:
        raise HTTPException(status_code=400, detail="Maximum 50 URLs per batch")

    batch_id = str(uuid.uuid4())

    results = []
    for url in request.urls:
        try:
            download_request = DownloadRequest(url=url, config=request.config)
            result = await downloader.download_with_response(download_request)
            results.append({"url": url, "result": result.model_dump()})
        except Exception as e:
            results.append({"url": url, "error": str(e)})

    return {"batch_id": batch_id, "total_urls": len(request.urls), "results": results}


@api.get("/history", tags=["other"])
async def get_history():
    return await Downloads.get_user_downloads(as_model=True)


@api.websocket("/ws/download")
async def websocket_download(websocket: WebSocket):
    """WebSocket endpoint for real-time download progress"""
    await websocket.accept()

    async def send_heartbeat():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break
            await asyncio.sleep(HEARTBEAT_INTERVAL)

    heartbeat_task = asyncio.create_task(send_heartbeat())

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type", "") == "pong":
                continue

            request = DownloadRequest(**data)

            async def ws_progress_callback(progress: DownloadProgress):
                await websocket.send_json(
                    {"type": "progress", "data": progress.model_dump()}
                )

            try:
                result = await downloader.download_with_response(
                    request, ws_progress_callback
                )

                await websocket.send_json(
                    {"type": "complete", "data": result.model_dump()}
                )

                break

            except Exception as e:
                await websocket.send_json({"type": "error", "data": {"error": str(e)}})

    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass
        try:
            await websocket.close()
        except Exception:
            pass



app.include_router(api)
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8153,
        workers=1,
    )
