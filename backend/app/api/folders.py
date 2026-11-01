import os
import tempfile
import zipfile
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.core.security import generate_signed_preview_token
from app.services.firestore_db import firestore_db
from app.services.chunk_engine import ChunkEngine

router = APIRouter(prefix="/folders", tags=["folders"])

class CreateFolderRequest(BaseModel):
    name: str
    parentFolderId: Optional[str] = None

class UpdateFolderRequest(BaseModel):
    name: Optional[str] = None
    parentFolderId: Optional[str] = None
    isStarred: Optional[bool] = None

@router.post("")
async def create_folder(
    payload: CreateFolderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    folder = await firestore_db.create_folder(
        name=payload.name,
        parent_folder_id=payload.parentFolderId,
        owner_uid=current_user["uid"]
    )
    await firestore_db.log_activity(
        action="create_folder",
        actor_uid=current_user["uid"],
        target_type="folder",
        target_id=folder["id"],
        details={"name": payload.name, "path": folder["path"]}
    )
    return {"folder": folder}

@router.get("")
async def list_folders(
    parent_folder_id: Optional[str] = Query(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    folders = await firestore_db.list_folders(
        owner_uid=current_user["uid"],
        parent_folder_id=parent_folder_id,
        is_trash=False
    )
    return {"folders": folders}

@router.patch("/{folder_id}")
async def update_folder(
    folder_id: str,
    payload: UpdateFolderRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    folder = await firestore_db.get_folder(folder_id)
    if not folder or folder["ownerUid"] != current_user["uid"]:
        raise HTTPException(status_code=404, detail="Folder not found.")

    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await firestore_db.db.collection("folders").document(folder_id).update(updates)
    return {"status": "success", "updated": updates}

@router.delete("/{folder_id}")
async def trash_folder(
    folder_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    folder = await firestore_db.get_folder(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")
    
    await firestore_db.trash_item("folder", folder_id, current_user["uid"])
    await firestore_db.log_activity(
        action="delete_folder",
        actor_uid=current_user["uid"],
        target_type="folder",
        target_id=folder_id,
        details={"name": folder["name"]}
    )
    return {"status": "success", "message": "Folder moved to trash."}

@router.get("/{folder_id}/preview-token")
async def get_folder_preview_token(
    folder_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    folder = await firestore_db.get_folder(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")
    token = generate_signed_preview_token(file_id=folder_id, uid=current_user["uid"])
    return {"token": token}

@router.get("/{folder_id}/zip")
async def download_folder_as_zip(
    folder_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Transforms an entire virtual folder into a .zip archive on-the-fly and downloads it.
    """
    folder = await firestore_db.get_folder(folder_id)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found.")

    folder_name = folder.get("name", "folder").replace(" ", "_")
    files = await firestore_db.list_files(
        owner_uid=current_user["uid"],
        folder_id=folder_id,
        is_trash=False
    )

    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip_path = temp_zip.name
    temp_zip.close()

    try:
        with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for f in files:
                chunks = await firestore_db.get_file_chunks(f["activeVersionId"])
                if chunks:
                    file_bytes = bytearray()
                    async for chunk_data in ChunkEngine.stream_full_file(chunks):
                        file_bytes.extend(chunk_data)
                    zf.writestr(f["name"], bytes(file_bytes))

        async def _iter_zip():
            try:
                with open(temp_zip_path, "rb") as f:
                    while chunk := f.read(131072):
                        yield chunk
            finally:
                if os.path.exists(temp_zip_path):
                    os.remove(temp_zip_path)

        headers = {
            "Content-Disposition": f'attachment; filename="{folder_name}.zip"',
            "Content-Type": "application/zip",
        }
        return StreamingResponse(_iter_zip(), headers=headers)
    except Exception as e:
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)
        raise HTTPException(status_code=500, detail=f"Failed to generate folder zip: {e}")
