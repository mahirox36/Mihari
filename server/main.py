import asyncio
from contextlib import asynccontextmanager
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import re
import sys
from typing import Optional
from fastapi import (
    FastAPI,
    BackgroundTasks,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    APIRouter,
)
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
from pydantic import BaseModel
import uvicorn
import uuid
from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme
from asyncyt import (
    AsyncYT,
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
    DownloadNotFoundError,
    FFmpegProcessingError,
)
from asyncyt.utils import get_unique_filename
from libs.Models import (
    TORTOISE_ORM,
    Downloads,
    Update,
    Users,
    decode_presets_from_base64,
    encode_presets_to_base64,
    get_data_path,
    is_bundled,
)
from libs.basemodels import (
    GetSettings,
    Preset,
    PresetExport,
    PresetPath,
    PresetPath,
    SaveSettings,
)

downloader: AsyncYT = AsyncYT(get_data_path() / "bin")
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
file_handler = RotatingFileHandler(
    get_data_path() / "logs.log", maxBytes=1 * 1024 * 1024, backupCount=3
)
file_handler.setLevel(logging.INFO)

formatter = logging.Formatter(
    "[%(asctime)s] [%(levelname)s] %(message)s", datefmt="%Y-%m-%d %H:%M:%S"
)
file_handler.setFormatter(formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.DEBUG)
root_logger.handlers.clear()

# Add handlers to root logger
root_logger.addHandler(rich_handler)
root_logger.addHandler(file_handler)

for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    logger = logging.getLogger(name)
    logger.handlers.clear()
    logger.propagate = False  # Prevent double logs
    logger.setLevel(logging.DEBUG if "access" not in name else logging.INFO)
    logger.addHandler(rich_handler)
    root_logger.addHandler(file_handler)


def handle_exception(exc_type, exc_value, exc_traceback):
    if issubclass(exc_type, KeyboardInterrupt):
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    logger.critical(
        "Uncaught exception:", exc_info=(exc_type, exc_value, exc_traceback)
    )
    console.print_exception(show_locals=True)


sys.excepthook = handle_exception

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Updating Database")
    logger.info(f"sqlite://{str(get_data_path().absolute() / "Mihari.sqlite3")}")
    logger.info("http://0.0.0.0:8153/api/docs")
    result = await Update()
    if result is True:
        logger.info("Updating Finished")
    elif result is False:
        logger.info("No Need for Update")
    else:
        logger.warning("Something went wrong while Updating")

    if not is_bundled():
        logger.info("initializing AsyncYT.. (In dev mode)")
        await downloader.setup_binaries()
        logger.info("Finished initialize AsyncYT.")
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

    return await downloader.search(request=request)


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
        response = await downloader.download_playlist(request=request)
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


@api.delete("/history/{id}", tags=["Other"])
async def delete_history(id: int):
    item = await Downloads.get_or_none(id=id)
    if not item:
        raise HTTPException(404, detail="History Item not found")
    await item.delete()


