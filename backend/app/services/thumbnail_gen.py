import os
import io
import asyncio
import subprocess
import logging
from typing import Optional, Tuple
from PIL import Image

logger = logging.getLogger("airshare.thumbnail")

class ThumbnailGenerator:
    """
    Generates preview thumbnails for Images and Video posters.
    """

    @staticmethod
    def generate_image_thumbnail(image_bytes: bytes, max_size: Tuple[int, int] = (320, 320)) -> Optional[bytes]:
        try:
            with Image.open(io.BytesIO(image_bytes)) as img:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                # Convert RGBA to RGB for JPEG compatibility
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                output = io.BytesIO()
                img.save(output, format="JPEG", quality=80, optimize=True)
                return output.getvalue()
        except Exception as e:
            logger.warning(f"Failed to generate image thumbnail: {e}")
            return None

    @staticmethod
    async def extract_video_poster(video_chunk_sample: bytes) -> Optional[bytes]:
        """
        Extracts a keyframe poster from video bytes using ffmpeg.
        Runs ffmpeg in a non-blocking subprocess.
        """
        try:
            cmd = [
                "ffmpeg",
                "-ss", "00:00:01",
                "-i", "pipe:0",
                "-vframes", "1",
                "-f", "image2",
                "-vf", "scale=320:-1",
                "pipe:1"
            ]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await process.communicate(input=video_chunk_sample)
            if process.returncode == 0 and len(stdout) > 0:
                return stdout
            return None
        except Exception as e:
            logger.warning(f"ffmpeg poster extraction skipped or unavailable: {e}")
            return None
