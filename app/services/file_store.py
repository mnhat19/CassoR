"""In-memory temporary file storage for uploaded HR data files.

Files are stored in RAM with an expiry time. No disk I/O — not persisted across restarts.
"""
from __future__ import annotations

import time
from typing import TypedDict

from app.config import settings


class FileEntry(TypedDict):
    filename: str
    content: bytes
    expires_at: float


_STORE: dict[str, FileEntry] = {}


def store_file(reference: str, filename: str, content: bytes) -> None:
    _STORE[reference] = {
        "filename": filename,
        "content": content,
        "expires_at": time.time() + settings.payment_file_expiry_seconds,
    }


def get_file(reference: str) -> FileEntry | None:
    entry = _STORE.get(reference)
    if not entry:
        return None
    if time.time() > entry["expires_at"]:
        del _STORE[reference]
        return None
    return entry


def delete_file(reference: str) -> None:
    _STORE.pop(reference, None)


def cleanup_expired() -> None:
    now = time.time()
    expired = [ref for ref, entry in list(_STORE.items()) if now > entry["expires_at"]]
    for ref in expired:
        del _STORE[ref]
