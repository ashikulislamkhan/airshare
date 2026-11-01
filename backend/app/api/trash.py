import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from app.api.deps import get_current_user
from app.services.firestore_db import firestore_db
from app.services.telegram_client import telegram_manager

logger = logging.getLogger("airshare.api.trash")
router = APIRouter(prefix="/trash", tags=["trash"])

@router.get("")
async def get_trash(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Role-Scoped Trash:
    - Owner sees all items trashed inside their drive.
    - Collaborator sees only items they personally moved to trash.
    """
    trash_items = await firestore_db.list_trash(current_user["uid"])
    return trash_items

@router.post("/restore/{target_type}/{target_id}")
async def restore_trash_item(
    target_type: str,
    target_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    if target_type not in ("file", "folder"):
        raise HTTPException(status_code=400, detail="Invalid target type.")

    await firestore_db.restore_item(target_type, target_id)
    await firestore_db.log_activity(
        action="restore",
        actor_uid=current_user["uid"],
        target_type=target_type,
        target_id=target_id,
        details={}
    )
    return {"status": "success", "message": f"{target_type.capitalize()} restored."}

@router.delete("/permanent/{target_type}/{target_id}")
async def permanent_delete_item(
    target_type: str,
    target_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Permanently deletes item from Cloud Firestore AND purges binary chunks from Telegram Storage.
    """
    if target_type == "file":
        file_doc = await firestore_db.get_file(target_id)
        if not file_doc:
            raise HTTPException(status_code=404, detail="File not found.")

        # Permissions check: Owner or the user who trashed it
        if file_doc["ownerUid"] != current_user["uid"] and file_doc.get("deletedByUid") != current_user["uid"]:
            raise HTTPException(status_code=403, detail="Permission denied.")

        # 1. Fetch chunks to delete from Telegram
        chunks = await firestore_db.get_file_chunks(file_doc["activeVersionId"])
        
        # Group message IDs by channel
        channel_to_messages: Dict[int, list] = {}
        for ch in chunks:
            c_id = ch["telegramChannelId"]
            m_id = ch["telegramMessageId"]
            channel_to_messages.setdefault(c_id, []).append(m_id)

        # 2. Delete messages from Telegram channels via MTProto
        for ch_id, msg_ids in channel_to_messages.items():
            try:
                await telegram_manager.delete_storage_messages(ch_id, msg_ids)
            except Exception as e:
                logger.error(f"Failed to delete Telegram messages {msg_ids} in {ch_id}: {e}")

        # 3. Clean up Firestore documents
        await firestore_db.db.collection("files").document(target_id).delete()
        # Decrement user's storage quota
        await firestore_db.update_user_storage(file_doc["ownerUid"], -file_doc["totalSizeBytes"])

    elif target_type == "folder":
        folder_doc = await firestore_db.get_folder(target_id)
        if not folder_doc:
            raise HTTPException(status_code=404, detail="Folder not found.")
        await firestore_db.db.collection("folders").document(target_id).delete()

    await firestore_db.log_activity(
        action="permanent_delete",
        actor_uid=current_user["uid"],
        target_type=target_type,
        target_id=target_id,
        details={}
    )
    return {"status": "success", "message": "Item permanently deleted."}
