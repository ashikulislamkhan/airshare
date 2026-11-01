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
        Pipes an incoming HTTP byte stream directly to Telegram MTProto using 512 KB parts.
        Zero RAM buffer: only 512 KB is held in memory at any instant.
        Returns (telegram_message_id, telegram_file_id).
        """
        client = await telegram_manager.get_client()

        # MTProto 512 KB part calculation
        PART_SIZE = settings.STREAM_BUFFER_SIZE_BYTES  # 524,288 bytes
        total_parts = math.ceil(chunk_size_bytes / PART_SIZE)
        if total_parts > 4000:
            raise ValueError(f"Chunk size {chunk_size_bytes} exceeds Telegram MTProto 4000-part limit.")

        file_id = random.randint(1, 2**63 - 1)
        part_index = 0
        buffer = bytearray()

        logger.info(f"Starting MTProto streaming upload: {filename} ({chunk_size_bytes} bytes, {total_parts} parts)")

        async for chunk in stream:
            buffer.extend(chunk)
            while len(buffer) >= PART_SIZE:
                part_bytes = bytes(buffer[:PART_SIZE])
                del buffer[:PART_SIZE]

                # Save big file part directly to Telegram MTProto servers
                await telegram_manager.execute_with_retry(
                    lambda cl: cl(SaveBigFilePartRequest(
                        file_id=file_id,
                        file_part=part_index,
                        file_total_parts=total_parts,
                        bytes=part_bytes
                    ))
                )
                part_index += 1

        # Flush final remaining bytes
        if len(buffer) > 0:
            part_bytes = bytes(buffer)
            buffer.clear()
            await telegram_manager.execute_with_retry(
                lambda cl: cl(SaveBigFilePartRequest(
                    file_id=file_id,
                    file_part=part_index,
                    file_total_parts=total_parts,
                    bytes=part_bytes
                ))
            )
            part_index += 1

        input_file = InputFileBig(
            id=file_id,
            parts=total_parts,
            name=filename
        )

        # Post document to the target AirShare Storage Channel
        async def _send_doc(cl: TelegramClient):
            msg = await cl.send_file(
                entity=channel_id,
                file=input_file,
                caption=f"#AirShareChunk | {filename} | {chunk_size_bytes} bytes",
                force_document=True,
                attributes=[DocumentAttributeFilename(filename)]
            )
            return msg.id

        message_id = await telegram_manager.execute_with_retry(_send_doc)
        logger.info(f"Chunk uploaded successfully to Telegram! Msg ID: {message_id} in Channel: {channel_id}")
        return message_id, file_id

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

            # Retrieve Telegram message document
            msg = await client.get_messages(channel_id, ids=msg_id)
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
        for chunk in chunks:
            channel_id = chunk["telegramChannelId"]
            msg_id = chunk["telegramMessageId"]
            
            msg = await client.get_messages(channel_id, ids=msg_id)
            if not msg or not msg.document:
                raise RuntimeError(f"Telegram chunk message {msg_id} not found")

            async for data in client.iter_download(msg.document, chunk_size=131072):
                yield data
