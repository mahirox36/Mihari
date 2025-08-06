from enum import StrEnum, auto
import os
from pathlib import Path
import sys
from typing import Dict, Optional, Union, Any
import aiofiles
import aiohttp
from tortoise import fields
from tortoise.models import Model
from datetime import datetime, timedelta, timezone
from tortoise.transactions import in_transaction
import __main__


from asyncyt import (
    DownloadConfig,
    DownloadProgress,
    DownloadResponse,
    PlaylistResponse,
)

CurrentDir = Path.cwd()
UPDATE_FLAG_PATH = CurrentDir / "update"


def is_bundled():
    return getattr(sys, "frozen", False)



def get_data_path():
    if is_bundled():
        if sys.platform == "win32":
            return Path(str(os.getenv("APPDATA"))) / "Mihari" / "BackendData"
        # Mac
        elif sys.platform == "darwin":
            return Path.home() / "Library" / "Application Support" / "Mihari" / "BackendData"
        # Linux
        else:
            return Path.home() / ".config" / "Mihari" / "BackendData"
    else:
        # Dev mode
        return CurrentDir


async def Update():
    from aerich import Command
    import libs.Models
    try:
        if UPDATE_FLAG_PATH.exists():
            command = Command(TORTOISE_ORM)
            await command.init()
            await command.migrate()
            await command.upgrade()
            UPDATE_FLAG_PATH.unlink()
            return True
        return False
    except Exception as e:
        import traceback; traceback.print_exc()
        return None


thumbnailsPath = get_data_path() / "thumbnails"
thumbnailsPath.mkdir(exist_ok=True, parents=True)


def utcnow():
    return datetime.now(timezone.utc)


class Status(StrEnum):
    QUEUED = auto()
    DOWNLOADING = auto()
    FINISHED = auto()
    CANCELED = auto()
    FAILED = auto()
    PAUSED = auto()


class Priority(StrEnum):
    LOW = auto()
    NORMAL = auto()
    HIGH = auto()


