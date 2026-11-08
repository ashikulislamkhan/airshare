import { api } from "./api";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";

// 19 MB chunk size: safely below Telegram Bot API's 20 MB download & 50 MB upload limits
export const CHUNK_SIZE_BYTES = 19 * 1024 * 1024;
export const MAX_CHUNK_SIZE_BYTES = CHUNK_SIZE_BYTES;
export const UPLOAD_SLICE_SIZE = CHUNK_SIZE_BYTES;

export interface UploadProgressCallback {
  (progress: {
    uploadedBytes: number;
    totalBytes: number;
    percent: number;
    speedBytesPerSec: number;
    currentChunkIndex: number;
    totalChunks: number;
    fileId?: string;
  }): void;
}

export interface UploadedChunkResult {
  chunkIndex: number;
  startByte: number;
  endByte: number;
  sizeBytes: number;
  telegramFileId: string;
  telegramMessageId?: number;
}

export class DirectCloudRunUploader {
  private file: File;
  private folderId: string | null;
  private onProgress?: UploadProgressCallback;
  private abortController: AbortController;
  private isPaused: boolean = false;
  private existingFileId?: string;

  // Global rate limit coordination across concurrent tasks/chunks
  private static rateLimitCooldownUntil: number = 0;
  private static lastTelegramDispatchTime: number = 0;

  constructor(
    file: File,
    folderId: string | null = null,
    onProgress?: UploadProgressCallback,
    existingFileId?: string
  ) {
    this.file = file;
    this.folderId = folderId;
    this.onProgress = onProgress;
    this.abortController = new AbortController();
    this.existingFileId = existingFileId;
  }

  public pause() {
    this.isPaused = true;
    this.abortController.abort();
  }

