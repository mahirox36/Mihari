"""
AsyncYT - A comprehensive async YouTube downloader library
Uses yt-dlp and ffmpeg with automatic binary management
"""

import asyncio
import json
import os
import platform
import shutil
import zipfile
from enum import Enum
from pathlib import Path
from typing import Any, Awaitable, Callable, Dict, List, Optional, Union
from rich import print
from rich.console import Console
import aiofiles
import aiohttp
from pydantic import BaseModel, Field, field_validator
import inspect

console = Console(force_terminal=True)


class AudioFormat(Enum):
    MP3 = "mp3"
    M4A = "m4a"
    WAV = "wav"
    FLAC = "flac"
    OGG = "ogg"


class VideoFormat(Enum):
    MP4 = "mp4"
    WEBM = "webm"
    MKV = "mkv"
    AVI = "avi"


class Quality(Enum):
    BEST = "best"
    WORST = "worst"
    AUDIO_ONLY = "bestaudio"
    VIDEO_ONLY = "bestvideo"
    HD_720P = "720p"
    HD_1080P = "1080p"
    HD_1440P = "1440p"
    UHD_4K = "2160p"


class VideoInfo(BaseModel):
    """Video information extracted from URL"""

    url: str
    title: str
    duration: int = Field(0, ge=0)
    uploader: str
    view_count: int = Field(0, ge=0)
    like_count: Optional[int] = Field(None, ge=0)
    description: str = ""
    thumbnail: str = ""
    upload_date: str = ""
    formats: List[Dict[str, Any]] = Field(default_factory=list)

    @field_validator("url")
    def validate_url(cls, v):
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @classmethod
    def from_dict(cls, data: dict) -> "VideoInfo":
        return cls(
            url=data.get("webpage_url", ""),
            title=data.get("title", ""),
            duration=data.get("duration", 0),
            uploader=data.get("uploader", ""),
            view_count=data.get("view_count", 0),
            like_count=data.get("like_count"),
            description=data.get("description", ""),
            thumbnail=data.get("thumbnail", ""),
            upload_date=data.get("upload_date", ""),
            formats=data.get("formats", []),
        )

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "title": "Rick Astley - Never Gonna Give You Up",
                "duration": 212,
                "uploader": "RickAstleyVEVO",
                "view_count": 1000000000,
                "like_count": 10000000,
                "description": "Official video...",
                "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                "upload_date": "20091025",
            }
        }


class DownloadConfig(BaseModel):
    """Configuration for downloads"""

    output_path: str = Field("./downloads", description="Output directory path")
    quality: Quality = Field(Quality.BEST, description="Video quality setting")
    audio_format: Optional[AudioFormat] = Field(
        None, description="Audio format for extraction"
    )
    video_format: Optional[VideoFormat] = Field(
        None, description="Video format for output"
    )
    extract_audio: bool = Field(False, description="Extract audio only")
    embed_subs: bool = Field(False, description="Embed subtitles in video")
    write_subs: bool = Field(False, description="Write subtitle files")
    subtitle_lang: str = Field("en", description="Subtitle language code")
    write_thumbnail: bool = Field(False, description="Download thumbnail")
    embed_thumbnail: bool = Field(False, description="Embed thumbnail")
    write_info_json: bool = Field(False, description="Write info JSON file")
    custom_filename: Optional[str] = Field(None, description="Custom filename template")
    cookies_file: Optional[str] = Field(None, description="Path to cookies file")
    proxy: Optional[str] = Field(None, description="Proxy URL")
    rate_limit: Optional[str] = Field(None, description="Rate limit (e.g., '1M')")
    retries: int = Field(3, ge=0, le=10, description="Number of retries")
    fragment_retries: int = Field(3, ge=0, le=10, description="Fragment retries")
    custom_options: Dict[str, Any] = Field(
        default_factory=dict, description="Custom yt-dlp options"
    )

    @field_validator("output_path")
    def validate_output_path(cls, v):
        # Create directory if it doesn't exist
        Path(v).mkdir(parents=True, exist_ok=True)
        return v

    @field_validator("rate_limit")
    def validate_rate_limit(cls, v):
        if v and not any(v.endswith(unit) for unit in ["K", "M", "G", "k", "m", "g"]):
            if not v.isdigit():
                raise ValueError("Rate limit must be a number or end with K/M/G")
        return v

    class Config:
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "output_path": "./downloads",
                "quality": "720p",
                "extract_audio": True,
                "audio_format": "mp3",
                "write_thumbnail": True,
                "embed_thumbnail": True,
                "subtitle_lang": "en",
                "retries": 3,
            }
        }


