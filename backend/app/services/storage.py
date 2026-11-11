from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}


def _writable_upload_root(configured: str) -> Path:
    candidates = [Path(configured)]
    # Always keep /tmp fallback for serverless read-only roots
    candidates.append(Path("/tmp/careconnect-uploads"))
    for path in candidates:
        try:
            resolved = path.resolve() if path.is_absolute() else path.absolute()
            resolved.mkdir(parents=True, exist_ok=True)
            probe = resolved / ".write_test"
            probe.write_text("ok", encoding="utf-8")
            probe.unlink(missing_ok=True)
            return resolved
        except OSError:
            continue
    # Last resort: relative /tmp style path string
    fallback = Path("/tmp/careconnect-uploads")
    fallback.mkdir(parents=True, exist_ok=True)
    return fallback


class LocalStorageService:
    """Local/tmp disk storage. On Vercel this uses /tmp (ephemeral)."""

    def __init__(self) -> None:
        settings = get_settings()
        self.root = _writable_upload_root(settings.upload_dir)
        self.max_bytes = settings.max_upload_mb * 1024 * 1024

    async def save_upload(self, file: UploadFile, folder: str) -> tuple[str, str, str]:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

        data = await file.read()
        if len(data) > self.max_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

        target_dir = self.root / folder
        try:
            target_dir.mkdir(parents=True, exist_ok=True)
        except OSError:
            # Re-resolve root if filesystem changed
            self.root = _writable_upload_root(str(self.root))
            target_dir = self.root / folder
            target_dir.mkdir(parents=True, exist_ok=True)

        ext = Path(file.filename or "file.bin").suffix.lower() or ".bin"
        stored_name = f"{uuid4()}{ext}"
        path = target_dir / stored_name
        async with aiofiles.open(path, "wb") as out:
            await out.write(data)
        relative = str(path.relative_to(self.root)).replace("\\", "/")
        return stored_name, relative, file.content_type or "application/octet-stream"


# Lazily constructed so import does not crash if first mkdir path is wrong.
storage_service = LocalStorageService()
