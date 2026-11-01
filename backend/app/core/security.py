import os
import time
import hmac
import hashlib
import json
import base64
import logging
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from app.core.config import settings

logger = logging.getLogger("airshare.security")

# Initialize Firebase Admin SDK
_firebase_initialized = False

def init_firebase():
    global _firebase_initialized
    if not _firebase_initialized:
        try:
            if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
                cert_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
                cred = credentials.Certificate(cert_dict)
                firebase_admin.initialize_app(cred, {"projectId": settings.GCP_PROJECT_ID or None})
            else:
                cred_path = settings.resolved_credentials_path
                if cred_path and os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred, {"projectId": settings.GCP_PROJECT_ID or None})
                else:
                    # Default application credentials (on Cloud Run)
                    firebase_admin.initialize_app(options={"projectId": settings.GCP_PROJECT_ID or None})
            _firebase_initialized = True
            logger.info("Firebase Admin SDK initialized successfully.")
        except Exception as e:
            logger.warning(f"Firebase Admin SDK initialization deferred or failed: {e}")

init_firebase()

def verify_firebase_id_token(token: str) -> Dict[str, Any]:
    """
    Verifies the Firebase ID token issued by Google Sign-In on the frontend.
    Returns decoded token dictionary (uid, email, name, picture).
    """
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        logger.error(f"Failed to verify Firebase ID token: {e}")
        raise ValueError("Invalid or expired authentication token.")

def generate_signed_preview_token(file_id: str, uid: str, ttl_seconds: Optional[int] = None) -> str:
    """
    Generates a short-lived HMAC-signed token for web previews (Google/Office Viewers, Video iframes)
    where Bearer headers cannot be injected.
    """
    ttl = ttl_seconds or settings.SIGNED_URL_TTL_SECONDS
    expires_at = int(time.time()) + ttl
    payload = {
        "file_id": file_id,
        "uid": uid,
        "exp": expires_at
    }
    serialized = json.dumps(payload, separators=(',', ':'), sort_keys=True)
    payload_b64 = base64.urlsafe_b64encode(serialized.encode()).decode().rstrip("=")
    
    signature = hmac.new(
        settings.SECRET_KEY.encode(),
        payload_b64.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return f"{payload_b64}.{signature}"

def verify_signed_preview_token(token: str) -> Dict[str, Any]:
    """
    Validates the preview token and checks expiration.
    """
    try:
        parts = token.split(".")
        if len(parts) != 2:
            raise ValueError("Malformed token")
        payload_b64, signature = parts
        
        # Verify signature
        expected_sig = hmac.new(
            settings.SECRET_KEY.encode(),
            payload_b64.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(signature, expected_sig):
            raise ValueError("Signature mismatch")
            
        # Add padding back if necessary
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
        
        if time.time() > payload.get("exp", 0):
            raise ValueError("Preview token has expired")
            
        return payload
    except Exception as e:
        logger.error(f"Invalid preview token: {e}")
        raise ValueError("Invalid or expired preview token.")
