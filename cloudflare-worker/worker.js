/**
 * AirShare Cloudflare Worker Edge Gateway v2.1
 * Zero-Dollar Serverless Cloud Storage Backend
 * 
 * Capabilities:
 * - Chunk upload proxy to Telegram Bot API (sendDocument)
 * - HTTP Byte-Range support (206 Partial Content) for instant video/audio seeking
 * - Live multi-chunk concatenation streaming via TransformStream with Range support
 * - Exact MIME types, UTF-8 filenames, and Content-Disposition headers
 */

const MIME_MAP = {
  // Images
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
  // Video
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  flv: "video/x-flv",
  wmv: "video/x-ms-wmv",
  m4v: "video/x-m4v",
  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  m4a: "audio/mp4",
  aac: "audio/aac",
  opus: "audio/opus",
  // Documents & Office
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  json: "application/json; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  html: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  ts: "text/typescript; charset=utf-8",
  py: "text/x-python; charset=utf-8",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  "7z": "application/x-7z-compressed",
};

function getMimeType(filename = "", customMime = "") {
  if (customMime && customMime !== "application/octet-stream") {
    return customMime;
  }
  const ext = (filename.split(".").pop() || "").toLowerCase();
  return MIME_MAP[ext] || "application/octet-stream";
}

function getSafeFilename(filename = "file.bin") {
  return filename.replace(/["\r\n]/g, "_");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Global CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type, Content-Disposition, Accept-Ranges",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const botToken = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // Route 1: Health Check
    // ─────────────────────────────────────────────────────────────
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response(
        JSON.stringify({
          status: "AirShare Edge Storage Active v2.1",
          byteRangeSeeking: true,
          multiChunkStreaming: true,
          timestamp: Date.now(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────────────────────
    // Route 2: Upload Chunk (Browser -> Worker -> Telegram)
    // ─────────────────────────────────────────────────────────────
    if (url.pathname === "/api/upload-chunk" && request.method === "POST") {
      try {
        const formData = await request.formData();
        const chunk = formData.get("chunk");
        const fileName = (formData.get("fileName") || "file.part").toString();
        const chunkIndex = (formData.get("chunkIndex") || "0").toString();

        if (!chunk) {
          return new Response(JSON.stringify({ error: "Missing chunk data" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const tgFormData = new FormData();
        tgFormData.append("chat_id", chatId);
        tgFormData.append(
          "document",
          chunk,
          `${fileName}.part${chunkIndex}`
        );
        tgFormData.append(
          "caption",
          `AirShare | ${fileName} | Part ${parseInt(chunkIndex, 10) + 1}`
        );

        const tgRes = await fetch(
          `https://api.telegram.org/bot${botToken}/sendDocument`,
          {
            method: "POST",
            body: tgFormData,
          }
        );

        const tgData = await tgRes.json();

        if (!tgData.ok) {
          const isRateLimit = tgRes.status === 429 || tgData.error_code === 429;
          const retryAfter = tgData.parameters?.retry_after || 5;
          return new Response(
            JSON.stringify({
              error: tgData.description || "Telegram API upload error",
              errorCode: tgData.error_code,
              retryAfter: isRateLimit ? retryAfter : undefined,
            }),
            {
              status: isRateLimit ? 429 : 502,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        return new Response(
          JSON.stringify({
            status: "success",
            file_id: tgData.result.document.file_id,
            message_id: tgData.result.message_id,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ─────────────────────────────────────────────────────────────
    // Route 3: Stream Single Chunk / Single File with HTTP Byte Ranges
    // Supports video/audio seeking via Range: bytes=...
    // ─────────────────────────────────────────────────────────────
    if (url.pathname.startsWith("/api/stream/")) {
      const fileId = url.pathname.replace("/api/stream/", "").split("?")[0];
      if (!fileId) {
        return new Response("Missing file ID", { status: 400, headers: corsHeaders });
      }

      const fileName = url.searchParams.get("name") || url.searchParams.get("filename") || "file";
      const customMime = url.searchParams.get("mime") || "";
      const isDownload = url.searchParams.get("download") === "1" || url.searchParams.get("download") === "true";
      const mimeType = getMimeType(fileName, customMime);
      const safeName = getSafeFilename(fileName);

      // 1. Get file path from Telegram
      const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
      const infoData = await infoRes.json();

      if (!infoData.ok) {
        return new Response(`Telegram error: ${infoData.description}`, { status: 404, headers: corsHeaders });
      }

      const filePath = infoData.result.file_path;
      const rangeHeader = request.headers.get("Range");

      // 2. Forward Range header to Telegram file server for instant media seeking
      const tgHeaders = {};
      if (rangeHeader) {
        tgHeaders["Range"] = rangeHeader;
      }

      const fileStream = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${filePath}`,
        { headers: tgHeaders }
      );

      const disposition = isDownload
        ? `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
        : `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

      const responseHeaders = {
        ...corsHeaders,
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=31536000, immutable",
      };

      if (fileStream.headers.has("Content-Range")) {
        responseHeaders["Content-Range"] = fileStream.headers.get("Content-Range");
      }
      if (fileStream.headers.has("Content-Length")) {
        responseHeaders["Content-Length"] = fileStream.headers.get("Content-Length");
      }

      return new Response(fileStream.body, {
        status: fileStream.status, // 206 Partial Content when seeking!
        headers: responseHeaders,
      });
    }

    // ─────────────────────────────────────────────────────────────
    // Route 4: Live Multi-Chunk Concatenation Streaming with Seeking
    // Streams multiple Telegram chunks seamlessly as ONE single unified file!
    // ─────────────────────────────────────────────────────────────
    if (url.pathname === "/api/stream-file") {
      let chunkIds = [];
      let fileName = "file";
      let customMime = "";
      let isDownload = false;

      if (request.method === "POST") {
        try {
          const body = await request.json();
          chunkIds = body.chunks || [];
          fileName = body.name || body.fileName || "file";
          customMime = body.mime || "";
          isDownload = Boolean(body.download);
        } catch (e) {
          return new Response("Invalid JSON body", { status: 400, headers: corsHeaders });
        }
      } else {
        const rawChunks = url.searchParams.get("chunks") || "";
        chunkIds = rawChunks.split(",").map((s) => s.trim()).filter(Boolean);
        fileName = url.searchParams.get("name") || url.searchParams.get("filename") || "file";
        customMime = url.searchParams.get("mime") || "";
        isDownload = url.searchParams.get("download") === "1" || url.searchParams.get("download") === "true";
      }

      if (chunkIds.length === 0) {
        return new Response("No chunks provided", { status: 400, headers: corsHeaders });
      }

      const mimeType = getMimeType(fileName, customMime);
      const safeName = getSafeFilename(fileName);

      const disposition = isDownload
        ? `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
        : `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;

      // Parse HTTP Range header (e.g. Range: bytes=150000000-)
      const rangeHeader = request.headers.get("Range");
      let startByte = 0;
      let isPartial = false;

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-/);
        if (match) {
          startByte = parseInt(match[1], 10);
          isPartial = true;
        }
      }

      // 19.5 MB chunk size in bytes
      const CHUNK_SIZE = 19.5 * 1024 * 1024;
      const totalEstimatedBytes = Math.round(chunkIds.length * CHUNK_SIZE);
      const startChunkIdx = Math.min(chunkIds.length - 1, Math.floor(startByte / CHUNK_SIZE));
      const offsetInFirstChunk = Math.round(startByte - (startChunkIdx * CHUNK_SIZE));

      const { readable, writable } = new TransformStream();

      // Background pipe loop: pipes chunks sequentially starting from the seek position
      (async () => {
        const writer = writable.getWriter();
        try {
          for (let i = startChunkIdx; i < chunkIds.length; i++) {
            const chunkId = chunkIds[i];

            // 1. Fetch Telegram file path
            const infoRes = await fetch(
              `https://api.telegram.org/bot${botToken}/getFile?file_id=${chunkId}`
            );
            const infoData = await infoRes.json();

            if (!infoData.ok || !infoData.result?.file_path) {
              continue;
            }

            // 2. Fetch chunk stream (forwarding range offset for the first seeked chunk)
            const tgHeaders = {};
            if (i === startChunkIdx && offsetInFirstChunk > 0) {
              tgHeaders["Range"] = `bytes=${offsetInFirstChunk}-`;
            }

            const fileRes = await fetch(
              `https://api.telegram.org/file/bot${botToken}/${infoData.result.file_path}`,
              { headers: tgHeaders }
            );

            if (fileRes.body) {
              const reader = fileRes.body.getReader();
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                await writer.write(value);
              }
            }
          }
        } catch (err) {
          console.error("Multi-chunk stream pipe error:", err);
        } finally {
          await writer.close();
        }
      })();

      const streamHeaders = {
        ...corsHeaders,
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=86400",
      };

      if (isPartial) {
        streamHeaders["Content-Range"] = `bytes ${startByte}-${totalEstimatedBytes - 1}/${totalEstimatedBytes}`;
      }

      return new Response(readable, {
        status: isPartial ? 206 : 200,
        headers: streamHeaders,
      });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
};
