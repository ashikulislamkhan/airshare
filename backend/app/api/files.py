import re
import math
import mimetypes
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse, Response, JSONResponse
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import generate_signed_preview_token
from app.services.firestore_db import firestore_db
from app.services.chunk_engine import ChunkEngine

logger = logging.getLogger("airshare.api.files")
router = APIRouter(prefix="/files", tags=["files"])

class InitFileUploadRequest(BaseModel):
    name: str
    totalSizeBytes: int
    folderId: Optional[str] = None
    mimeType: Optional[str] = None
    md5Checksum: Optional[str] = None

class FileMetadataUpdate(BaseModel):
    name: Optional[str] = None
    folderId: Optional[str] = None
    isStarred: Optional[bool] = None

def detect_file_type(mime: str, ext: str) -> str:
    if mime.startswith("image/"):
        return "image"
    if mime.startswith("video/") or mime.startswith("audio/"):
        return "video"
    if "pdf" in mime or ext == "pdf":
        return "pdf"
    if ext in ("doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv"):
        return "office"
    if mime.startswith("text/") or ext in ("txt", "md", "json", "js", "ts", "py", "html", "css"):
        return "text"
    return "other"

@router.post("/init")
async def initialize_file_upload(
    payload: InitFileUploadRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Step 1: Initializes the file record and calculates required chunks.
    Frontend calls this before streaming chunk bytes.
    """
    ext = payload.name.split(".")[-1].lower() if "." in payload.name else ""
    mime = payload.mimeType or mimetypes.guess_type(payload.name)[0] or "application/octet-stream"
    file_type = detect_file_type(mime, ext)
    
    max_chunk = settings.MAX_CHUNK_SIZE_BYTES
    total_chunks = max(1, math.ceil(payload.totalSizeBytes / max_chunk))

    file_doc = await firestore_db.create_file_record(
        name=payload.name,
        extension=ext,
        mime_type=mime,
        file_type=file_type,
        total_size_bytes=payload.totalSizeBytes,
        folder_id=payload.folderId,
        owner_uid=current_user["uid"],
        total_chunks=total_chunks,
        md5_checksum=payload.md5Checksum
    )

    await firestore_db.log_activity(
        action="upload_initiated",
        actor_uid=current_user["uid"],
        target_type="file",
        target_id=file_doc["id"],
        details={"name": payload.name, "size": payload.totalSizeBytes, "chunks": total_chunks}
    )

    return {
        "file": file_doc,
        "maxChunkSizeBytes": max_chunk,
        "totalChunks": total_chunks
    }

@router.post("/{file_id}/upload-chunk")
async def upload_chunk(
    file_id: str,
    request: Request,
    chunk_index: int = Header(..., alias="X-Chunk-Index"),
    chunk_size: int = Header(..., alias="X-Chunk-Size"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Step 2: Streams a chunk directly from the browser into Telegram MTProto.
    Bypasses Vercel serverless proxy completely.
    """
    file_record = await firestore_db.get_file(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File record not found.")

    if file_record["ownerUid"] != current_user["uid"]:
        raise HTTPException(status_code=403, detail="Permission denied.")

    version_id = file_record["activeVersionId"]
    start_byte = chunk_index * settings.MAX_CHUNK_SIZE_BYTES
    end_byte = start_byte + chunk_size - 1

    # Select target storage channel from configured pool
    channels = settings.channel_list
    if not channels:
        raise HTTPException(
            status_code=500,
            detail="No Telegram storage channels configured in TELEGRAM_STORAGE_CHANNELS."
        )
    # Channel sharding: round-robin or hash-based
    channel_id = channels[chunk_index % len(channels)]

    chunk_filename = f"{file_record['name']}.part{chunk_index:04d}"

    # Zero-RAM Stream: read directly from request body stream to Telegram MTProto
    message_id, telegram_file_id = await ChunkEngine.upload_stream_to_telegram(
        stream=request.stream(),
        chunk_size_bytes=chunk_size,
        filename=chunk_filename,
        channel_id=channel_id
    )

    # Record chunk in Firestore
    chunk_data = await firestore_db.add_chunk_record(
        file_id=file_id,
        version_id=version_id,
        chunk_index=chunk_index,
        start_byte=start_byte,
        end_byte=end_byte,
        size_bytes=chunk_size,
        channel_id=channel_id,
        message_id=message_id,
        telegram_file_id=telegram_file_id
    )

    return {"status": "success", "chunk": chunk_data}

@router.get("/{file_id}/stream")
async def stream_or_download_file(
    file_id: str,
    range: Optional[str] = Header(None, alias="Range"),
    download: bool = Query(False),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Step 3: Streams file with HTTP 206 Byte-Range support (Video/Audio seeking)
    or downloads the full file with on-the-fly chunk concatenation.
    """
    file_record = await firestore_db.get_file(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found.")

    total_size = file_record["totalSizeBytes"]
    chunks = await firestore_db.get_file_chunks(file_record["activeVersionId"])
    if not chunks:
        raise HTTPException(status_code=404, detail="File chunks not found.")

    content_type = file_record.get("mimeType", "application/octet-stream")
    filename = file_record.get("name", "file")

    disposition = "attachment" if download else "inline"
    base_headers = {
        "Accept-Ranges": "bytes",
        "Content-Disposition": f'{disposition}; filename="{filename}"'
    }

    # Case 1: HTTP Range Request (HTTP 206 Partial Content)
    if range:
        match = re.search(r"bytes=(\d+)-(\d*)", range)
        if match:
            start_byte = int(match.group(1))
            end_byte = int(match.group(2)) if match.group(2) else total_size - 1
            end_byte = min(end_byte, total_size - 1)
            content_length = (end_byte - start_byte) + 1

            headers = {
                **base_headers,
                "Content-Range": f"bytes {start_byte}-{end_byte}/{total_size}",
                "Content-Length": str(content_length),
                "Content-Type": content_type
            }

            return StreamingResponse(
                ChunkEngine.stream_byte_range_across_chunks(chunks, start_byte, end_byte),
                status_code=status.HTTP_206_PARTIAL_CONTENT,
                headers=headers
            )

    # Case 2: Full file download/stream
    headers = {
        **base_headers,
        "Content-Length": str(total_size),
        "Content-Type": content_type
    }
    return StreamingResponse(
        ChunkEngine.stream_full_file(chunks),
        status_code=status.HTTP_200_OK,
        headers=headers
    )

@router.get("/{file_id}/preview-token")
async def get_preview_token(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Generates a 15-minute signed token for embedding in Office Viewers or PDF iframes.
    """
    file_record = await firestore_db.get_file(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found.")
    
    token = generate_signed_preview_token(file_id=file_id, uid=current_user["uid"])
    return {"token": token, "ttl": settings.SIGNED_URL_TTL_SECONDS}

@router.get("")
async def list_files(
    folder_id: Optional[str] = Query(None),
    starred: Optional[bool] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    files = await firestore_db.list_files(
        owner_uid=current_user["uid"],
        folder_id=folder_id,
        is_trash=False,
        is_starred=starred
    )
    return {"files": files}

@router.patch("/{file_id}")
async def update_file(
    file_id: str,
    payload: FileMetadataUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    file_record = await firestore_db.get_file(file_id)
    if not file_record or file_record["ownerUid"] != current_user["uid"]:
        raise HTTPException(status_code=404, detail="File not found.")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await firestore_db.db.collection("files").document(file_id).update(updates)
    return {"status": "success", "updated": updates}

@router.delete("/{file_id}")
async def trash_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    file_record = await firestore_db.get_file(file_id)
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found.")
    
    await firestore_db.trash_item("file", file_id, current_user["uid"])
    await firestore_db.log_activity(
        action="delete",
        actor_uid=current_user["uid"],
        target_type="file",
        target_id=file_id,
        details={"name": file_record["name"]}
    )
    return {"status": "success", "message": "File moved to trash."}
