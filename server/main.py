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
from libs.Models import Downloads, Users, init as _db_init
from libs.basemodels import GetSettings, SaveSettings

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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)




def create_progress_callback(download: Downloads):
    async def progress_callback(progress: DownloadProgress):
        await download.update_progress(progress)

    return progress_callback


@api.get("/health", response_model=HealthResponse, tags=["Other"])
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


@api.post("/validate-config", tags=["Other"])
async def validate_config(config: DownloadConfig):
    """Validate a download configuration"""
    try:

        return {"valid": True, "config": config.model_dump()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid configuration: {str(e)}")


class BatchDownloadRequest(BaseModel):
    urls: list[str]
    config: Optional[DownloadConfig] = None


@api.post("/download/batch", tags=["Download"])
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


@api.get("/history", tags=["Other"])
async def get_history():
    return await Downloads.get_user_downloads(as_model=True)


@api.websocket("/ws/download")
async def websocket_download(websocket: WebSocket):
    """WebSocket endpoint for real-time download progress"""
    await websocket.accept()
    
    # Configuration
    IDLE_TIMEOUT = 300  # 5 minutes of inactivity before closing
    
    # Flags to control connection state
    download_active = False
    last_activity = asyncio.get_event_loop().time()
    
    async def send_heartbeat():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break
            await asyncio.sleep(HEARTBEAT_INTERVAL)
    
    async def handle_messages():
        """Handle incoming WebSocket messages"""
        nonlocal download_active, last_activity
        try:
            while True:
                data = await websocket.receive_json()
                last_activity = asyncio.get_event_loop().time()  # Update activity timestamp
                
                if data.get("type", "") == "pong":
                    # Handle pong responses
                    continue
                elif not download_active:
                    # Only start new downloads if none is active
                    request = DownloadRequest(**data)
                    download_active = True
                    
                    # Start download in background
                    download_task = asyncio.create_task(
                        process_download(request)
                    )
                    
                    # Don't await here - let it run concurrently
                    # The download will send its own completion/error messages
        except WebSocketDisconnect:
            logger.info("Client disconnected")
        except Exception as e:
            logger.warning(f"Message handling error: {e}")
    
    async def process_download(request: DownloadRequest):
        """Process download in background while allowing message handling"""
        nonlocal download_active, last_activity
        try:
            last_activity = asyncio.get_event_loop().time()  # Update activity at start
            
            async def ws_progress_callback(progress: DownloadProgress):
                nonlocal last_activity
                try:
                    await websocket.send_json(
                        {"type": "progress", "data": progress.model_dump()}
                    )
                    last_activity = asyncio.get_event_loop().time()  # Update on progress
                except Exception as e:
                    logger.warning(f"Failed to send progress: {e}")
            
            result = await downloader.download_with_response(
                request, ws_progress_callback
            )
            
            await websocket.send_json(
                {"type": "complete", "data": result.model_dump()}
            )
            last_activity = asyncio.get_event_loop().time()  # Update on completion
            
            
        except Exception as e:
            await websocket.send_json(
                {"type": "error", "data": {"error": str(e)}}
            )
            last_activity = asyncio.get_event_loop().time()  # Update on error
        finally:
            download_active = False
    
    async def handle_idle_timeout():
        """Monitor for idle timeout and close connection if inactive"""
        nonlocal last_activity
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                current_time = asyncio.get_event_loop().time()
                idle_time = current_time - last_activity
                
                if idle_time >= IDLE_TIMEOUT and not download_active:
                    logger.info(f"Closing WebSocket due to idle timeout ({idle_time:.1f}s)")
                    await websocket.close(code=1000, reason="Idle timeout")
                    break
                    
            except Exception as e:
                logger.warning(f"Idle timeout handler error: {e}")
                break
    
    # Start concurrent tasks
    heartbeat_task = asyncio.create_task(send_heartbeat())
    message_task = asyncio.create_task(handle_messages())
    timeout_task = asyncio.create_task(handle_idle_timeout())
    
    try:
        # Wait for any task to complete (usually message_task on disconnect or timeout_task on idle)
        done, pending = await asyncio.wait(
            [heartbeat_task, message_task, timeout_task],
            return_when=asyncio.FIRST_COMPLETED
        )
        
        # Cancel remaining tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
                
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        # Cleanup
        for task in [heartbeat_task, message_task, timeout_task]:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        
        try:
            await websocket.close()
        except Exception:
            pass


@api.post("/setting", tags=["settings"])
async def save_setting(request: SaveSettings):
    try: 
        user, _ = await Users.get_or_create(id=1)
        await user.set_setting(request.key, request.value)
        return {"status":"success"}
    except Exception as e:
        logger.error(e)
        return {"status":"failed", "error":str(e)}

@api.get("/setting", tags=["settings"])
async def get_setting(request: GetSettings):
    try: 
        user, _ = await Users.get_or_create(id=1)
        value = user.get_setting(request.key, request.default)
        return {"status":"success", "value": value}
    except Exception as e:
        logger.error(e)
        return {"status":"failed", "error":str(e)}

@api.get("/settings", tags=["settings"])
async def get_settings():
    try: 
        user, _ = await Users.get_or_create(id=1)
        return {"status":"success", "value": user.settings}
    except Exception as e:
        logger.error(e)
        return {"status":"failed", "error":str(e)}


app.include_router(api)
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8153,
        workers=1,
    )
