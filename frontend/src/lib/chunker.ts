import { api } from "./api";
import { db } from "./firebase";
import { doc, updateDoc } from "firebase/firestore";

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
  }): void;
}

interface UploadedChunkResult {
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

  constructor(file: File, folderId: string | null = null, onProgress?: UploadProgressCallback) {
    this.file = file;
    this.folderId = folderId;
    this.onProgress = onProgress;
    this.abortController = new AbortController();
  }

  public pause() {
    this.isPaused = true;
    this.abortController.abort();
  }

  public async start(): Promise<string> {
    const totalSize = this.file.size;

    // Step 1: Initialize metadata directly in Firestore
    const initResponse = await api.initFileUpload({
      name: this.file.name,
      totalSizeBytes: totalSize,
      folderId: this.folderId,
      mimeType: this.file.type || undefined,
    });

    const fileId = initResponse.file.id;
    const chunkSize = CHUNK_SIZE_BYTES;
    const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));

    const WORKER_URL = (
      process.env.NEXT_PUBLIC_WORKER_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "https://airshare-storage.ashikkhaninc.workers.dev"
    ).replace(/\/$/, "");

    // Track progress across parallel streams
    const chunkBytesUploaded = new Array<number>(totalChunks).fill(0);
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
          currentChunkIndex: chunkBytesUploaded.filter((b) => b > 0).length,
          totalChunks,
        });
      }
    };

    // Step 2: Upload single chunk with robust retry & 429 rate-limit backoff
    const uploadSingleChunk = async (chunkIndex: number): Promise<UploadedChunkResult> => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, totalSize);
      const partSize = end - start;
      const chunkBlob = this.file.slice(start, end);

      let attempt = 0;
      const MAX_ATTEMPTS = 6;

      while (attempt < MAX_ATTEMPTS) {
        if (this.isPaused) throw new Error("Upload cancelled or aborted.");
        attempt++;
        let waitTimeMs = 1000 * Math.pow(1.5, attempt);

        try {
          let lastLoaded = 0;

          const result = await new Promise<{ file_id: string; message_id?: number }>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", `${WORKER_URL}/api/upload-chunk`);
            xhr.timeout = 180000; // 3 minute timeout per chunk

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
                try {
                  const data = JSON.parse(xhr.responseText);
                  if (data.retryAfter) {
                    waitTimeMs = (data.retryAfter + 1) * 1000;
                  }
                } catch (e) {}
                reject(new Error("Telegram rate limit (429)"));
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
          console.warn(`Chunk ${chunkIndex + 1}/${totalChunks} retry ${attempt}/${MAX_ATTEMPTS}:`, err.message || err);
          if (attempt >= MAX_ATTEMPTS) {
            this.isPaused = true; // Signal all concurrent workers to stop
            this.abortController.abort();
            throw err;
          }
          await new Promise((res) => setTimeout(res, waitTimeMs));
        }
      }
      throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks} after ${MAX_ATTEMPTS} attempts.`);
    };

    // Step 3: Concurrency Worker Pool (Adaptive 2 streams for huge files to prevent Telegram 429)
    const CONCURRENCY = totalChunks > 15 ? 2 : 3;
    const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);
    const uploadedChunks: UploadedChunkResult[] = new Array(totalChunks);

    const pool = async () => {
      while (chunkIndices.length > 0) {
        if (this.isPaused) throw new Error("Upload paused or stopped.");
        const nextIndex = chunkIndices.shift();
        if (nextIndex === undefined) break;
        const res = await uploadSingleChunk(nextIndex);
        uploadedChunks[nextIndex] = res;

        // Incrementally save progress to Firestore every 3 chunks
        const finishedCount = uploadedChunks.filter(Boolean).length;
        if (finishedCount % 3 === 0 || finishedCount === totalChunks) {
          try {
            const fileRef = doc(db, "files", fileId);
            await updateDoc(fileRef, {
              status: finishedCount === totalChunks ? "completed" : "uploading",
              telegramFileId: uploadedChunks[0]?.telegramFileId || "",
              chunks: uploadedChunks.filter(Boolean),
              updatedAt: Date.now(),
            });
          } catch (syncErr) {
            console.warn("Incremental Firestore sync warning:", syncErr);
          }
        }
      }
    };

    const workers = Array.from({ length: Math.min(CONCURRENCY, totalChunks) }, () => pool());
    await Promise.all(workers);

    // Step 4: Finalize file record in Firestore
    const fileRef = doc(db, "files", fileId);
    await updateDoc(fileRef, {
      status: "completed",
      telegramFileId: uploadedChunks[0]?.telegramFileId || "",
      chunks: uploadedChunks,
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
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("airshare:upload-complete", { detail: { fileId } }));
    }

    return fileId;
  }
}