  public async start(): Promise<string> {
    const totalSize = this.file.size;
    const chunkSize = CHUNK_SIZE_BYTES;
    const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));

    const WORKER_URL = (
      process.env.NEXT_PUBLIC_WORKER_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "https://airshare-storage.ashikkhaninc.workers.dev"
    ).replace(/\/$/, "");

    // ─────────────────────────────────────────────────────────────
    // Step 1: Check for existing incomplete file in Firestore to resume
    // ─────────────────────────────────────────────────────────────
    let fileId = this.existingFileId;
    let existingChunks: UploadedChunkResult[] = [];

    if (fileId) {
      try {
        const snap = await getDoc(doc(db, "files", fileId));
        if (snap.exists()) {
          const data = snap.data();
          existingChunks = (data.chunks || []) as UploadedChunkResult[];
        }
      } catch (e) {
        console.warn("Could not load existing file for resume:", e);
      }
    } else if (auth.currentUser) {
      // Find matching in-progress file created recently
      try {
        const q = query(
          collection(db, "files"),
          where("ownerUid", "==", auth.currentUser.uid),
          where("name", "==", this.file.name),
          where("totalSizeBytes", "==", totalSize),
          where("isTrash", "==", false)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const candidate = snapshot.docs[0];
          const data = candidate.data();
          if (data.status === "uploading" || !data.telegramFileId) {
            fileId = candidate.id;
            existingChunks = (data.chunks || []) as UploadedChunkResult[];
            console.log(`AirShare: Resuming existing file ${fileId} with ${existingChunks.length} existing parts.`);
          }
        }
      } catch (e) {
        console.warn("Resume scan error:", e);
      }
    }

    // If no existing file found to resume, initialize fresh file record
    if (!fileId) {
      const initResponse = await api.initFileUpload({
        name: this.file.name,
        totalSizeBytes: totalSize,
        folderId: this.folderId,
        mimeType: this.file.type || undefined,
      });
      fileId = initResponse.file.id;
    }

    // Populate uploadedChunks array from existing chunks
    const uploadedChunks: (UploadedChunkResult | undefined)[] = new Array(totalChunks).fill(undefined);
    const chunkBytesUploaded = new Array<number>(totalChunks).fill(0);

    for (const chunk of existingChunks) {
      if (chunk && chunk.chunkIndex < totalChunks && chunk.telegramFileId) {
        uploadedChunks[chunk.chunkIndex] = chunk;
        const partSize = Math.min(chunkSize, totalSize - chunk.chunkIndex * chunkSize);
        chunkBytesUploaded[chunk.chunkIndex] = partSize;
      }
    }

    let lastTime = Date.now();
    let bytesSinceLastTime = 0;
    let smoothedSpeed = 0;

    const notifyProgress = (delta: number) => {
      const currentUploaded = chunkBytesUploaded.reduce((a, b) => a + b, 0);
      const now = Date.now();
      const timeElapsedSec = (now - lastTime) / 1000;
      if (timeElapsedSec >= 0.4) {
        const instantSpeed = (bytesSinceLastTime + delta) / timeElapsedSec;
        smoothedSpeed = smoothedSpeed === 0 ? instantSpeed : 0.7 * smoothedSpeed + 0.3 * instantSpeed;
        lastTime = now;
        bytesSinceLastTime = 0;
      } else {
        bytesSinceLastTime += delta;
      }

      if (this.onProgress) {
        this.onProgress({
          uploadedBytes: Math.min(currentUploaded, totalSize),
          totalBytes: totalSize,
          percent: Math.min(99, Math.round((currentUploaded / totalSize) * 100)),
          speedBytesPerSec: smoothedSpeed,
          currentChunkIndex: uploadedChunks.filter(Boolean).length,
          totalChunks,
          fileId,
        });
      }
    };

    // Initial progress notification with already-uploaded chunk progress
    notifyProgress(0);

    // ─────────────────────────────────────────────────────────────
    // Step 2: Upload single chunk with Telegram rate pacing & 429 cooldown
    // ─────────────────────────────────────────────────────────────
    const uploadSingleChunk = async (chunkIndex: number): Promise<UploadedChunkResult> => {
      // If already uploaded and saved in Firestore, reuse it immediately
      if (uploadedChunks[chunkIndex]?.telegramFileId) {
        return uploadedChunks[chunkIndex]!;
      }

      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const partSize = end - start;
      const chunkBlob = this.file.slice(start, end);

      let attempt = 0;
      const MAX_NON_429_ATTEMPTS = 5;

      while (attempt < MAX_NON_429_ATTEMPTS) {
        if (this.isPaused) throw new Error("Upload cancelled or aborted.");

        // Wait out any active Telegram rate-limit cooldown
        while (Date.now() < DirectCloudRunUploader.rateLimitCooldownUntil) {
          if (this.isPaused) throw new Error("Upload cancelled or aborted.");
          const waitMs = Math.min(1000, DirectCloudRunUploader.rateLimitCooldownUntil - Date.now());
          await new Promise((res) => setTimeout(res, waitMs));
        }

        // Pacing: ensure minimum gap between chunk upload dispatches (Telegram ~20 msg/min limit)
        const now = Date.now();
        const timeSinceLast = now - DirectCloudRunUploader.lastTelegramDispatchTime;
        if (timeSinceLast < 2200) {
          await new Promise((res) => setTimeout(res, 2200 - timeSinceLast));
        }
        DirectCloudRunUploader.lastTelegramDispatchTime = Date.now();

        try {
          let lastLoaded = 0;

          const result = await new Promise<{ file_id: string; message_id?: number }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `${WORKER_URL}/api/upload-chunk`);
            xhr.timeout = 240000; // 4 minute timeout per 19MB chunk

            const abortHandler = () => {
              xhr.abort();
              reject(new Error("Upload aborted."));
            };
            this.abortController.signal.addEventListener("abort", abortHandler, { once: true });

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                const delta = e.loaded - lastLoaded;
                lastLoaded = e.loaded;
                chunkBytesUploaded[chunkIndex] = e.loaded;
                notifyProgress(delta);
              }
            };

            xhr.onload = () => {
              this.abortController.signal.removeEventListener("abort", abortHandler);
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const data = JSON.parse(xhr.responseText);
                  if (data.status === "success" && data.file_id) {
                    resolve(data);
                  } else {
                    reject(new Error(data.error || "Upload failed"));
                  }
                } catch (parseErr) {
                  reject(new Error("Invalid worker response"));
                }
              } else if (xhr.status === 429) {
                let retryAfterSec = 30;
                try {
                  const data = JSON.parse(xhr.responseText);
                  if (data.retryAfter) {
                    retryAfterSec = Number(data.retryAfter);
                  }
                } catch (e) {}
                // Trigger global cooldown without burning regular network attempts
                DirectCloudRunUploader.rateLimitCooldownUntil = Date.now() + (retryAfterSec + 2) * 1000;
                reject(new Error(`Telegram rate limit (429) — backing off for ${retryAfterSec + 2}s`));
              } else {
                reject(new Error(`Worker error (${xhr.status}): ${xhr.responseText}`));
              }
            };

            xhr.ontimeout = () => {
              this.abortController.signal.removeEventListener("abort", abortHandler);
              reject(new Error("Upload chunk timed out"));
            };

            xhr.onerror = () => {
              this.abortController.signal.removeEventListener("abort", abortHandler);
              reject(new Error("Network error during upload"));
            };

            const formData = new FormData();
            formData.append("chunk", chunkBlob, `${this.file.name}.part${chunkIndex}`);
            formData.append("fileName", this.file.name);
            formData.append("chunkIndex", chunkIndex.toString());

            xhr.send(formData);
          });

          chunkBytesUploaded[chunkIndex] = partSize;
          notifyProgress(0);

          return {
            chunkIndex,
            startByte: start,
            endByte: end,
            sizeBytes: partSize,
            telegramFileId: result.file_id,
            telegramMessageId: result.message_id,
          };
        } catch (err: any) {
          if (this.isPaused) throw err;
          const is429 = err.message && err.message.includes("429");
          if (!is429) {
            attempt++;
          }
          console.warn(
            `Chunk ${chunkIndex + 1}/${totalChunks} ${is429 ? "rate-limited" : `attempt ${attempt}/${MAX_NON_429_ATTEMPTS}`}:`,
            err.message || err
          );

          if (attempt >= MAX_NON_429_ATTEMPTS) {
            this.isPaused = true;
            this.abortController.abort();
            throw err;
          }

          if (is429) {
            // Wait for cooldown
            const waitMs = Math.max(2000, DirectCloudRunUploader.rateLimitCooldownUntil - Date.now());
            await new Promise((res) => setTimeout(res, waitMs));
          } else {
            await new Promise((res) => setTimeout(res, 2000 * attempt));
          }
        }
      }

      throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}.`);
    };

    // ─────────────────────────────────────────────────────────────
    // Step 3: Concurrency Worker Pool
    // For large files (> 5 chunks), CONCURRENCY = 1 guarantees strict ordering and zero Telegram 429 flood
    // ─────────────────────────────────────────────────────────────
    const CONCURRENCY = totalChunks > 5 ? 1 : 2;
    const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i).filter(
      (idx) => !uploadedChunks[idx]?.telegramFileId
    );

    const pool = async () => {
      while (chunkIndices.length > 0) {
        if (this.isPaused) throw new Error("Upload paused or stopped.");
        const nextIndex = chunkIndices.shift();
        if (nextIndex === undefined) break;

        const res = await uploadSingleChunk(nextIndex);
        uploadedChunks[nextIndex] = res;

        // Persist progress to Firestore after each chunk so any interrupt can resume!
        try {
          const fileRef = doc(db, "files", fileId);
          await updateDoc(fileRef, {
            status: "uploading",
            telegramFileId: uploadedChunks[0]?.telegramFileId || "",
            chunks: uploadedChunks.filter(Boolean),
            updatedAt: Date.now(),
          });
        } catch (syncErr) {
          console.warn("Incremental Firestore sync warning:", syncErr);
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, chunkIndices.length || 1) }, () => pool());
    await Promise.all(workers);

    // ─────────────────────────────────────────────────────────────
    // Step 4: Finalize file record in Firestore as completed
    // ─────────────────────────────────────────────────────────────
    const finalizedChunks = uploadedChunks.filter((c): c is UploadedChunkResult => Boolean(c));
    const fileRef = doc(db, "files", fileId);
    await updateDoc(fileRef, {
      status: "completed",
      telegramFileId: finalizedChunks[0]?.telegramFileId || "",
      chunks: finalizedChunks,
      updatedAt: Date.now(),
    });

    if (this.onProgress) {
      this.onProgress({
        uploadedBytes: totalSize,
        totalBytes: totalSize,
        percent: 100,
        speedBytesPerSec: smoothedSpeed,
        currentChunkIndex: totalChunks,
        totalChunks,
        fileId,
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("airshare:upload-complete", { detail: { fileId } }));
    }

    return fileId;
  }
}