@api.websocket("/ws/download")
async def websocket_download(websocket: WebSocket):
    """WebSocket endpoint for real-time download progress with multiple download support"""
    await websocket.accept()

    # Configuration
    IDLE_TIMEOUT = 300  # 5 minutes of inactivity before closing

    # Track multiple downloads by ID
    active_downloads = {}  # Dict[str, asyncio.Task]
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
        nonlocal last_activity
        try:
            while True:
                data = await websocket.receive_json()
                last_activity = asyncio.get_event_loop().time()

                if data.get("type", "") == "pong":
                    # Handle pong responses
                    continue
                elif data.get("type", "") == "cancel":
                    # Handle download cancellation
                    download_id = data.get("id")
                    if download_id and download_id in active_downloads:
                        try:
                            await downloader.cancel(download_id)
                            del active_downloads[download_id]
                            await websocket.send_json(
                                {"type": "cancelled", "id": download_id}
                            )
                        except DownloadNotFoundError:
                            pass
                else:
                    # Start new download
                    request = DownloadRequest(**data)
                    download_id = getattr(request, "id", None) or str(uuid.uuid4())

                    # Check if this download ID is already active
                    if download_id in active_downloads:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "id": download_id,
                                "data": {
                                    "error": "Download with this ID is already active"
                                },
                            }
                        )
                        continue

                    # Start download in background
                    download_task = asyncio.create_task(
                        process_download(request, download_id)
                    )
                    active_downloads[download_id] = download_task

        except WebSocketDisconnect:
            logger.info("Client disconnected")
        except Exception as e:
            logger.warning(f"Message handling error: {e}")

    async def process_download(request: DownloadRequest, download_id: str):
        """Process download in background while allowing message handling"""
        nonlocal last_activity

        try:
            if not request.config:
                request.config = DownloadConfig()
            download = await Downloads.create_download(request.url, request.config)
            last_activity = asyncio.get_event_loop().time()
            await websocket.send_json({"type": "info_id", "id": download_id})

            async def ws_progress_callback(progress: DownloadProgress):
                nonlocal last_activity
                try:
                    # Ensure progress includes the download ID
                    progress_data = progress.model_dump()
                    progress_data["id"] = download_id

                    await websocket.send_json(
                        {"type": "progress", "id": download_id, "data": progress_data}
                    )
                    last_activity = asyncio.get_event_loop().time()
                except Exception as e:
                    logger.warning(f"Failed to send progress for {download_id}: {e}")

            # Handle format configuration
            if request.config and request.config.video_format:
                request.config.video_format = VideoFormat(request.config.video_format)
            if request.config and request.config.audio_format:
                request.config.audio_format = AudioFormat(request.config.audio_format)

            await download.start_download()

            # Run video info retrieval and download concurrently
            info_task = asyncio.create_task(downloader.get_video_info(request.url))
            download_task = asyncio.create_task(
                downloader.download(request, ws_progress_callback)
            )

            # Wait for video info first and send it immediately when available
            try:
                data = await asyncio.wait_for(info_task, timeout=30.0)
                await websocket.send_json(
                    {"type": "info_data", "id": download_id, "data": data.model_dump()}
                )
            except Exception as e:
                logger.warning(f"Failed to get video info for {download_id}: {e}")
                # If video info fails, we can still continue with download
                data = None

            # Wait for download to complete
            filename = await download_task

            # Handle file renaming only if we have video info
            if data and data.title and request.config:
                file = Path(request.config.output_path) / Path(filename)
                title = re.sub(r'[\\/:"*?<>|]', "_", data.title)
                new_file = get_unique_filename(file, title)
                try:
                    file = file.rename(new_file)
                except OSError as e:
                    logger.warning(f"Failed to rename file: {e}")
            else:
                file = Path(filename)

            result = DownloadResponse(
                success=True,
                message="Download completed successfully",
                filename=str(file.absolute()),
                video_info=data,
                id=download_id,
            )

            await download.determine_success(result)

            # Ensure result includes the download ID
            result_data = result.model_dump()
            result_data["id"] = download_id

            if result.success:
                await websocket.send_json(
                    {"type": "complete", "id": download_id, "data": result_data}
                )
            else:
                await websocket.send_json(
                    {"type": "error", "id": download_id, "data": result_data}
                )

            last_activity = asyncio.get_event_loop().time()

        except asyncio.CancelledError:
            # Handle cancellation gracefully
            await download.set_canceled()
            await websocket.send_json(
                {
                    "type": "cancelled",
                    "id": download_id,
                    "data": {"error": "Download cancelled"},
                }
            )
            raise  # Re-raise to properly handle cancellation
        except FFmpegProcessingError as e:
            console.print_exception(show_locals=True)
            print(e.cmd)
            logger.error(e.error_code)
            logger.error(e.output)
            await download.set_failed(str(e))
            await websocket.send_json(
                {"type": "error", "id": download_id, "data": {"error": str(e)}}
            )
            last_activity = asyncio.get_event_loop().time()
        except Exception as e:
            console.print_exception(show_locals=True)
            await download.set_failed(str(e))
            await websocket.send_json(
                {"type": "error", "id": download_id, "data": {"error": str(e)}}
            )
            last_activity = asyncio.get_event_loop().time()

        finally:
            # Clean up this download from active downloads
            if download_id in active_downloads:
                del active_downloads[download_id]

    async def handle_idle_timeout():
        """Monitor for idle timeout and close connection if inactive"""
        nonlocal last_activity
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                current_time = asyncio.get_event_loop().time()
                idle_time = current_time - last_activity

                # Only close if no downloads are active
                if idle_time >= IDLE_TIMEOUT and not active_downloads:
                    logger.info(
                        f"Closing WebSocket due to idle timeout ({idle_time:.1f}s)"
                    )
                    await websocket.close(code=1000, reason="Idle timeout")
                    break

            except Exception as e:
                logger.warning(f"Idle timeout handler error: {e}")
                break

    async def cleanup_completed_downloads():
        """Periodically clean up completed download tasks"""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                completed_ids = []

                for download_id, task in active_downloads.items():
                    if task.done():
                        completed_ids.append(download_id)

                for download_id in completed_ids:
                    del active_downloads[download_id]

            except Exception as e:
                logger.warning(f"Cleanup task error: {e}")
                break

    # Start all background tasks
    heartbeat_task = asyncio.create_task(send_heartbeat())
    message_task = asyncio.create_task(handle_messages())
    timeout_task = asyncio.create_task(handle_idle_timeout())
    cleanup_task = asyncio.create_task(cleanup_completed_downloads())

    try:
        done, pending = await asyncio.wait(
            [heartbeat_task, message_task, timeout_task, cleanup_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
    finally:
        # Cancel all active downloads
        for download_task in active_downloads.values():
            if not download_task.done():
                download_task.cancel()
                try:
                    await download_task
                except asyncio.CancelledError:
                    pass

        # Cancel all background tasks
        for task in [heartbeat_task, message_task, timeout_task, cleanup_task]:
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


started_startup = False


@api.websocket("/ws/startup")
async def websocket_startup(websocket: WebSocket):
    """WebSocket endpoint for real-time startup progress"""
    global started_startup
    if started_startup:
        await websocket.close(
            code=1008, reason="Cannot accept: WebSocket connection is already accepted"
        )
        return
    await websocket.accept()
    started_startup = True

    async def send_heartbeat():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break
            await asyncio.sleep(HEARTBEAT_INTERVAL)

    async def process_startup():
        """Process startup in background while allowing message handling"""

        try:

            async for progress in downloader.setup_binaries_generator():

                await websocket.send_json(
                    {"type": "progress", "data": progress.model_dump()}
                )
            await websocket.send_json({"type": "complete"})

        except Exception as e:
            await websocket.send_json({"type": "error", "error": str(e)})
        finally:
            await websocket.close()

    # Start concurrent tasks
    heartbeat_task = asyncio.create_task(send_heartbeat())
    startup_task = asyncio.create_task(process_startup())

    try:
        done, pending = await asyncio.wait(
            [heartbeat_task, startup_task],
            return_when=asyncio.FIRST_COMPLETED,
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
        for task in [heartbeat_task, startup_task]:
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        try:
            await websocket.close()
            started_startup = False
        except Exception:
            pass


@api.post("/setting", tags=["settings"])
async def save_setting(request: SaveSettings):
    try:
        user, _ = await Users.get_or_create(id=1)
        await user.set_setting(request.key, request.value)
        return {"status": "success"}
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.get("/setting", tags=["settings"])
async def get_setting(request: GetSettings):
    try:
        user, _ = await Users.get_or_create(id=1)
        value = user.get_setting(request.key, request.default)
        return {"status": "success", "value": value}
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.get("/settings", tags=["settings"])
async def get_settings():
    try:
        user, _ = await Users.get_or_create(id=1)
        return {"status": "success", "value": user.settings}
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.post("/preset", tags=["presets"])
async def save_preset(request: Preset):
    try:
        user, _ = await Users.get_or_create(id=1)
        presets: list = user.get_setting("presets", [])
        if not request.uuid:
            presets.append(
                {
                    "uuid": str(uuid.uuid4()),
                    "name": request.name,
                    "description": request.description,
                    "config": request.config,
                }
            )
            await user.set_setting("presets", presets)
        else:
            preset = next((p for p in presets if p["uuid"] == request.uuid), None)
            if not preset:
                raise HTTPException(404, detail="Preset not found")
            preset["name"] = request.name
            preset["description"] = request.description
            preset["config"] = request.config
            await user.set_setting("presets", presets)

        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.get("/presets", tags=["presets"])
async def get_presets():
    try:
        user, _ = await Users.get_or_create(id=1)
        return user.get_setting("presets", [])
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.delete("/presets/{uuid}", tags=["presets"])
async def delete_preset(uuid: str):
    try:
        user, _ = await Users.get_or_create(id=1)
        presets: list = user.get_setting("presets", [])
        new_presets = [p for p in presets if p["uuid"] != uuid]
        if len(new_presets) == len(presets):
            raise HTTPException(404, detail="Preset not found")
        await user.set_setting("presets", new_presets)
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.post("/presets/export", tags=["presets"])
async def export_preset(payload: PresetExport):
    uuid_ = payload.uuid
    path = payload.path
    try:
        user, _ = await Users.get_or_create(id=1)
        presets = user.get_setting("presets", [])
        preset = next((p for p in presets if p["uuid"] == uuid_), None)
        if not preset:
            raise HTTPException(404, "Preset not found")

        encoded = encode_presets_to_base64(preset)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(encoded)
        return {"status": "success", "message": f"Preset exported to {path}"}
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.post("/presets/import", tags=["presets"])
async def import_preset(payload: PresetPath):
    path = payload.path

    try:
        if not os.path.exists(path):
            raise HTTPException(404, "File not found")

        with open(path, "r", encoding="utf-8") as f:
            encoded = f.read()

        data = decode_presets_from_base64(encoded)

        # Helper to validate preset structure
        def validate_preset(preset):
            required_keys = {"uuid", "name", "description", "config"}
            if not isinstance(preset, dict):
                raise HTTPException(400, "Invalid preset format")
            if not required_keys.issubset(preset.keys()):
                raise HTTPException(400, "Preset missing required fields")

        user, _ = await Users.get_or_create(id=1)
        presets = user.get_setting("presets", [])

        if isinstance(data, dict):
            # Single preset import
            validate_preset(data)
            existing = next((p for p in presets if p["uuid"] == data["uuid"]), None)
            if existing:
                existing.update(data)
            else:
                presets.append(data)
            msg = f"{data["name"]} Preset imported"
        elif isinstance(data, list):
            # Multiple presets import
            for preset in data:
                validate_preset(preset)
                existing = next(
                    (p for p in presets if p["uuid"] == preset["uuid"]), None
                )
                if existing:
                    existing.update(preset)
                else:
                    presets.append(preset)
            msg = f"{len(data)} Presets imported"
        else:
            raise HTTPException(
                400, "File data must be a preset object or list of presets"
            )

        await user.set_setting("presets", presets)
        return {"status": "success", "message": msg}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


@api.post("/presets/export/all", tags=["presets"])
async def export_all_presets(payload: PresetPath):
    path = payload.path

    try:
        user, _ = await Users.get_or_create(id=1)
        presets = user.get_setting("presets", [])
        encoded = encode_presets_to_base64(presets)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(encoded)
        return {"status": "success", "message": f"All presets exported to {path}"}
    except Exception as e:
        logger.error(e)
        return {"status": "failed", "error": str(e)}


app.include_router(api)

register_tortoise(
    app,
    config=TORTOISE_ORM,
    generate_schemas=True,
    add_exception_handlers=True,
)


if __name__ == "__main__":
    from main import app

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8153,
        workers=1,
        log_config=None,
    )
