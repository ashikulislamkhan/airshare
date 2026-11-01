"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { UploadTask, DownloadTask } from "../lib/types";
import { DirectCloudRunUploader } from "../lib/chunker";

interface TransferContextType {
  uploadTasks: UploadTask[];
  downloadTasks: DownloadTask[];
  addUploads: (files: FileList | File[], folderId: string | null) => void;
  clearCompletedUploads: () => void;
  pauseUpload: (id: string) => void;
  isTrayOpen: boolean;
  setIsTrayOpen: (open: boolean) => void;
}

const TransferContext = createContext<TransferContextType>({
  uploadTasks: [],
  downloadTasks: [],
  addUploads: () => {},
  clearCompletedUploads: () => {},
  pauseUpload: () => {},
  isTrayOpen: false,
  setIsTrayOpen: () => {},
});

export function TransferProvider({ children }: { children: React.ReactNode }) {
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [isTrayOpen, setIsTrayOpen] = useState(false);

  const processUploadQueue = async (task: UploadTask) => {
    const uploader = new DirectCloudRunUploader(
      task.file,
      task.folderId,
      (progress) => {
        setUploadTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  uploadedBytes: progress.uploadedBytes,
                  progressPercent: progress.percent,
                  speedBytesPerSec: progress.speedBytesPerSec,
                  chunksUploaded: progress.currentChunkIndex,
                }
              : t
          )
        );
      }
    );

    try {
      setUploadTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "uploading" } : t))
      );

      await uploader.start();

      setUploadTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: "completed", progressPercent: 100 }
            : t
        )
      );

      // Notify drive page to auto-refresh newly uploaded file
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("airshare:upload-complete"));
      }
    } catch (err: any) {
      console.error(`Upload error for ${task.file.name}:`, err);
      setUploadTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: "error", errorMessage: err.message || "Failed" }
            : t
        )
      );
    }
  };

  const addUploads = useCallback((files: FileList | File[], folderId: string | null) => {
    const fileArray = Array.from(files);
    const newTasks: UploadTask[] = fileArray.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      file,
      folderId,
      progressPercent: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      speedBytesPerSec: 0,
      status: "queued",
      chunksTotal: Math.max(1, Math.ceil(file.size / 52428800)),
      chunksUploaded: 0,
    }));

    setUploadTasks((prev) => [...prev, ...newTasks]);
    setIsTrayOpen(true);

    // Process tasks sequentially or in light parallel
    newTasks.forEach((task) => {
      processUploadQueue(task);
    });
  }, []);

  const pauseUpload = (id: string) => {
    setUploadTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "paused" } : t))
    );
  };

  const clearCompletedUploads = () => {
    setUploadTasks((prev) => prev.filter((t) => t.status !== "completed"));
  };

  return (
    <TransferContext.Provider
      value={{
        uploadTasks,
        downloadTasks,
        addUploads,
        clearCompletedUploads,
        pauseUpload,
        isTrayOpen,
        setIsTrayOpen,
      }}
    >
      {children}
    </TransferContext.Provider>
  );
}

export const useTransfer = () => useContext(TransferContext);
