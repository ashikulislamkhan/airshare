import os
import json
from typing import List, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App General
    PROJECT_NAME: str = "AirShare API"
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    
    # CORS (Whitelisted Vercel frontend domains & local dev)
    CORS_ORIGINS: str = "http://localhost:3000,https://*.vercel.app,https://airshare.vercel.app"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        if self.CORS_ORIGINS.startswith("[") and self.CORS_ORIGINS.endswith("]"):
            try:
                return json.loads(self.CORS_ORIGINS)
            except Exception:
                pass
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # Google Cloud / Firebase
    GCP_PROJECT_ID: str = ""
    FIREBASE_CREDENTIALS_PATH: str = ""  # If empty, uses GCP Default Application Credentials (Cloud Run)
    
    # Telegram MTProto Configuration
    TELEGRAM_API_ID: int = 0
    TELEGRAM_API_HASH: str = ""
    TELEGRAM_STRING_SESSION: str = ""  # Saved Telethon user session string
    TELEGRAM_BOT_TOKEN: str = ""        # Optional backup bot token
    
    # Storage Channels (Comma separated channel IDs or usernames, e.g. "-100123456789,-100987654321")
    TELEGRAM_STORAGE_CHANNELS: str = ""
    
    # Chunking & Streaming Limits
    # 1.90 GB (1,945 MB) safe buffer below Telegram's 2,000 MiB free MTProto ceiling
    MAX_CHUNK_SIZE_BYTES: int = 2039480320 
    STREAM_BUFFER_SIZE_BYTES: int = 524288  # 512 KB per MTProto part
    
    # Security & Previews
    SECRET_KEY: str = "airshare-super-secret-hmac-key-change-in-prod"
    SIGNED_URL_TTL_SECONDS: int = 900  # 15 minutes for temporary preview URLs

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    @property
    def resolved_credentials_path(self) -> str:
        if not self.FIREBASE_CREDENTIALS_PATH:
            return ""
        if os.path.isabs(self.FIREBASE_CREDENTIALS_PATH):
            return self.FIREBASE_CREDENTIALS_PATH
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        candidate = os.path.join(base_dir, self.FIREBASE_CREDENTIALS_PATH)
        if os.path.exists(candidate):
            return candidate
        return self.FIREBASE_CREDENTIALS_PATH

    @property
    def channel_list(self) -> List[int]:
        if not self.TELEGRAM_STORAGE_CHANNELS:
            return []
        channels = []
        for ch in self.TELEGRAM_STORAGE_CHANNELS.split(","):
            ch = ch.strip()
            if ch:
                try:
                    channels.append(int(ch))
                except ValueError:
                    pass
        return channels

settings = Settings()
