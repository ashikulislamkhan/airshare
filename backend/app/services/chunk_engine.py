import os
import math
import random
import logging
from typing import AsyncGenerator, List, Dict, Any, Tuple
from fastapi import Request
from telethon import TelegramClient
from telethon.tl.types import (
    InputFileBig,
    DocumentAttributeFilename,
    TypeInputFile
)
from telethon.tl.functions.upload import SaveBigFilePartRequest
from app.core.config import settings
from app.services.telegram_client import telegram_manager

logger = logging.getLogger("airshare.chunk_engine")

class ChunkEngine:
    """
    Zero-RAM Streaming, Uploading, and HTTP 206 Byte-Range Concatenation Engine.
    Operates strictly within Cloud Run's free tier memory bounds (512MB-1GB).
    """

    @staticmethod
    async def upload_stream_to_telegram(
        stream: AsyncGenerator[bytes, None],
        chunk_size_bytes: int,
        filename: str,
        channel_id: int
    ) -> Tuple[int, int]:
        """
        Streams an incoming HTTP chunk to a temporary file and uses Telethon's
        optimized upload engine with automatic part sizing and channel entity resolution.
        """
        import tempfile
        import aiofiles

        temp_fd, temp_path = tempfile.mkstemp(prefix="airshare_chunk_")
        os.close(temp_fd)

        try:
            logger.info(f"Writing incoming chunk stream to temp file: {filename} ({chunk_size_bytes} bytes)")
            async with aiofiles.open(temp_path, "wb") as f:
                async for chunk in stream:
                    await f.write(chunk)

            async def _upload_op(cl: TelegramClient):
                target_entity = await cl.get_entity(channel_id)
                uploaded = await cl.upload_file(temp_path, file_name=filename)
                msg = await cl.send_file(
                    entity=target_entity,
                    file=uploaded,
                    caption=f"#AirShareChunk | {filename} | {chunk_size_bytes} bytes",
                    force_document=True,
                    attributes=[DocumentAttributeFilename(filename)]
                )
                file_id = getattr(uploaded, "id", 0)
                return msg.id, file_id

            message_id, file_id = await telegram_manager.execute_with_retry(_upload_op)
            logger.info(f"Chunk uploaded successfully to Telegram! Msg ID: {message_id} in Channel: {channel_id}")
            return message_id, file_id
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    @staticmethod
    async def stream_byte_range_across_chunks(
        chunks: List[Dict[str, Any]],
        start_byte: int,
        end_byte: int
    ) -> AsyncGenerator[bytes, None]:
        """
        HTTP 206 Partial Content Generator.
        Maps the requested [start_byte, end_byte] across one or more stored Telegram chunks
        and streams exact byte slices directly to the client without downloading full files.
        """
        client = await telegram_manager.get_client()
        current_request_offset = start_byte
        remaining_bytes_to_serve = (end_byte - start_byte) + 1
        entity_cache: Dict[int, Any] = {}

        for chunk in chunks:
            chunk_start = chunk["startByte"]
            chunk_end = chunk["endByte"]
            chunk_size = chunk["sizeBytes"]
            channel_id = chunk["telegramChannelId"]
            msg_id = chunk["telegramMessageId"]

            # Check if this chunk intersects the requested range
            if current_request_offset > chunk_end:
                continue
            if remaining_bytes_to_serve <= 0:
                break

            # Calculate offset inside this specific chunk
            chunk_internal_offset = max(0, current_request_offset - chunk_start)
            bytes_available_in_chunk = chunk_size - chunk_internal_offset
            bytes_to_read_from_chunk = min(remaining_bytes_to_serve, bytes_available_in_chunk)

            logger.debug(
                f"Streaming slice from chunk {chunk.get('chunkIndex')}: "
                f"offset={chunk_internal_offset}, length={bytes_to_read_from_chunk}"
            )

            # Retrieve Telegram message document with resolved entity
            if channel_id not in entity_cache:
                entity_cache[channel_id] = await client.get_entity(channel_id)
            target_entity = entity_cache[channel_id]

            msg = await client.get_messages(target_entity, ids=msg_id)
            if not msg or not msg.document:
                raise RuntimeError(f"Telegram chunk message {msg_id} not found in channel {channel_id}")

            # Stream slice using Telethon's iter_download (64KB chunks to client)
            bytes_streamed_from_chunk = 0
            async for data in client.iter_download(
                msg.document,
                offset=chunk_internal_offset,
                limit=bytes_to_read_from_chunk,
                chunk_size=65536
            ):
                yield data
                bytes_streamed_from_chunk += len(data)

            current_request_offset += bytes_streamed_from_chunk
            remaining_bytes_to_serve -= bytes_streamed_from_chunk

    @staticmethod
    async def stream_full_file(chunks: List[Dict[str, Any]]) -> AsyncGenerator[bytes, None]:
        """
        Sequentially concatenates all chunks on-the-fly for a complete file download.
        Zero disk storage on Cloud Run; purely pipelined MTProto byte stream.
        """
        client = await telegram_manager.get_client()
        entity_cache: Dict[int, Any] = {}

        for chunk in chunks:
            channel_id = chunk["telegramChannelId"]
            msg_id = chunk["telegramMessageId"]
            
            if channel_id not in entity_cache:
                entity_cache[channel_id] = await client.get_entity(channel_id)
            target_entity = entity_cache[channel_id]

            msg = await client.get_messages(target_entity, ids=msg_id)
            if not msg or not msg.document:
                raise RuntimeError(f"Telegram chunk message {msg_id} not found")

            async for data in client.iter_download(msg.document, chunk_size=131072):
                yield data
