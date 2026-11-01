import logging
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.config import settings
from app.services.telegram_client import telegram_manager
from app.services.firestore_db import firestore_db
from app.api.deps import get_current_user

from app.api.files import router as files_router
from app.api.folders import router as folders_router
from app.api.trash import router as trash_router
from app.api.shares import router as shares_router
from app.api.scheduler import router as scheduler_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("airshare.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Warm up MTProto client and verify credentials
    logger.info("Initializing AirShare backend services...")
    try:
        if settings.TELEGRAM_API_ID and settings.TELEGRAM_API_HASH:
            await telegram_manager.get_client()
    except Exception as e:
        logger.warning(f"Telegram client startup warmup deferred: {e}")
    yield
    # Shutdown: Gracefully disconnect Telegram client
    logger.info("Shutting down AirShare backend...")
    await telegram_manager.disconnect()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AirShare — Zero-Dollar Cloud Run & MTProto Storage Engine",
    version="3.0.0",
    lifespan=lifespan
)

# CORS Configuration — Allows Vercel frontend to stream chunks directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production: configure settings.CORS_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length", "Content-Disposition"]
)

# Mount Routers
app.include_router(files_router, prefix="/api")
app.include_router(folders_router, prefix="/api")
app.include_router(trash_router, prefix="/api")
app.include_router(shares_router, prefix="/api")
app.include_router(scheduler_router, prefix="/api")

class SyncUserRequest(BaseModel):
    pass

@app.post("/api/users/sync")
async def sync_user_profile(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Syncs the authenticated Google user profile to Cloud Firestore on login.
    """
    user_record = await firestore_db.sync_user(
        uid=current_user["uid"],
        email=current_user.get("email", ""),
        display_name=current_user.get("name", "User"),
        photo_url=current_user.get("picture", "")
    )
    return {"user": user_record}

@app.get("/healthz")
async def health_check():
    return {
        "status": "healthy",
        "service": "AirShare Cloud Run Engine",
        "version": "3.0.0"
    }
