import os
import time
import uuid
import logging
from typing import Optional, List, Dict, Any
from google.cloud import firestore
from app.core.config import settings

logger = logging.getLogger("airshare.firestore")

class FirestoreDB:
    _instance: Optional["FirestoreDB"] = None

    def __init__(self):
        # Initializes Firestore client with JSON string, file path, or default ADC
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            import json
            cert_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            self.db = firestore.AsyncClient.from_service_account_info(
                cert_dict,
                project=settings.GCP_PROJECT_ID or None
            )
        else:
            cred_path = settings.resolved_credentials_path
            if cred_path and os.path.exists(cred_path):
                self.db = firestore.AsyncClient.from_service_account_json(
                    cred_path,
                    project=settings.GCP_PROJECT_ID or None
                )
            else:
                self.db = firestore.AsyncClient(project=settings.GCP_PROJECT_ID or None)

    @classmethod
    def get_instance(cls) -> "FirestoreDB":
        if cls._instance is None:
            cls._instance = FirestoreDB()
        return cls._instance

    # ─────────────────────────────────────────────────────────────
    # USERS
    # ─────────────────────────────────────────────────────────────
    async def sync_user(self, uid: str, email: str, display_name: str, photo_url: str) -> Dict[str, Any]:
        user_ref = self.db.collection("users").document(uid)
        doc = await user_ref.get()
        now = int(time.time())
        if doc.exists:
            await user_ref.update({
                "displayName": display_name,
                "photoURL": photo_url,
                "lastLoginAt": now
            })
            data = doc.to_dict()
            data["lastLoginAt"] = now
            return data
        else:
            new_user = {
                "uid": uid,
                "email": email,
                "displayName": display_name,
                "photoURL": photo_url,
                "storageUsedBytes": 0,
                "createdAt": now,
                "lastLoginAt": now
            }
            await user_ref.set(new_user)
            return new_user

    async def update_user_storage(self, uid: str, delta_bytes: int):
        user_ref = self.db.collection("users").document(uid)
        await user_ref.set({
            "storageUsedBytes": firestore.Increment(delta_bytes)
        }, merge=True)

    # ─────────────────────────────────────────────────────────────
    # FOLDERS (Virtual Nested Tree)
    # ─────────────────────────────────────────────────────────────
    async def create_folder(self, name: str, parent_folder_id: Optional[str], owner_uid: str) -> Dict[str, Any]:
        folder_id = str(uuid.uuid4())
        now = int(time.time())
        
        # Calculate virtual path
        path = f"/{name}"
        if parent_folder_id:
            parent_doc = await self.db.collection("folders").document(parent_folder_id).get()
            if parent_doc.exists:
                parent_path = parent_doc.to_dict().get("path", "")
                path = f"{parent_path}/{name}"

        folder_data = {
            "id": folder_id,
            "name": name,
            "parentFolderId": parent_folder_id,
            "ownerUid": owner_uid,
            "path": path,
            "isStarred": False,
            "isTrash": False,
            "deletedAt": None,
            "deletedByUid": None,
            "createdAt": now,
            "updatedAt": now
        }
        await self.db.collection("folders").document(folder_id).set(folder_data)
        return folder_data

    async def list_folders(self, owner_uid: str, parent_folder_id: Optional[str], is_trash: bool = False) -> List[Dict[str, Any]]:
        query = self.db.collection("folders") \
            .where("ownerUid", "==", owner_uid) \
            .where("isTrash", "==", is_trash)
        
        if not is_trash:
            query = query.where("parentFolderId", "==", parent_folder_id)

        docs = await query.get()
        return [doc.to_dict() for doc in docs]

    async def get_folder(self, folder_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.collection("folders").document(folder_id).get()
        return doc.to_dict() if doc.exists else None

    # ─────────────────────────────────────────────────────────────
    # FILES & VERSIONS
    # ─────────────────────────────────────────────────────────────
    async def create_file_record(
        self,
        name: str,
        extension: str,
        mime_type: str,
        file_type: str,
        total_size_bytes: int,
        folder_id: Optional[str],
        owner_uid: str,
        total_chunks: int,
        md5_checksum: Optional[str] = None
    ) -> Dict[str, Any]:
        file_id = str(uuid.uuid4())
        version_id = str(uuid.uuid4())
        now = int(time.time())

        file_data = {
            "id": file_id,
            "name": name,
            "extension": extension.lower(),
            "mimeType": mime_type,
            "fileType": file_type,
            "totalSizeBytes": total_size_bytes,
            "md5Checksum": md5_checksum,
            "folderId": folder_id,
            "ownerUid": owner_uid,
            "activeVersionId": version_id,
            "totalChunks": total_chunks,
            "isStarred": False,
            "isTrash": False,
            "deletedAt": None,
            "deletedByUid": None,
            "createdAt": now,
            "updatedAt": now,
            "lastOpenedAt": now,
            "preview": {
                "hasThumbnail": False,
                "thumbnailMsgId": None,
                "thumbnailChannelId": None
            }
        }
        await self.db.collection("files").document(file_id).set(file_data)

        # Create Version 1
        version_data = {
            "id": version_id,
            "fileId": file_id,
            "versionNumber": 1,
            "sizeBytes": total_size_bytes,
            "totalChunks": total_chunks,
            "createdAt": now,
            "createdByUid": owner_uid,
            "isTrashedVersion": False,
            "chunkIds": []
        }
        await self.db.collection("versions").document(version_id).set(version_data)
        await self.update_user_storage(owner_uid, total_size_bytes)
        return file_data

    async def add_chunk_record(
        self,
        file_id: str,
        version_id: str,
        chunk_index: int,
        start_byte: int,
        end_byte: int,
        size_bytes: int,
        channel_id: int,
        message_id: int,
        telegram_file_id: int
    ) -> Dict[str, Any]:
        chunk_id = f"{version_id}_{chunk_index:04d}"
        chunk_data = {
            "id": chunk_id,
            "fileId": file_id,
            "versionId": version_id,
            "chunkIndex": chunk_index,
            "startByte": start_byte,
            "endByte": end_byte,
            "sizeBytes": size_bytes,
            "telegramChannelId": channel_id,
            "telegramMessageId": message_id,
            "telegramFileId": telegram_file_id,
            "uploadStatus": "completed"
        }
        await self.db.collection("chunks").document(chunk_id).set(chunk_data)
        
        # Link to version
        version_ref = self.db.collection("versions").document(version_id)
        await version_ref.update({
            "chunkIds": firestore.ArrayUnion([chunk_id])
        })
        return chunk_data

    async def get_file(self, file_id: str) -> Optional[Dict[str, Any]]:
        doc = await self.db.collection("files").document(file_id).get()
        return doc.to_dict() if doc.exists else None

    async def get_file_chunks(self, version_id: str) -> List[Dict[str, Any]]:
        chunks_docs = await self.db.collection("chunks") \
            .where("versionId", "==", version_id) \
            .get()
        chunks = [doc.to_dict() for doc in chunks_docs]
        chunks.sort(key=lambda c: c.get("chunkIndex", 0))
        return chunks

    async def list_files(
        self,
        owner_uid: str,
        folder_id: Optional[str] = None,
        is_trash: bool = False,
        is_starred: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        query = self.db.collection("files") \
            .where("ownerUid", "==", owner_uid) \
            .where("isTrash", "==", is_trash)
        
        if not is_trash and folder_id is not None:
            query = query.where("folderId", "==", folder_id)
        if is_starred is not None:
            query = query.where("isStarred", "==", is_starred)

        docs = await query.get()
        return [doc.to_dict() for doc in docs]

    # ─────────────────────────────────────────────────────────────
    # TRASH & RESTORE (Role-Scoped Scenarios)
    # ─────────────────────────────────────────────────────────────
    async def trash_item(self, target_type: str, target_id: str, deleted_by_uid: str):
        now = int(time.time())
        collection_name = "files" if target_type == "file" else "folders"
        ref = self.db.collection(collection_name).document(target_id)
        await ref.update({
            "isTrash": True,
            "deletedAt": now,
            "deletedByUid": deleted_by_uid
        })

    async def restore_item(self, target_type: str, target_id: str):
        collection_name = "files" if target_type == "file" else "folders"
        ref = self.db.collection(collection_name).document(target_id)
        await ref.update({
            "isTrash": False,
            "deletedAt": None,
            "deletedByUid": None
        })

    async def list_trash(self, current_uid: str) -> Dict[str, Any]:
        """
        Role-scoped trash:
        - Owner sees all trash items where ownerUid == current_uid.
        - Collaborator sees items where deletedByUid == current_uid.
        """
        # Files owned by user that are trashed
        owned_files = await self.db.collection("files") \
            .where("ownerUid", "==", current_uid) \
            .where("isTrash", "==", True) \
            .get()
            
        # Files deleted by user (collaborator scenario)
        deleted_by_files = await self.db.collection("files") \
            .where("deletedByUid", "==", current_uid) \
            .where("isTrash", "==", True) \
            .get()

        # Combine uniquely
        files_dict = {doc.id: doc.to_dict() for doc in owned_files}
        for doc in deleted_by_files:
            files_dict[doc.id] = doc.to_dict()

        # Same for folders
        owned_folders = await self.db.collection("folders") \
            .where("ownerUid", "==", current_uid) \
            .where("isTrash", "==", True) \
            .get()
        folders_dict = {doc.id: doc.to_dict() for doc in owned_folders}

        return {
            "files": list(files_dict.values()),
            "folders": list(folders_dict.values())
        }

    # ─────────────────────────────────────────────────────────────
    # ACTIVITY LOGS
    # ─────────────────────────────────────────────────────────────
    async def log_activity(self, action: str, actor_uid: str, target_type: str, target_id: str, details: Dict[str, Any]):
        log_id = str(uuid.uuid4())
        await self.db.collection("activity_logs").document(log_id).set({
            "id": log_id,
            "action": action,
            "actorUid": actor_uid,
            "targetType": target_type,
            "targetId": target_id,
            "timestamp": int(time.time()),
            "details": details
        })

firestore_db = FirestoreDB.get_instance()
