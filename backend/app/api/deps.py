from typing import Optional, Dict, Any
from fastapi import Header, Query, HTTPException, status
from app.core.security import verify_firebase_id_token, verify_signed_preview_token

async def get_current_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    preview_token: Optional[str] = Query(None, alias="token")
) -> Dict[str, Any]:
    """
    Validates Firebase Bearer token from Header OR signed preview token from Query string.
    """
    # 1. Bearer Header (Standard API operations)
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            id_token = parts[1]
            try:
                user_info = verify_firebase_id_token(id_token)
                return {
                    "uid": user_info["uid"],
                    "email": user_info.get("email", ""),
                    "name": user_info.get("name", "User"),
                    "picture": user_info.get("picture", ""),
                    "auth_type": "bearer"
                }
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=str(e),
                    headers={"WWW-Authenticate": "Bearer"},
                )

    # 2. Preview Token (For embedded viewers, video src tags, PDF iframes)
    if preview_token:
        # Check if preview_token is a Firebase ID Token (JWT has 2 dots)
        if preview_token.count(".") == 2:
            try:
                user_info = verify_firebase_id_token(preview_token)
                return {
                    "uid": user_info["uid"],
                    "email": user_info.get("email", ""),
                    "name": user_info.get("name", "User"),
                    "picture": user_info.get("picture", ""),
                    "auth_type": "bearer"
                }
            except Exception:
                pass

        # Otherwise verify as HMAC signed preview token
        try:
            payload = verify_signed_preview_token(preview_token)
            return {
                "uid": payload["uid"],
                "file_id": payload["file_id"],
                "auth_type": "preview_token"
            }
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=str(e)
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide Authorization: Bearer <token> or valid preview token.",
        headers={"WWW-Authenticate": "Bearer"},
    )
