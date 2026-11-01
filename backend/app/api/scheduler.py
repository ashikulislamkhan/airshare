import time
import logging
from typing import Dict, Any
from fastapi import APIRouter, Header, HTTPException, status
from app.core.config import settings
from app.services.firestore_db import firestore_db
from app.services.telegram_client import telegram_manager

logger = logging.getLogger("airshare.scheduler")
router = APIRouter(prefix="/scheduler", tags=["scheduler"])

THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60

@router.post("/purge-trash")
async def purge_expired_trash(
    x_cloudscheduler: str = Header(None, alias="X-CloudScheduler")
):
    """
    Invoked daily by Google Cloud Scheduler.
    Permanently purges files/folders where (now - deletedAt) >= 30 days.
    Deletes underlying Telegram chunks via MTProto and removes Firestore docs.
    """
    now = int(time.time())
    cutoff = now - THIRTY_DAYS_SECONDS
    logger.info(f"Running automated 30-day trash purge (Cutoff: {cutoff})...")

    # Query expired trashed files
    expired_files = await firestore_db.db.collection("files") \
        .where("isTrash", "==", True) \
        .where("deletedAt", "<=", cutoff) \
        .get()

    purged_files_count = 0
    for doc in expired_files:
        file_data = doc.to_dict()
        file_id = doc.id
        
        # Purge chunks in Telegram
        chunks = await firestore_db.get_file_chunks(file_data.get("activeVersionId", ""))
        channel_to_messages: Dict[int, list] = {}
        for ch in chunks:
            c_id = ch["telegramChannelId"]
            m_id = ch["telegramMessageId"]
            channel_to_messages.setdefault(c_id, []).append(m_id)

        for ch_id, msg_ids in channel_to_messages.items():
            try:
                await telegram_manager.delete_storage_messages(ch_id, msg_ids)
            except Exception as e:
                logger.error(f"Error purging Telegram chunk messages: {e}")

        # Delete file doc & decrement user quota
        await firestore_db.db.collection("files").document(file_id).delete()
        await firestore_db.update_user_storage(file_data["ownerUid"], -file_data.get("totalSizeBytes", 0))
        purged_files_count += 1

    # Query expired trashed folders
    expired_folders = await firestore_db.db.collection("folders") \
        .where("isTrash", "==", True) \
        .where("deletedAt", "<=", cutoff) \
        .get()

    purged_folders_count = 0
    for doc in expired_folders:
        await firestore_db.db.collection("folders").document(doc.id).delete()
        purged_folders_count += 1

    logger.info(f"Purge complete: {purged_files_count} files, {purged_folders_count} folders removed.")
    return {
        "status": "success",
        "purgedFiles": purged_files_count,
        "purgedFolders": purged_folders_count
    }
