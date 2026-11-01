import { getFirebaseIdToken } from "./firebase";
import { api } from "./api";

// 50 MB chunk limit: ensures uploads never hit proxy timeouts and increment smoothly
export const MAX_CHUNK_SIZE_BYTES = 52428800; // 50 MB 

// Transfer chunk slice size (can be tuned for network resilience: 50MB - 100MB slices)
export const UPLOAD_SLICE_SIZE = 50 * 1024 * 1024; // 50 MB

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
    const token = await getFirebaseIdToken();
    if (!token) throw new Error("Authentication required. Please sign in.");

    // Step 1: Initialize upload record on Cloud Run
    const initResponse = await api.initFileUpload({
      name: this.file.name,
      totalSizeBytes: totalSize,
      folderId: this.folderId,
      mimeType: this.file.type || undefined,
    });

    const fileId = initResponse.file.id;
    const maxChunkBytes = initResponse.maxChunkSizeBytes || MAX_CHUNK_SIZE_BYTES;
    const totalChunks = Math.max(1, Math.ceil(totalSize / maxChunkBytes));

    let totalUploadedBytes = 0;
    let lastTime = Date.now();
    let bytesSinceLastTime = 0;

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

    // Step 2: Slice and stream each chunk directly to Cloud Run
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (this.isPaused) {
        throw new Error("Upload paused by user.");
      }

      const start = chunkIndex * maxChunkBytes;
      const end = Math.min(start + maxChunkBytes, totalSize);
      const chunkSize = end - start;
      const chunkBlob = this.file.slice(start, end);

      // Retry loop per chunk (max 3 attempts)
      let attempt = 0;
      let success = false;

      const baseUploadedBytes = totalUploadedBytes;
      let activeXhr: XMLHttpRequest | null = null;

      while (attempt < 3 && !success) {
        attempt++;
        try {
          const freshToken = await getFirebaseIdToken();
          let chunkUploadedBytes = 0;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            activeXhr = xhr;
            xhr.open("POST", `${API_BASE_URL}/files/${fileId}/upload-chunk`);
            xhr.setRequestHeader("Authorization", `Bearer ${freshToken}`);
            xhr.setRequestHeader("X-Chunk-Index", chunkIndex.toString());
            xhr.setRequestHeader("X-Chunk-Size", chunkSize.toString());
            xhr.setRequestHeader("Content-Type", "application/octet-stream");

            const abortHandler = () => {
              xhr.abort();
              reject(new Error("Upload paused by user."));
            };
            this.abortController.signal.addEventListener("abort", abortHandler, { once: true });

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const delta = event.loaded - chunkUploadedBytes;
                chunkUploadedBytes = event.loaded;
                totalUploadedBytes = baseUploadedBytes + event.loaded;

                const now = Date.now();
                const timeElapsedSec = (now - lastTime) / 1000;
                let speed = 0;
                if (timeElapsedSec >= 0.5) {
                  speed = (bytesSinceLastTime + delta) / timeElapsedSec;
                  lastTime = now;
                  bytesSinceLastTime = 0;
                } else {
                  bytesSinceLastTime += delta;
                }

                if (this.onProgress) {
                  this.onProgress({
                    uploadedBytes: totalUploadedBytes,
                    totalBytes: totalSize,
                    percent: Math.min(99, Math.round((totalUploadedBytes / totalSize) * 100)),
                    speedBytesPerSec: speed,
                    currentChunkIndex: chunkIndex + 1,
                    totalChunks,
                  });
                }
              }
            };

            xhr.onload = () => {
              this.abortController.signal.removeEventListener("abort", abortHandler);
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
              } else {
                reject(new Error(`Upload error (${xhr.status}): ${xhr.responseText || xhr.statusText}`));
              }
            };

            xhr.onerror = () => {
              this.abortController.signal.removeEventListener("abort", abortHandler);
              reject(new Error("Network error during upload"));
            };

            xhr.onabort = () => {
              this.abortController.signal.removeEventListener("abort", abortHandler);
              reject(new Error("Upload aborted"));
            };

            xhr.send(chunkBlob);
          });

          success = true;
          totalUploadedBytes = baseUploadedBytes + chunkSize;

          if (this.onProgress) {
            this.onProgress({
              uploadedBytes: totalUploadedBytes,
              totalBytes: totalSize,
              percent: Math.round((totalUploadedBytes / totalSize) * 100),
              speedBytesPerSec: 0,
              currentChunkIndex: chunkIndex + 1,
              totalChunks,
            });
          }
        } catch (err: any) {
          if (this.isPaused) throw err;
          console.warn(`Chunk ${chunkIndex} failed (Attempt ${attempt}/3):`, err);
          if (attempt >= 3) throw err;
          await new Promise((res) => setTimeout(res, 2000 * attempt));
        }
      }
    }

    return fileId;
  }
}