class DownloadProgress(BaseModel):
    """Progress information for downloads"""

    url: str
    title: str = ""
    status: str = "downloading"
    downloaded_bytes: int = 0
    total_bytes: int = 0
    speed: float = 0.0
    eta: int = 0
    percentage: float = Field(0.0, ge=0.0, le=100.0)

    @property
    def is_complete(self) -> bool:
        return self.status == "finished"

    class Config:
        json_encoders = {float: lambda v: round(v, 2)}


# API Response Models
class DownloadRequest(BaseModel):
    """Request model for download endpoints"""

    url: str = Field(..., description="Video URL to download")
    config: Optional[DownloadConfig] = Field(None, description="Download configuration")

    @field_validator("url")
    def validate_url(cls, v):
        if not v.strip():
            raise ValueError("URL cannot be empty")
        # Basic URL validation
        if not any(
            domain in v.lower() for domain in ["youtube.com", "youtu.be", "youtube.com"]
        ):
            raise ValueError("Only YouTube URLs are supported")
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "config": {
                    "output_path": "./downloads",
                    "quality": "720p",
                    "extract_audio": True,
                    "audio_format": "mp3",
                },
            }
        }


class SearchRequest(BaseModel):
    """Request model for search endpoints"""

    query: str = Field(..., min_length=1, max_length=200, description="Search query")
    max_results: int = Field(10, ge=1, le=50, description="Maximum number of results")

    class Config:
        json_schema_extra = {"example": {"query": "python tutorial", "max_results": 5}}


class PlaylistRequest(BaseModel):
    """Request model for playlist downloads"""

    url: str = Field(..., description="Playlist URL")
    config: Optional[DownloadConfig] = Field(None, description="Download configuration")
    max_videos: int = Field(
        100, ge=1, le=1000, description="Maximum videos to download"
    )

    @field_validator("url")
    def validate_playlist_url(cls, v):
        if not v.strip():
            raise ValueError("URL cannot be empty")
        if "playlist" not in v.lower():
            raise ValueError("URL must be a playlist URL")
        return v.strip()


class DownloadResponse(BaseModel):
    """Response model for download operations"""

    success: bool
    message: str
    filename: Optional[str] = None
    video_info: Optional[VideoInfo] = None
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Download completed successfully",
                "filename": "./downloads/Rick Astley - Never Gonna Give You Up.mp4",
                "video_info": {
                    "title": "Rick Astley - Never Gonna Give You Up",
                    "duration": 212,
                    "uploader": "RickAstleyVEVO",
                },
            }
        }


class SearchResponse(BaseModel):
    """Response model for search operations"""

    success: bool
    message: str
    results: List[VideoInfo] = Field(default_factory=list)
    total_results: int = 0
    error: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Search completed successfully",
                "total_results": 3,
                "results": [
                    {
                        "title": "Python Tutorial for Beginners",
                        "url": "https://www.youtube.com/watch?v=example1",
                        "uploader": "Programming Channel",
                        "duration": 1800,
                    }
                ],
            }
        }


