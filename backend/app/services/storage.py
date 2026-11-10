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


class LocalStorageService:
    """Phase 1 local disk storage. Swap for S3-compatible later."""

    def __init__(self) -> None:
        settings = get_settings()
        self.root = Path(settings.upload_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.max_bytes = settings.max_upload_mb * 1024 * 1024

    async def save_upload(self, file: UploadFile, folder: str) -> tuple[str, str, str]:
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

        data = await file.read()
        if len(data) > self.max_bytes:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File too large")

        target_dir = self.root / folder
        target_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(file.filename or "file.bin").suffix.lower() or ".bin"
        stored_name = f"{uuid4()}{ext}"
        path = target_dir / stored_name
        async with aiofiles.open(path, "wb") as out:
            await out.write(data)
        relative = str(path.relative_to(self.root)).replace("\\", "/")
        return stored_name, relative, file.content_type or "application/octet-stream"


storage_service = LocalStorageService()
