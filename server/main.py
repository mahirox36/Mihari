import asyncio
from contextlib import asynccontextmanager
import logging
import sys
from typing import Optional
from fastapi import FastAPI, BackgroundTasks, HTTPException, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from rich.console import Console

# Import your library
from libs.AsyncYT import (
    AsyncYTDownloader,
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
    VideoFormat
)

downloader: AsyncYTDownloader = AsyncYTDownloader(auto_setup=False)
console = Console(force_terminal=True)
HEARTBEAT_INTERVAL = 15
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    global downloader
    await downloader.setup_binaries()
    yield

# Initialize FastAPI app
app = FastAPI(
    title="AsyncYT Downloader API",
    description="A high-performance async YouTube downloader API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global downloader instance

# Progress storage (in production, use Redis or similar)
download_progress = {}


# Progress callback for real-time updates
def create_progress_callback(task_id: str):
    def progress_callback(progress: DownloadProgress):
        download_progress[task_id] = progress.model_dump()
    return progress_callback


# Health check endpoint
@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Check API and binary health status"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    return await downloader.health_check()


# Get video info endpoint
@app.get("/info", response_model=VideoInfo, tags=["Info"])
async def get_video_info(url: str):
    """Get detailed information about a video"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    try:
        info = await downloader.get_video_info(url)
        return info
    except Exception as e:
        console.print_exception(show_locals=True)
        raise HTTPException(status_code=400, detail=f"Failed to get video info: {str(e)}")


# Search endpoint
@app.post("/search", response_model=SearchResponse, tags=["Search"])
async def search_videos(request: SearchRequest):
    """Search for videos on YouTube"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    return await downloader.search_with_response(request)


# Download endpoint
@app.post("/download", response_model=DownloadResponse, tags=["Download"])
async def download_video(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Download a single video"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    # For immediate response, you might want to run this in background
    # and return a task ID for progress tracking
    return await downloader.download_with_response(request)


# Async download with progress tracking
@app.post("/download/async", tags=["Download"])
async def download_video_async(request: DownloadRequest, background_tasks: BackgroundTasks):
    """Start an async download and return task ID for progress tracking"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    import uuid
    task_id = str(uuid.uuid4())
    
    # Create progress callback
    progress_callback = create_progress_callback(task_id)
    
    # Start download in background
    background_tasks.add_task(
        downloader.download_with_response,
        request,
        progress_callback
    )
    
    return {"task_id": task_id, "message": "Download started", "status": "processing"}


# Get progress endpoint
@app.get("/download/progress/{task_id}", tags=["Download"])
async def get_download_progress(task_id: str):
    """Get progress of an async download"""
    if task_id not in download_progress:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return download_progress[task_id]


# Playlist download endpoint
@app.post("/playlist/download", response_model=PlaylistResponse, tags=["Playlist"])
async def download_playlist(request: PlaylistRequest):
    """Download an entire playlist"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    return await downloader.download_playlist_with_response(request)


# Quick download endpoint with minimal config
@app.get("/quick-download", tags=["Quick"])
async def quick_download(url: str, audio_only: bool = False, quality: str = "best"):
    """Quick download with minimal configuration"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    try:
        # Map quality string to enum
        quality_map = {
            "best": Quality.BEST,
            "worst": Quality.WORST,
            "720p": Quality.HD_720P,
            "1080p": Quality.HD_1080P,
            "audio": Quality.AUDIO_ONLY
        }
        
        config = DownloadConfig(
            extract_audio=audio_only,
            quality=quality_map.get(quality, Quality.BEST),
            audio_format=AudioFormat.MP3 if audio_only else None
        ) # type: ignore
        
        request = DownloadRequest(url=url, config=config)
        return await downloader.download_with_response(request)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Get supported formats
@app.get("/formats", tags=["Info"])
async def get_supported_formats():
    """Get all supported audio and video formats"""
    return {
        "audio_formats": [format.value for format in AudioFormat],
        "video_formats": [format.value for format in VideoFormat],
        "quality_options": [quality.value for quality in Quality]
    }


# Configuration validation endpoint
@app.post("/validate-config", tags=["Config"])
async def validate_config(config: DownloadConfig):
    """Validate a download configuration"""
    try:
        # The Pydantic model will automatically validate
        return {"valid": True, "config": config.dict()}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid configuration: {str(e)}")


# Batch download endpoint
class BatchDownloadRequest(BaseModel):
    urls: list[str]
    config: Optional[DownloadConfig] = None

@app.post("/batch-download", tags=["Batch"])
async def batch_download(request: BatchDownloadRequest, background_tasks: BackgroundTasks):
    """Download multiple videos in batch"""
    if not downloader:
        raise HTTPException(status_code=503, detail="Downloader not initialized")
    
    if len(request.urls) > 50:  # Limit batch size
        raise HTTPException(status_code=400, detail="Maximum 50 URLs per batch")
    
    import uuid
    batch_id = str(uuid.uuid4())
    
    # Process each URL
    results = []
    for url in request.urls:
        try:
            download_request = DownloadRequest(url=url, config=request.config)
            result = await downloader.download_with_response(download_request)
            results.append({"url": url, "result": result.model_dump()})
        except Exception as e:
            results.append({"url": url, "error": str(e)})
    
    return {
        "batch_id": batch_id,
        "total_urls": len(request.urls),
        "results": results
    }


# WebSocket endpoint for real-time progress (optional)
from fastapi import WebSocket
import json

@app.websocket("/ws/download")
async def websocket_download(websocket: WebSocket):
    """WebSocket endpoint for real-time download progress"""
    await websocket.accept()
    
    async def send_heartbeat():
        while True:
            try:
                await websocket.send_json({"type": "ping"})
            except Exception:
                # Connection probably closed
                break
            await asyncio.sleep(HEARTBEAT_INTERVAL)
    
    heartbeat_task = asyncio.create_task(send_heartbeat())
    
    try:
        while True:
            # Receive download request
            data = await websocket.receive_json()
            if data.get("type", "") == "pong":
                continue
            
            # Create download request
            request = DownloadRequest(**data)
            
            # Progress callback that sends updates via WebSocket
            async def ws_progress_callback(progress: DownloadProgress):
                await websocket.send_json({
                    "type": "progress",
                    "data": progress.model_dump()
                })
            
            try:
                # Start download
                result = await downloader.download_with_response(request, ws_progress_callback)
                
                # Send final result
                await websocket.send_json({
                    "type": "complete",
                    "data": result.model_dump()
                })
                
                break
                
            except Exception as e:
                await websocket.send_json({
                    "type": "error",
                    "data": {"error": str(e)}
                })
                
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
        except Exception: pass


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8153,
        workers=1  # Important: Use 1 worker for async operations
    )