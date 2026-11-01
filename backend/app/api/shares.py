import uuid
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.api.deps import get_current_user
from app.services.firestore_db import firestore_db

router = APIRouter(prefix="/shares", tags=["shares"])

class CreateShareRequest(BaseModel):
    targetType: str  # "file" or "folder"
    targetId: str
    isPublic: bool = False
    accessLevel: str = "viewer"  # "viewer", "commenter", "editor"
    allowDownload: bool = True
    sharedWithEmails: Optional[List[str]] = []

@router.post("")
async def create_or_update_share(
    payload: CreateShareRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    share_id = str(uuid.uuid4())
    public_token = str(uuid.uuid4()) if payload.isPublic else None
    now = int(time.time())

    share_data = {
        "id": share_id,
        "targetType": payload.targetType,
        "targetId": payload.targetId,
        "ownerUid": current_user["uid"],
        "isPublic": payload.isPublic,
        "publicToken": public_token,
        "accessLevel": payload.accessLevel,
        "allowDownload": payload.allowDownload,
        "sharedWithEmails": payload.sharedWithEmails or [],
        "createdAt": now,
        "updatedAt": now
    }
    
    await firestore_db.db.collection("shares").document(share_id).set(share_data)
    await firestore_db.log_activity(
        action="share",
        actor_uid=current_user["uid"],
        target_type=payload.targetType,
        target_id=payload.targetId,
        details={"isPublic": payload.isPublic, "accessLevel": payload.accessLevel}
    )
    return {"share": share_data}

@router.get("/shared-with-me")
async def get_shared_with_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    user_email = current_user.get("email")
    if not user_email:
        return {"sharedFiles": [], "sharedFolders": []}

    shares_query = await firestore_db.db.collection("shares") \
        .where("sharedWithEmails", "array_contains", user_email) \
        .get()

    shared_file_ids = []
    shared_folder_ids = []
    for doc in shares_query:
        data = doc.to_dict()
        if data["targetType"] == "file":
            shared_file_ids.append(data["targetId"])
        elif data["targetType"] == "folder":
            shared_folder_ids.append(data["targetId"])

    files = []
    for fid in shared_file_ids:
        f = await firestore_db.get_file(fid)
        if f and not f.get("isTrash"):
            files.append(f)

    folders = []
    for fld_id in shared_folder_ids:
        fld = await firestore_db.get_folder(fld_id)
        if fld and not fld.get("isTrash"):
            folders.append(fld)

    return {"files": files, "folders": folders}