class Downloads(Model):
    id = fields.IntField(pk=True)
    url = fields.CharField(max_length=2048, index=True)
    filename = fields.CharField(max_length=512, null=True)

    date_created = fields.DatetimeField(auto_now_add=True)
    date_started = fields.DatetimeField(null=True)
    date_finished = fields.DatetimeField(null=True)

    status = fields.CharEnumField(Status, default=Status.QUEUED, index=True)
    priority = fields.CharEnumField(Priority, default=Priority.NORMAL, index=True)

    error = fields.TextField(null=True)
    retry_count = fields.IntField(default=0)
    max_retries = fields.IntField(default=3)

    downloaded_bytes = fields.BigIntField(null=True)
    total_bytes = fields.BigIntField(null=True)
    speed = fields.FloatField(null=True)
    eta = fields.BigIntField(null=True)
    percentage = fields.FloatField(null=True)

    config: Dict[str, Union[str, int, bool]] = fields.JSONField(default=dict)  # type: ignore
    metadata: Dict[str, Any] = fields.JSONField(default=dict)  # type: ignore
    thumbnail_path = fields.TextField(null=True)

    user_id = fields.IntField(index=True)

    class Meta:
        table = "downloads"
        indexes = [
            ("status", "priority"),
            ("user_id", "status"),
            ("date_created",),
        ]

    def __str__(self):
        return str(self.filename or f"Download {self.id}")

    async def start_download(self):
        """Mark download as started"""
        self.status = Status.DOWNLOADING
        self.date_started = utcnow()
        await self.save(update_fields=["status", "date_started"])

    async def set_finished(self, path: Union[str, Path]):
        """Mark download as finished with transaction safety"""
        path = Path(path)

        async with in_transaction():
            self.filename = path.name
            self.date_finished = utcnow()
            self.status = Status.FINISHED

            await self.save()

    async def set_paused(self):
        """Pause download"""
        if not self.status in [Status.QUEUED, Status.DOWNLOADING]:
            self.status = Status.PAUSED
            await self.save(update_fields=["status"])

    async def resume_download(self):
        """Resume paused download"""
        if self.status == Status.PAUSED:
            self.status = Status.DOWNLOADING
            await self.save(update_fields=["status"])

    async def set_canceled(self):
        """Cancel download"""
        self.status = Status.CANCELED
        self.date_finished = utcnow()
        await self.save(update_fields=["status", "date_finished"])

    async def set_failed(self, error: str):
        """Mark download as failed with retry logic"""
        async with in_transaction():
            self.status = Status.FAILED
            self.date_finished = utcnow()
            self.error = error[:2000]

            await self.save()

    async def determine_success(
        self, response: Union[DownloadResponse, PlaylistResponse]
    ):
        """Enhanced success determination"""
        if isinstance(response, DownloadResponse):
            if response.success and response.filename:
                file_path = Path(response.filename)
                await self.set_finished(file_path)
                if response.video_info:
                    thumbnail = response.video_info.thumbnail
                    metadata = response.video_info.model_dump()
                    metadata.pop("formats")
                    self.metadata.update(metadata)
                    filepath = thumbnailsPath / (str(self.id) + ".jpg")
                    async with aiohttp.ClientSession() as session:
                        async with session.get(thumbnail) as resp:
                            if resp.status != 200:
                                await self.save(update_fields=["metadata"])
                                return
                            data = await resp.read()

                    async with aiofiles.open(filepath, "wb") as f:
                        await f.write(data)
                    self.thumbnail_path = str(filepath.resolve())
                    await self.save(update_fields=["thumbnail_path", "metadata"])
            else:
                await self.set_failed(response.error or "Unknown error")

        elif isinstance(response, PlaylistResponse):
            if response.success:
                await self.set_finished(Path("playlist_completed"))
                self.metadata.update(
                    {
                        "total_videos": response.total_videos,
                        "successful_downloads": response.successful_downloads,
                    }
                )
                await self.save(update_fields=["metadata"])
            else:
                await self.set_failed(response.error or "Playlist download failed")

    @classmethod
    async def create_download(
        cls,
        url: str,
        config: Optional[DownloadConfig] = None,
        user_id: int = 0,
        priority: Priority = Priority.NORMAL,
    ):
        """Enhanced download creation"""
        return await cls.create(
            url=url,
            config=config.model_dump() if config else {},
            user_id=user_id,
            priority=priority,
            status=Status.QUEUED,
        )

    @classmethod
    async def get_user_downloads(
        cls, user_id: int = 0, status: Optional[Status] = None, as_model: bool = False
    ):
        """Get downloads for a specific user"""
        query = cls.filter(user_id=user_id)
        if status:
            query = query.filter(status=status)
        result = await query.order_by("-date_created")
        if as_model:
            return [download.to_dict() for download in result]
        return result

    @classmethod
    async def get_queue(cls, limit: int = 10):
        """Get downloads in queue ordered by priority"""
        return (
            await cls.filter(status=Status.QUEUED)
            .order_by("priority", "date_created")
            .limit(limit)
        )

    @classmethod
    async def get_active_downloads(cls):
        """Get currently downloading items"""
        return await cls.filter(status=Status.DOWNLOADING)

    @classmethod
    async def cleanup_old_downloads(cls, days: int = 30):
        """Clean up old completed/failed downloads"""
        cutoff_date = utcnow() - timedelta(days=days)
        return await cls.filter(
            status__in=[Status.FINISHED, Status.FAILED, Status.CANCELED],
            date_finished__lt=cutoff_date,
        ).delete()

    @property
    def is_active(self) -> bool:
        """Check if download is active"""
        return self.status in [Status.QUEUED, Status.DOWNLOADING, Status.PAUSED]

    def to_dict(self) -> Dict[str, Union[int, str, Dict[str, Any], None]]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "url": self.url,
            "filename": self.filename,
            "date_created": (
                self.date_created.isoformat() if self.date_created else None
            ),
            "date_started": (
                self.date_started.isoformat() if self.date_started else None
            ),
            "date_finished": (
                self.date_finished.isoformat() if self.date_finished else None
            ),
            "status": self.status,
            "priority": self.priority,
            "error": self.error,
            "config": self.config,
            "thumbnail_path": self.thumbnail_path if self.thumbnail_path else None,
            "metadata": self.metadata if self.metadata else None,
        }

    async def update_progress(self, progress: DownloadProgress):
        self.downloaded_bytes = progress.downloaded_bytes
        self.total_bytes = progress.total_bytes
        self.percentage = progress.percentage
        self.speed = progress.speed
        self.eta = progress.eta
        await self.save(
            update_fields=[
                "downloaded_bytes",
                "total_bytes",
                "percentage",
                "speed",
                "eta",
            ]
        )

    async def delete(self):
        await super().delete()
        filepath = thumbnailsPath / (str(self.id) + ".jpg")
        if filepath.exists():
            filepath.unlink()


class Users(Model):
    id = fields.IntField(pk=True)

    settings = fields.JSONField(
        default={
            "auto_paste": False,
            "auto_download": True,
            "show_notification": True,
            "close_to_tray": True,
            "on_download": "nothing",
            "download_path": str(Path.home() / "Videos" / "Mihari"),
        }
    )

    def get_setting(self, key: str, default: Optional[Any] = None):
        return self.settings.get(key, default)

    async def set_setting(self, key: str, value: Any):
        settings = self.settings.copy()
        settings[key] = value
        self.settings = settings
        await self.save(update_fields=["settings"])
        return self.settings


TORTOISE_ORM = {
    "connections": {
        "default": f"sqlite://{str(get_data_path().absolute() / "Mihari.sqlite3")}"
    },
    "apps": {
        "models": {
            "models": ["libs.Models", "aerich.models"],
            "default_connection": "default",
        }
    },
}
