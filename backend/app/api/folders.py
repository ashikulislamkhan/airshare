from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.services.firestore_db import firestore_db

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
