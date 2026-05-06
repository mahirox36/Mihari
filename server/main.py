import asyncio
import logging
import os
import sys
import uuid
from contextlib import asynccontextmanager
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional

import aiohttp
import uvicorn
from asyncyt import (
    AsyncYT,
    AudioFormat,
    DownloadConfig,
    DownloadGotCanceledError,
    DownloadProgress,
    DownloadRequest,
    DownloadResponse,
    HealthResponse,
    PlaylistRequest,
    PlaylistResponse,
    PlaylistVideoInfo,
    Quality,
    SearchRequest,
    SearchResponse,
    VideoFormat,
    VideoInfo,
)
from asyncyt.basemodels import PlaylistConfig, PlaylistDownloadProgress
from asyncyt.exceptions import YtdlpDownloadError
from fastapi import (
    APIRouter,
    BackgroundTasks,
    FastAPI,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme
from tortoise.contrib.fastapi import register_tortoise

from libs.basemodels import (
    GetSettings,
    Preset,
    PresetExport,
    PresetPath,
    SaveSettings,
)
from libs.Models import (
    TORTOISE_ORM,
    Downloads,
    DownloadType,
    Status,
    Update,
    Users,
    decode_presets_from_base64,
    encode_presets_to_base64,
    get_data_path,
    is_bundled,
    thumbnailsPath,
    utcnow,
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

root_logger.addHandler(rich_handler)
root_logger.addHandler(file_handler)

for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
    logger = logging.getLogger(name)
    logger.handlers.clear()
    logger.propagate = False
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


async def recover_stuck_downloads():
    """
    On startup, any download still in QUEUED or DOWNLOADING state was
    interrupted unexpectedly (crash / force-quit). Mark them as FAILED so
    they don't appear stuck as 'Active' forever in the history UI.
    """
    stuck = await Downloads.filter(status__in=[Status.QUEUED, Status.DOWNLOADING])
    if stuck:
        logger.warning(
            f"Recovering {len(stuck)} stuck download(s) left from a previous session."
        )
        for dl in stuck:
            dl.status = Status.FAILED
            dl.error = "Interrupted: application was closed or crashed."
            await dl.save(update_fields=["status", "error"])
        logger.info("Stuck downloads marked as failed.")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Updating Database")
    logger.info("Root Folder:")
    logger.info(get_data_path().absolute())
    logger.info(f"sqlite://{str(get_data_path().absolute() / 'Mihari.sqlite3')}")
    logger.info("http://0.0.0.0:8153/api/docs")
    result = await Update()
    if result is True:
        logger.info("Updating Finished")
    elif result is False:
        logger.info("No Need for Update")
    else:
        logger.warning("Something went wrong while Updating")

    await recover_stuck_downloads()

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


@api.get("/playlist/info", tags=["Playlist"])
async def get_playlist_info(url: str, max_videos: Optional[int] = None):
    """Get playlist metadata without downloading"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    try:
        info = await downloader.get_playlist(url, max_videos=max_videos)
        return info.model_dump()
    except Exception as e:
        console.print_exception(show_locals=True)
        raise HTTPException(
            status_code=400, detail=f"Failed to get playlist info: {str(e)}"
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
    download = await Downloads.create_download(request.url, request.config)
    try:
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
    download = await Downloads.create_download(
        request.url,
        request.playlist_config.item_config if request.playlist_config else None,
        type=DownloadType.PLAYLIST,
    )
    try:
        await download.start_download()
        response = await downloader.download_playlist(request=request)
        await download.determine_success(response)

        if response.success and response.playlist_info:
            download.metadata.update(
                {
                    "title": response.playlist_info.title or "",
                    "uploader": response.playlist_info.uploader or "",
                    "total_videos": response.total_videos,
                    "successful_downloads": response.successful_downloads,
                }
            )
            await download.save(update_fields=["metadata"])

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
    # Returns only top-level downloads (VIDEO + PLAYLIST), never PLAYLIST_CHILD
    return await Downloads.get_user_downloads(as_model=True)


@api.delete("/history/{id}", tags=["Other"])
async def delete_history(id: int):
    item = await Downloads.get_or_none(id=id)
    if not item:
        raise HTTPException(404, detail="History Item not found")
    # Downloads.delete() already cascades to PLAYLIST_CHILD rows
    await item.delete()


@api.get("/history/playlist/{id}/children", tags=["Other"])
async def get_playlist_children(id: int):
    """
    Get individual video download records that belong to a playlist download.
    Uses the playlist_id FK for an exact, fast query — no metadata scanning.
    """
    parent = await Downloads.get_or_none(id=id)
    if not parent:
        raise HTTPException(404, detail="Playlist not found")
    if parent.download_type != DownloadType.PLAYLIST:
        raise HTTPException(400, detail="Download is not a playlist")

    return await Downloads.get_playlist_children(parent_id=id, as_model=True)


@api.delete("/history/playlist/child/{id}", tags=["Other"])
async def delete_playlist_child(id: int):
    """Delete a single video from a playlist history"""
    child = await Downloads.get_or_none(
        id=id, download_type=DownloadType.PLAYLIST_CHILD
    )
    if not child:
        raise HTTPException(404, detail="Child video not found")

    parent_id = child.playlist_id
    await child.delete()

    # Rebuild child_thumbnails on the parent
    if parent_id:
        try:
            parent = await Downloads.get_or_none(
                id=parent_id, download_type=DownloadType.PLAYLIST
            )
            if parent:
                remaining = await Downloads.filter(
                    playlist_id=parent_id,
                    download_type=DownloadType.PLAYLIST_CHILD,
                ).all()
                child_thumbnails = [
                    c.thumbnail_path for c in remaining if c.thumbnail_path
                ][:3]
                if isinstance(parent.metadata, dict):
                    parent.metadata["child_thumbnails"] = child_thumbnails
                    await parent.save(update_fields=["metadata"])
        except Exception as e:
            logger.warning(f"Failed to update parent playlist metadata: {e}")

    return {"status": "success", "message": "Child video deleted"}


@api.post("/history/playlist/child/{id}/open", tags=["Other"])
async def open_playlist_child(id: int):
    """Get the file path for a playlist child video to open in folder"""
    child = await Downloads.get_or_none(
        id=id, download_type=DownloadType.PLAYLIST_CHILD
    )
    if not child:
        raise HTTPException(404, detail="Child video not found")

    if child.status != Status.FINISHED:
        raise HTTPException(400, detail="Video is not finished")

    if not isinstance(child.config, dict):
        raise HTTPException(400, detail="Invalid configuration")

    output_path = child.config.get("output_path")
    if not output_path:
        raise HTTPException(400, detail="Output path not configured")

    filename = child.filename
    if not filename:
        raise HTTPException(400, detail="Filename not available")

    file_path = Path(output_path) / filename  # type: ignore

    if not file_path.exists():
        raise HTTPException(404, detail=f"File not found: {str(file_path)}")

    if not file_path.is_file():
        raise HTTPException(400, detail="Path is not a file")

    return {"file_path": str(file_path)}


@api.websocket("/ws/download")
async def websocket_download(websocket: WebSocket):
    """WebSocket endpoint for real-time download + playlist progress"""
    await websocket.accept()

    IDLE_TIMEOUT = 300

    active_downloads = {}  # download_id → asyncio.Task (single videos)
    active_playlists = {}  # playlist_id → asyncio.Task
    last_activity = asyncio.get_event_loop().time()

    async def send_heartbeat():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                break
            await asyncio.sleep(HEARTBEAT_INTERVAL)

    async def handle_messages():
        nonlocal last_activity
        try:
            while True:
                data = await websocket.receive_json()
                last_activity = asyncio.get_event_loop().time()

                msg_type = data.get("type", "")

                if msg_type == "pong":
                    continue

                elif msg_type == "cancel":
                    download_id = data.get("id")
                    if download_id and download_id in active_downloads:
                        task = active_downloads.pop(download_id)
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass
                        await websocket.send_json(
                            {"type": "cancelled", "id": download_id}
                        )
                    else:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "id": download_id,
                                "data": {
                                    "error": "Download not found or already completed"
                                },
                            }
                        )

                elif msg_type == "cancel_playlist":
                    playlist_id = data.get("id")
                    if playlist_id and playlist_id in active_playlists:
                        task = active_playlists.pop(playlist_id)
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass
                        await websocket.send_json(
                            {"type": "playlist_cancelled", "playlist_id": playlist_id}
                        )
                    else:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "data": {
                                    "error": "Playlist not found or already completed"
                                },
                            }
                        )

                elif msg_type == "playlist":
                    playlist_id = data.get("playlist_id") or str(uuid.uuid4())
                    url = data.get("url")
                    raw_playlist_config = data.get("playlist_config")
                    if not url:
                        await websocket.send_json(
                            {
                                "type": "playlist_error",
                                "playlist_id": playlist_id,
                                "data": {"error": "Missing URL"},
                            }
                        )
                        continue

                    if playlist_id in active_playlists:
                        await websocket.send_json(
                            {
                                "type": "error",
                                "data": {
                                    "error": f"Playlist {playlist_id} already active"
                                },
                            }
                        )
                        continue

                    try:
                        playlist_config = (
                            PlaylistConfig(**raw_playlist_config)
                            if raw_playlist_config
                            else PlaylistConfig()
                        )
                    except Exception as e:
                        await websocket.send_json(
                            {
                                "type": "playlist_error",
                                "playlist_id": playlist_id,
                                "data": {"error": f"Invalid playlist_config: {e}"},
                            }
                        )
                        continue

                    task = asyncio.create_task(
                        process_playlist(url, playlist_config, playlist_id)
                    )
                    active_playlists[playlist_id] = task

                else:
                    # Single video download
                    request = DownloadRequest(**data)
                    download_id = str(uuid.uuid4())

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

                    task = asyncio.create_task(process_download(request, download_id))
                    active_downloads[download_id] = task

        except WebSocketDisconnect:
            logger.info("Client disconnected")
        except Exception as e:
            logger.warning(f"Message handling error: {e}")

    async def process_download(request: DownloadRequest, download_id: str):
        nonlocal last_activity
        if not request.config:
            request.config = DownloadConfig()
        download = await Downloads.create_download(request.url, request.config)
        try:
            last_activity = asyncio.get_event_loop().time()
            await websocket.send_json({"type": "info_id", "id": download_id})

            async def ws_progress_callback(progress: DownloadProgress):
                nonlocal last_activity
                try:
                    progress_data = progress.model_dump()
                    progress_data["id"] = download_id
                    await websocket.send_json(
                        {"type": "progress", "id": download_id, "data": progress_data}
                    )
                    last_activity = asyncio.get_event_loop().time()
                except Exception as e:
                    logger.warning(f"Failed to send progress for {download_id}: {e}")

            if request.config and request.config.video_format:
                request.config.video_format = VideoFormat(request.config.video_format)
            if request.config and request.config.audio_format:
                request.config.audio_format = AudioFormat(request.config.audio_format)

            if (
                request.config.encoding
                and request.config.encoding.video
                and request.config.encoding.video.codec is None
            ):
                request.config.encoding.video.preset = None

            await download.start_download()

            info_task = asyncio.create_task(downloader.get_video_info(request.url))
            inner_download_task = asyncio.create_task(
                downloader.download(request, ws_progress_callback, finalize=True)
            )

            try:
                data = await asyncio.wait_for(info_task, timeout=30.0)
                await websocket.send_json(
                    {"type": "info_data", "id": download_id, "data": data.model_dump()}
                )
                await download.setInfo(data.model_dump())
            except Exception as e:
                logger.warning(f"Failed to get video info for {download_id}: {e}")
                data = None

            try:
                file = await inner_download_task
            except YtdlpDownloadError as e:
                logger.exception(e)
                logger.error(f"More info: \n {e.cmd} \n {e.output} \n {e.error_code}")
                await download.set_failed(str(e))
                await websocket.send_json(
                    {"type": "error", "id": download_id, "data": {"error": str(e)}}
                )
                last_activity = asyncio.get_event_loop().time()
                return

            result = DownloadResponse(
                success=True,
                message="Download completed successfully",
                filename=file.name,
                video_info=data,
                id=download_id,
            )

            await download.determine_success(result)

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

        except DownloadGotCanceledError:
            await download.set_canceled()
            await websocket.send_json(
                {
                    "type": "cancelled",
                    "id": download_id,
                    "data": {"error": "Download cancelled"},
                }
            )
        except asyncio.CancelledError:
            await download.set_canceled()
            await websocket.send_json({"type": "cancelled", "id": download_id})
            raise
        except Exception as e:
            console.print_exception()
            await download.set_failed(str(e))
            await websocket.send_json(
                {"type": "error", "id": download_id, "data": {"error": str(e)}}
            )
            last_activity = asyncio.get_event_loop().time()
        finally:
            active_downloads.pop(download_id, None)

    async def process_playlist(
        url: str, playlist_config: PlaylistConfig, playlist_id: str
    ):
        """
        Handle a full playlist download with per-video WebSocket progress.

        Child DB records are created ONLY after a video fully completes so
        that the real output filename (with extension) is available from
        result.filepath.  The progress callback is used only for live
        WebSocket updates — it never writes DB rows.
        """
        nonlocal last_activity

        # Normalize enum values in item_config before anything else
        if playlist_config.item_config:
            if playlist_config.item_config.video_format:
                playlist_config.item_config.video_format = VideoFormat(
                    playlist_config.item_config.video_format
                )
            if playlist_config.item_config.audio_format:
                playlist_config.item_config.audio_format = AudioFormat(
                    playlist_config.item_config.audio_format
                )

        # Create the parent playlist record
        download = await Downloads.create_download(
            url,
            playlist_config.item_config,
            type=DownloadType.PLAYLIST,
        )
        await download.start_download()

        item_config_dict = (
            playlist_config.item_config.model_dump()
            if playlist_config.item_config
            else {}
        )

        # url → child DB row, populated after each video fully finishes
        finished_children: dict[str, Downloads] = {}
        # Claimed URLs — checked+written before any await to prevent duplicates
        _saving_urls: set[str] = set()

        async def _save_child(
            video_info: PlaylistVideoInfo,
            filepath: Optional[str],
        ) -> None:
            """
            Create and persist a child DB record for a completed video.

            :param video_info: Metadata from the playlist entry.
            :param filepath: The real output path returned by yt-dlp (includes ext).
                            Pass None only as a last-resort fallback.
            """
            child_url = video_info.url
            if not child_url:
                return

            # Synchronous check+claim — race-free in asyncio (no await between
            # the check and the set.add so the event loop cannot switch tasks here)
            if child_url in finished_children or child_url in _saving_urls:
                return
            _saving_urls.add(child_url)

            try:
                # Derive the bare filename from the real output path so the DB
                # row stores "video.mp3" / "video.webm" rather than "video"
                filename: Optional[str] = None
                if filepath:
                    filename = Path(filepath).name  # e.g. "My Video Title.mp3"

                thumbnail_path: str | None = None
                thumbnail_url = video_info.thumbnail
                title = video_info.title
                uploader = video_info.uploader
                duration = video_info.duration

                child = await Downloads.create_playlist_child(
                    url=child_url,
                    parent_id=download.id,
                    user_id=download.user_id,
                    config=item_config_dict,
                    priority=download.priority,
                    title=title,
                    uploader=uploader,
                    duration=duration,
                    filename=filename,  # real filename with extension
                )

                if thumbnail_url:
                    try:
                        thumb_path = thumbnailsPath / f"{child.id}.jpg"
                        async with aiohttp.ClientSession() as session:
                            async with session.get(
                                thumbnail_url,
                                timeout=aiohttp.ClientTimeout(total=10),
                                ssl=False,
                            ) as resp:
                                if resp.status == 200:
                                    content = await resp.read()
                                    if content and len(content) > 100:
                                        thumb_path.parent.mkdir(
                                            parents=True, exist_ok=True
                                        )
                                        thumb_path.write_bytes(content)
                                        thumbnail_path = str(thumb_path)
                    except Exception as thumb_err:
                        logger.debug(
                            f"Thumbnail download failed for child {child.id}: {thumb_err}"
                        )

                child.status = Status.FINISHED
                child.date_started = utcnow()
                child.date_finished = utcnow()
                if thumbnail_path:
                    child.thumbnail_path = thumbnail_path

                await child.save(
                    update_fields=[
                        "status",
                        "date_started",
                        "date_finished",
                        "thumbnail_path",
                    ]
                )

                finished_children[child_url] = child
                logger.info(
                    f"Child {child.id} saved — playlist {download.id} "
                    f"— {title or child_url} [{filename or 'no filename'}]"
                )

            except Exception as save_err:
                # Release claim so a retry is possible
                _saving_urls.discard(child_url)
                raise save_err

        async def playlist_progress_cb(pl_progress: PlaylistDownloadProgress):
            """Forward live progress to the WebSocket — no DB writes here."""
            nonlocal last_activity
            try:
                await websocket.send_json(
                    {
                        "type": "playlist_progress",
                        "playlist_id": playlist_id,
                        "data": pl_progress.model_dump(),
                    }
                )
                last_activity = asyncio.get_event_loop().time()
            except Exception as e:
                logger.warning(
                    f"Failed to send playlist progress over WebSocket: {e}",
                    exc_info=True,
                )

        try:
            response = await downloader.download_playlist(
                url=url,
                playlist_config=playlist_config,
                progress_callback=playlist_progress_cb,
            )

            # Save every successful video now that yt-dlp has finished writing
            # files and result.filepath contains the real path with extension.
            for result in response.results:
                if result.success and result.video_info:
                    try:
                        await _save_child(
                            video_info=result.video_info,
                            filepath=result.filepath,  # e.g. "/downloads/My Video.mp3"
                        )
                    except Exception as save_err:
                        logger.warning(
                            f"Child save failed for {result.video_info.url}: {save_err}",
                            exc_info=True,
                        )

            await download.determine_success(response)

            child_thumbnails = [
                c.thumbnail_path for c in finished_children.values() if c.thumbnail_path
            ][:3]

            meta_update: dict = {
                "successful_downloads": len(finished_children),
                "child_thumbnails": child_thumbnails,
            }
            if response.playlist_info:
                pl_info = response.playlist_info
                meta_update.update(
                    {
                        "title": pl_info.title or "",
                        "uploader": pl_info.uploader or "",
                        "total_videos": response.total_videos,
                        "successful_downloads": response.successful_downloads
                        or len(finished_children),
                    }
                )

            download.metadata.update(meta_update)
            await download.save(update_fields=["metadata"])

            logger.info(
                f"Playlist {download.id} complete — {len(finished_children)} video(s) saved"
            )

            await websocket.send_json(
                {
                    "type": "playlist_complete",
                    "playlist_id": playlist_id,
                    "data": response.model_dump(),
                }
            )

        except asyncio.CancelledError:
            await download.set_canceled()
            await websocket.send_json(
                {"type": "playlist_cancelled", "playlist_id": playlist_id}
            )
            raise
        except Exception as e:
            console.print_exception()
            await download.set_failed(str(e))
            logger.error(f"Playlist download error: {e}", exc_info=True)
            await websocket.send_json(
                {
                    "type": "playlist_error",
                    "playlist_id": playlist_id,
                    "data": {"error": str(e)},
                }
            )
        finally:
            active_playlists.pop(playlist_id, None)

    async def handle_idle_timeout():
        nonlocal last_activity
        while True:
            try:
                await asyncio.sleep(30)
                current_time = asyncio.get_event_loop().time()
                idle_time = current_time - last_activity
                if (
                    idle_time >= IDLE_TIMEOUT
                    and not active_downloads
                    and not active_playlists
                ):
                    logger.info(
                        f"Closing WebSocket due to idle timeout ({idle_time:.1f}s)"
                    )
                    await websocket.close(code=1000, reason="Idle timeout")
                    break
            except Exception as e:
                logger.warning(f"Idle timeout handler error: {e}")
                break

    async def cleanup_completed():
        while True:
            try:
                await asyncio.sleep(60)
                for d in [active_downloads, active_playlists]:
                    completed = [k for k, v in d.items() if v.done()]
                    for k in completed:
                        del d[k]
            except Exception as e:
                logger.warning(f"Cleanup task error: {e}")
                break

    heartbeat_task = asyncio.create_task(send_heartbeat())
    message_task = asyncio.create_task(handle_messages())
    timeout_task = asyncio.create_task(handle_idle_timeout())
    cleanup_task = asyncio.create_task(cleanup_completed())

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
        for task_dict in [active_downloads, active_playlists]:
            for t in task_dict.values():
                if not t.done():
                    t.cancel()
                    try:
                        await t
                    except asyncio.CancelledError:
                        pass

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

    heartbeat_task = asyncio.create_task(send_heartbeat())
    startup_task = asyncio.create_task(process_startup())

    try:
        done, pending = await asyncio.wait(
            [heartbeat_task, startup_task],
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

        def validate_preset(preset):
            required_keys = {"uuid", "name", "description", "config"}
            if not isinstance(preset, dict):
                raise HTTPException(400, "Invalid preset format")
            if not required_keys.issubset(preset.keys()):
                raise HTTPException(400, "Preset missing required fields")

        user, _ = await Users.get_or_create(id=1)
        presets = user.get_setting("presets", [])

        if isinstance(data, dict):
            validate_preset(data)
            existing = next((p for p in presets if p["uuid"] == data["uuid"]), None)
            if existing:
                existing.update(data)
            else:
                presets.append(data)
            msg = f"{data['name']} Preset imported"
        elif isinstance(data, list):
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
