import asyncio
import logging
import random
from typing import Optional, List, Dict, Any, Union
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import FloodWaitError
from app.core.config import settings

logger = logging.getLogger("airshare.telegram")

class TelegramClientManager:
    """
    Manages persistent MTProto connection pool, auto-reconnects on Cloud Run cold starts,
    and handles Telegram FloodWait rate-limiting automatically.
    """
    _instance: Optional["TelegramClientManager"] = None

    def __init__(self):
        self.client: Optional[TelegramClient] = None
        self._lock = asyncio.Lock()
        self._is_connecting = False

    @classmethod
    def get_instance(cls) -> "TelegramClientManager":
        if cls._instance is None:
            cls._instance = TelegramClientManager()
        return cls._instance

    async def get_client(self) -> TelegramClient:
        """
        Retrieves or initializes the active Telethon MTProto client with resilient reconnection.
        """
        async with self._lock:
            if self.client and self.client.is_connected():
                return self.client

            logger.info("Connecting to Telegram MTProto...")
            
            # Use StringSession if provided (User Account with 2.0 GB file limit)
            # Otherwise fallback to MemorySession with Bot Token (50 MB limit)
            session = StringSession(settings.TELEGRAM_STRING_SESSION) if settings.TELEGRAM_STRING_SESSION else StringSession("")
            
            self.client = TelegramClient(
                session,
                settings.TELEGRAM_API_ID,
                settings.TELEGRAM_API_HASH,
                connection_retries=5,
                retry_delay=2,
                auto_reconnect=True
            )

            await self.client.connect()

            if not await self.client.is_user_authorized():
                if settings.TELEGRAM_BOT_TOKEN:
                    logger.info("Authorizing Telegram client using Bot Token...")
                    await self.client.start(bot_token=settings.TELEGRAM_BOT_TOKEN)
                else:
                    logger.warning("Telegram client connected but not authorized! Provide TELEGRAM_STRING_SESSION or TELEGRAM_BOT_TOKEN.")
            else:
                me = await self.client.get_me()
                logger.info(f"Telegram MTProto authorized successfully as: {getattr(me, 'first_name', 'Unknown')} (@{getattr(me, 'username', 'N/A')})")

            return self.client

    async def disconnect(self):
        """Disconnects the client gracefully during service shutdown."""
        if self.client and self.client.is_connected():
            logger.info("Disconnecting Telegram client...")
            await self.client.disconnect()
            self.client = None

    async def execute_with_retry(self, coro_func, *args, max_retries: int = 5, **kwargs):
        """
        Executes a Telethon operation with automatic FloodWait recovery and exponential backoff.
        """
        for attempt in range(max_retries):
            try:
                client = await self.get_client()
                return await coro_func(client, *args, **kwargs)
            except FloodWaitError as e:
                wait_seconds = e.seconds + random.uniform(1.0, 3.0)
                logger.warning(f"Telegram FloodWait hit: must wait {wait_seconds:.2f}s (Attempt {attempt+1}/{max_retries})")
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(wait_seconds)
            except (ConnectionError, asyncio.TimeoutError) as e:
                logger.warning(f"Telegram connection blip: {e}. Reconnecting (Attempt {attempt+1}/{max_retries})...")
                async with self._lock:
                    if self.client:
                        try:
                            await self.client.disconnect()
                        except Exception:
                            pass
                        self.client = None
                await asyncio.sleep(2 ** attempt)
                if attempt == max_retries - 1:
                    raise

    async def delete_storage_messages(self, channel_id: int, message_ids: List[int]) -> bool:
        """
        Deletes stored chunk messages from Telegram channel with safety batching.
        """
        async def _delete_op(client: TelegramClient, ch: int, m_ids: List[int]):
            # Delete in batches of 100 to stay within limits
            for i in range(0, len(m_ids), 100):
                batch = m_ids[i:i+100]
                await client.delete_messages(ch, batch)
                await asyncio.sleep(0.3)
            return True

        return await self.execute_with_retry(_delete_op, channel_id, message_ids)

telegram_manager = TelegramClientManager.get_instance()