class PlaylistResponse(BaseModel):
    """Response model for playlist operations"""

    success: bool
    message: str
    downloaded_files: List[str] = Field(default_factory=list)
    failed_downloads: List[str] = Field(default_factory=list)
    total_videos: int = 0
    successful_downloads: int = 0
    error: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response"""

    status: str = "healthy"
    yt_dlp_available: bool = False
    ffmpeg_available: bool = False
    version: str = "1.0.0"
    binaries_path: Optional[str] = None
    error: Optional[str] = None


async def call_callback(callback, *args, **kwargs):
    if inspect.iscoroutinefunction(callback):
        await callback(*args, **kwargs)
    else:
        callback(*args, **kwargs)

class AsyncYTDownloader:
    """Main downloader class with async support"""

    def __init__(self, auto_setup: bool = True):
        self.project_root = Path.cwd()
        self.bin_dir = self.project_root / "bin"
        self.ytdlp_path = None
        self.ffmpeg_path = None
        self.ffprobe_path = None

        if auto_setup:
            asyncio.create_task(self.setup_binaries())

    async def setup_binaries(self) -> None:
        """Download and setup yt-dlp and ffmpeg binaries"""
        self.bin_dir.mkdir(exist_ok=True)

        # Setup yt-dlp
        await self._setup_ytdlp()

        # Setup ffmpeg
        await self._setup_ffmpeg()

        print("✅ All binaries are ready!")

    async def _setup_ytdlp(self) -> None:
        """Download yt-dlp binary"""
        system = platform.system().lower()

        if system == "windows":
            filename = "yt-dlp.exe"
            url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
        else:
            filename = "yt-dlp"
            url = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp"

        self.ytdlp_path = self.bin_dir / filename

        if not self.ytdlp_path.exists():
            print(f"📥 Downloading yt-dlp...")
            await self._download_file(url, self.ytdlp_path)

            if system != "windows":
                os.chmod(self.ytdlp_path, 0o755)

    async def _setup_ffmpeg(self) -> None:
        """Download ffmpeg binary"""
        system = platform.system().lower()

        if system == "windows":
            self.ffmpeg_path = self.bin_dir / "ffmpeg.exe"
            self.ffprobe_path = self.bin_dir / "ffprobe.exe"

            if not self.ffmpeg_path.exists():
                print(f"📥 Downloading ffmpeg for Windows...")
                url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
                temp_file = self.bin_dir / "ffmpeg.zip"

                await self._download_file(url, temp_file)
                await self._extract_ffmpeg_windows(temp_file)
                temp_file.unlink()

        elif system == "darwin":  # macOS
            # For macOS, we'll check if ffmpeg is available via Homebrew
            if shutil.which("ffmpeg"):
                self.ffmpeg_path = "ffmpeg"
                self.ffprobe_path = "ffprobe"
            else:
                print("⚠️  ffmpeg not found. Please install via: brew install ffmpeg")

        else:  # Linux
            if shutil.which("ffmpeg"):
                self.ffmpeg_path = "ffmpeg"
                self.ffprobe_path = "ffprobe"
            else:
                print("⚠️  ffmpeg not found. Please install via your package manager")

    async def _extract_ffmpeg_windows(self, zip_path: Path) -> None:
        """Extract ffmpeg from Windows zip file"""
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            for file_info in zip_ref.infolist():
                if file_info.filename.endswith(("ffmpeg.exe", "ffprobe.exe")):
                    # Extract to bin directory
                    file_info.filename = os.path.basename(file_info.filename)
                    zip_ref.extract(file_info, self.bin_dir)

    async def _download_file(self, url: str, filepath: Path) -> None:
        """Download a file asynchronously"""
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    async with aiofiles.open(filepath, "wb") as f:
                        async for chunk in response.content.iter_chunked(8192):
                            await f.write(chunk)
                else:
                    raise Exception(f"Failed to download {url}: {response.status}")

    async def get_video_info(self, url: str) -> VideoInfo:
        """Get video information without downloading"""
        cmd = [str(self.ytdlp_path), "--dump-json", "--no-warnings", url]

        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise Exception(f"Failed to get video info: {stderr.decode()}")

        data = json.loads(stdout.decode())
        return VideoInfo.from_dict(data)

    async def search(self, query: str, max_results: int = 10) -> List[VideoInfo]:
        """Search for videos"""
        search_url = f"ytsearch{max_results}:{query}"

        cmd = [str(self.ytdlp_path), "--dump-json", "--no-warnings", search_url]

        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise Exception(f"Search failed: {stderr.decode()}")

        results = []
        for line in stdout.decode().strip().split("\n"):
            if line:
                data = json.loads(line)
                results.append(VideoInfo.from_dict(data))

        return results

    async def download(
        self,
        url: str,
        config: Optional[DownloadConfig] = None,
        progress_callback: Optional[Callable[[DownloadProgress], Union[None, Awaitable[None]]]] = None,
    ) -> str:
        """Download a video with the given configuration"""
        if not config:
            config = DownloadConfig()  # type: ignore

        # Ensure output directory exists
        output_dir = Path(config.output_path)
        output_dir.mkdir(parents=True, exist_ok=True)

        # Build yt-dlp command
        cmd = await self._build_download_command(url, config)

        # Create progress tracker
        progress = DownloadProgress(url=url, percentage=0)

        # Execute download
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=output_dir,
        )

        output_file: str

        # Monitor progress
        async for line in self._read_process_output(process):
            line = line.strip()

            if progress_callback:
                self._parse_progress(line, progress)
                await call_callback(progress_callback, progress)

            # Capture output filename
            if "[download] Destination:" in line:
                output_file: str = line.split("Destination: ")[1]
            elif "[download]" in line and "has already been downloaded" in line:
                output_file: str = line.split()[1]

        await process.wait()

        if process.returncode != 0:
            raise Exception(f"Download failed for {url}")

        if progress_callback:
            progress.status = "finished"
            progress.percentage = 100.0
            await call_callback(progress_callback, progress)
        return output_file

    async def health_check(self) -> HealthResponse:
        """Check if all binaries are available and working"""
        try:
            # Check yt-dlp
            ytdlp_available = False
            if self.ytdlp_path and self.ytdlp_path.exists():
                try:
                    process = await asyncio.create_subprocess_exec(
                        str(self.ytdlp_path),
                        "--version",
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    await process.communicate()
                    ytdlp_available = process.returncode == 0
                except Exception:
                    ytdlp_available = False

            # Check ffmpeg
            ffmpeg_available = False
            if self.ffmpeg_path:
                try:
                    ffmpeg_cmd = (
                        str(self.ffmpeg_path)
                        if self.ffmpeg_path != "ffmpeg"
                        else "ffmpeg"
                    )
                    process = await asyncio.create_subprocess_exec(
                        ffmpeg_cmd,
                        "-version",
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                    await process.communicate()
                    ffmpeg_available = process.returncode == 0
                except Exception:
                    ffmpeg_available = False

            status = "healthy" if (ytdlp_available and ffmpeg_available) else "degraded"

            return HealthResponse(
                status=status,
                yt_dlp_available=ytdlp_available,
                ffmpeg_available=ffmpeg_available,
                binaries_path=str(self.bin_dir),
            )

        except Exception as e:
            return HealthResponse(
                status="unhealthy",
                yt_dlp_available=False,
                ffmpeg_available=False,
                error=str(e),
            )

    async def download_with_response(
        self,
        request: DownloadRequest,
        progress_callback: Optional[Callable[[DownloadProgress], Union[None, Awaitable[None]]]] = None,
    ) -> DownloadResponse:
        """Download with API-friendly response format"""
        try:
            config = request.config or DownloadConfig()  # type: ignore

            # Get video info first
            try:
                video_info = await self.get_video_info(request.url)
            except Exception as e:
                return DownloadResponse(
                    success=False,
                    message="Failed to get video information",
                    error=str(e),
                )

            # Download the video
            filename = await self.download(request.url, config, progress_callback)

            return DownloadResponse(
                success=True,
                message="Download completed successfully",
                filename=filename,
                video_info=video_info,
            )

        except Exception as e:
            return DownloadResponse(
                success=False, message="Download failed", error=str(e)
            )

    async def search_with_response(self, request: SearchRequest) -> SearchResponse:
        """Search with API-friendly response format"""
        try:
            results = await self.search(request.query, request.max_results)

            return SearchResponse(
                success=True,
                message=f"Found {len(results)} results",
                results=results,
                total_results=len(results),
            )

        except Exception as e:
            return SearchResponse(success=False, message="Search failed", error=str(e))

    async def download_playlist_with_response(
        self,
        request: PlaylistRequest,
        progress_callback: Optional[Callable[[DownloadProgress], None]] = None,
    ) -> PlaylistResponse:
        """Download playlist with API-friendly response format"""
        try:
            config = request.config or DownloadConfig()  # type: ignore

            # Get playlist info
            playlist_info = await self.get_playlist_info(request.url)
            total_videos = min(len(playlist_info["entries"]), request.max_videos)

            downloaded_files = []
            failed_downloads = []

            for i, video_entry in enumerate(
                playlist_info["entries"][: request.max_videos]
            ):
                try:
                    if progress_callback:
                        overall_progress = DownloadProgress(
                            url=request.url,
                            title=f"Playlist item {i+1}/{total_videos}",
                            percentage=(i / total_videos) * 100,
                        )
                        progress_callback(overall_progress)

                    filename = await self.download(video_entry["webpage_url"], config)
                    downloaded_files.append(filename)

                except Exception as e:
                    failed_downloads.append(
                        f"{video_entry.get('title', 'Unknown')}: {str(e)}"
                    )

            return PlaylistResponse(
                success=True,
                message=f"Downloaded {len(downloaded_files)} out of {total_videos} videos",
                downloaded_files=downloaded_files,
                failed_downloads=failed_downloads,
                total_videos=total_videos,
                successful_downloads=len(downloaded_files),
            )

        except Exception as e:
            return PlaylistResponse(
                success=False,
                message="Playlist download failed",
                error=str(e),
                total_videos=0,
                successful_downloads=0,
            )

    async def download_playlist(
        self,
        url: str,
        config: Optional[DownloadConfig] = None,
        progress_callback: Optional[Callable[[DownloadProgress], None]] = None,
    ) -> List[str]:
        """Download an entire playlist"""
        if not config:
            config = DownloadConfig()  # type: ignore

        # Get playlist info first
        playlist_info = await self.get_playlist_info(url)
        downloaded_files = []

        for i, video_url in enumerate(playlist_info["entries"]):
            if progress_callback:
                overall_progress = DownloadProgress(
                    url=url,
                    title=f"Playlist item {i+1}/{len(playlist_info['entries'])}",
                    percentage=(i / len(playlist_info["entries"])) * 100,
                )
                progress_callback(overall_progress)

            try:
                filename = await self.download(
                    video_url["webpage_url"], config, progress_callback
                )
                downloaded_files.append(filename)
            except Exception as e:
                print(f"Failed to download {video_url.get('title', 'Unknown')}: {e}")

        return downloaded_files

    async def get_playlist_info(self, url: str) -> Dict[str, Any]:
        """Get playlist information"""
        cmd = [
            str(self.ytdlp_path),
            "--dump-json",
            "--flat-playlist",
            "--no-warnings",
            url,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise Exception(f"Failed to get playlist info: {stderr.decode()}")

        entries = []
        for line in stdout.decode().strip().split("\n"):
            if line:
                entries.append(json.loads(line))

        return {
            "entries": entries,
            "title": (
                entries[0].get("playlist_title", "Unknown Playlist")
                if entries
                else "Empty Playlist"
            ),
        }

    async def _build_download_command(
        self, url: str, config: DownloadConfig
    ) -> List[str]:
        """Build the yt-dlp command based on configuration"""
        cmd = [str(self.ytdlp_path)]

        # Basic options
        cmd.extend(["--no-warnings", "--progress"])

        # Quality selection
        if config.extract_audio:
            cmd.extend(
                [
                    "-x",
                    "--audio-format",
                    AudioFormat(config.audio_format).value if config.audio_format else "mp3",
                ]
            )
        else:
            quality = Quality(config.quality)
            if quality == Quality.BEST:
                cmd.extend(["-f", "best"])
            elif quality == Quality.WORST:
                cmd.extend(["-f", "worst"])
            elif quality == Quality.AUDIO_ONLY:
                cmd.extend(["-f", "bestaudio"])
            elif quality == Quality.VIDEO_ONLY:
                cmd.extend(["-f", "bestvideo"])
            else:
                height = quality.value.replace("p", "")
                cmd.extend(
                    [
                        "-f",
                        f"bestvideo[height<={height}]+bestaudio/best[height<={height}]",
                    ]
                )

        # Output format
        if config.video_format and not config.extract_audio:
            cmd.extend(["--recode-video", VideoFormat(config.video_format).value])

        # Filename template
        if config.custom_filename:
            cmd.extend(["-o", config.custom_filename])
        else:
            cmd.extend(["-o", "%(title)s.%(ext)s"])

        # Subtitles
        if config.write_subs:
            cmd.extend(["--write-subs", "--sub-lang", config.subtitle_lang])
        if config.embed_subs:
            cmd.append("--embed-subs")

        # Additional options
        if config.write_thumbnail:
            cmd.append("--write-thumbnail")
        if config.embed_thumbnail:
            cmd.append("--embed-thumbnail")
        if config.write_info_json:
            cmd.append("--write-info-json")
        if config.cookies_file:
            cmd.extend(["--cookies", config.cookies_file])
        if config.proxy:
            cmd.extend(["--proxy", config.proxy])
        if config.rate_limit:
            cmd.extend(["--limit-rate", config.rate_limit])

        # Retry options
        cmd.extend(["--retries", str(config.retries)])
        cmd.extend(["--fragment-retries", str(config.fragment_retries)])

        # FFmpeg path
        if self.ffmpeg_path:
            cmd.extend(["--ffmpeg-location", str(self.ffmpeg_path)])

        # Custom options
        for key, value in config.custom_options.items():
            if isinstance(value, bool):
                if value:
                    cmd.append(f"--{key}")
            else:
                cmd.extend([f"--{key}", str(value)])

        cmd.append(url)
        return cmd

    async def _read_process_output(self, process):
        """Read process output line by line"""
        while True:
            line = await process.stdout.readline()
            if not line:
                break
            yield line.decode("utf-8", errors="ignore")

    def _parse_progress(self, line: str, progress: DownloadProgress) -> None:
        """Parse progress information from yt-dlp output"""
        line = line.strip()

        if "Destination:" in line:
            # Extract title
            progress.title = Path(line.split("Destination: ")[1]).stem
            return

        if "[download]" in line and "%" in line:
            try:
                # Clean line from carriage returns
                line = line.replace("\r", "").replace("\n", "")
                parts = line.split()

                for i, part in enumerate(parts):
                    if "%" in part:
                        progress.percentage = float(part.replace("%", "").strip())
                    elif part == "of" and i + 1 < len(parts):
                        progress.total_bytes = self._parse_size(parts[i + 1])
                    elif part == "at" and i + 1 < len(parts):
                        progress.speed = self._parse_speed(parts[i + 1])
                    elif part == "ETA" and i + 1 < len(parts):
                        progress.eta = self._parse_time(parts[i + 1])
            except (ValueError, IndexError):
                pass

    def _parse_size(self, size_str: str) -> int:
        """Parse size string to bytes"""
        try:
            size_str = size_str.upper()
            if "K" in size_str:
                return int(float(size_str.replace("K", "")) * 1024)
            elif "M" in size_str:
                return int(float(size_str.replace("M", "")) * 1024 * 1024)
            elif "G" in size_str:
                return int(float(size_str.replace("G", "")) * 1024 * 1024 * 1024)
            else:
                return int(size_str)
        except ValueError:
            return 0

    def _parse_speed(self, speed_str: str) -> float:
        """Parse speed string to bytes per second"""
        try:
            speed_str = speed_str.upper().replace("/S", "")
            if "K" in speed_str:
                return float(speed_str.replace("K", "")) * 1024
            elif "M" in speed_str:
                return float(speed_str.replace("M", "")) * 1024 * 1024
            elif "G" in speed_str:
                return float(speed_str.replace("G", "")) * 1024 * 1024 * 1024
            else:
                return float(speed_str)
        except ValueError:
            return 0.0

    def _parse_time(self, time_str: str) -> int:
        """Parse time string to seconds"""
        try:
            parts = time_str.split(":")
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
            else:
                return int(time_str)
        except ValueError:
            return 0


# Example usage
async def main():
    """Example usage of the library"""

    # Initialize downloader
    downloader = AsyncYTDownloader(auto_setup=False)
    await downloader.setup_binaries()

    # Download a single video
    def progress_handler(progress: DownloadProgress):
        if progress.percentage > 0:
            speed_str = (
                f"{progress.speed / 1024 / 1024:.1f} MB/s" if progress.speed else "???"
            )
            title = progress.title or "Unknown"
            print(f"📥 {title}: {progress.percentage:.1f}% - {speed_str}")

    config = DownloadConfig(
        output_path="./downloads",
        quality=Quality.HD_1080P,
        embed_thumbnail=True,
        embed_subs=True,
        audio_format=AudioFormat.MP3,
        video_format=VideoFormat.MP4
    )  # type: ignore

    try:
        # Get video info
        info = await downloader.get_video_info(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        )
        print(f"📹 Title: {info.title}")
        print(f"⏱️  Duration: {info.duration} seconds")
        print(f"👤 Uploader: {info.uploader}")

        # Download the video
        filename = await downloader.download(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ", config, progress_handler
        )
        print(f"✅ Downloaded: {filename}")
    except Exception as e:
        console.print_exception(show_locals=True)


if __name__ == "__main__":
    asyncio.run(main())
