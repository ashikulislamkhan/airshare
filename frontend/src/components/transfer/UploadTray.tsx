"use client";

import React, { useState } from "react";
import { 
  ChevronUp, 
  ChevronDown, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Pause, 
  FileText, 
  Loader2,
  RotateCcw 
} from "lucide-react";
import { useTransfer } from "../../context/TransferContext";

export default function UploadTray() {
  const { uploadTasks, clearCompletedUploads, pauseUpload, retryUpload, isTrayOpen, setIsTrayOpen } = useTransfer();
  const [minimized, setMinimized] = useState(false);
  const [persistentSpeed, setPersistentSpeed] = useState<number>(0);

  const completedCount = uploadTasks.filter((t) => t.status === "completed").length;
  const activeCount = uploadTasks.filter((t) => t.status === "uploading" || t.status === "queued").length;
  const totalSpeed = uploadTasks
    .filter((t) => t.status === "uploading")
    .reduce((sum, t) => sum + (t.speedBytesPerSec || 0), 0);

  // Keep speed display steady without flickering - MUST RUN UNCONDITIONALLY ON EVERY RENDER
  React.useEffect(() => {
    if (totalSpeed > 0) {
      setPersistentSpeed(totalSpeed);
    } else if (activeCount === 0) {
      setPersistentSpeed(0);
    }
  }, [totalSpeed, activeCount]);

  if (uploadTasks.length === 0 || !isTrayOpen) return null;

  const formatSpeed = (bytesPerSec: number) => {
    if (!bytesPerSec || isNaN(bytesPerSec) || bytesPerSec <= 0) return "";
    const mbps = bytesPerSec / (1024 * 1024);
    return `${mbps.toFixed(1)} MB/s`;
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="fixed bottom-5 right-5 w-84 bg-slate-900 border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden z-50 select-none">
      {/* Header */}
      <div className="bg-slate-900/90 px-3.5 py-2.5 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
          ) : uploadTasks.some((t) => t.status === "error") ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="text-xs font-medium text-slate-200">
            {activeCount > 0
              ? `Uploading ${activeCount} item${activeCount > 1 ? "s" : ""}`
              : uploadTasks.some((t) => t.status === "error")
              ? "Upload interrupted"
              : "Uploads complete"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeCount > 0 && persistentSpeed > 0 && (
            <span className="text-sky-400 font-mono text-[10px] tabular-nums font-medium bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
              {formatSpeed(persistentSpeed)}
            </span>
          )}
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            {minimized ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsTrayOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task List */}
      {!minimized && (
        <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04] p-1.5">
          {uploadTasks.map((task) => (
            <div key={task.id} className="p-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-200 font-medium truncate" title={task.file.name}>
                    {task.file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-slate-400 text-[11px] font-mono tabular-nums whitespace-nowrap">
                    {task.status === "completed" && <span className="text-emerald-400 font-medium">Done</span>}
                    {task.status === "uploading" && (
                      <span className="text-sky-400 font-medium">{task.progressPercent}%</span>
                    )}
                    {task.status === "error" && <span className="text-rose-400">Error</span>}
                    {task.status === "queued" && <span className="text-slate-400">Queued</span>}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-200 rounded-full ${
                    task.status === "completed"
                      ? "bg-emerald-400"
                      : task.status === "error"
                      ? "bg-rose-400"
                      : "bg-sky-400"
                  }`}
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>

              {/* Sub-status & Part progress */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono tabular-nums">
                <span>
                  {formatBytes(task.uploadedBytes)} of {formatBytes(task.totalBytes)}
                  {task.chunksTotal > 1 && ` (Part ${task.chunksUploaded}/${task.chunksTotal})`}
                </span>
                {task.status === "uploading" && (
                  <button
                    onClick={() => pauseUpload(task.id)}
                    className="text-slate-400 hover:text-white transition-colors"
                    title="Pause"
                  >
                    <Pause className="w-3 h-3" />
                  </button>
                )}
                {task.status === "error" && (
                  <button
                    onClick={() => retryUpload(task.id)}
                    className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors font-medium cursor-pointer"
                    title="Resume upload from last saved chunk"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Resume</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {completedCount > 0 && (
            <div className="p-1.5 flex justify-end">
              <button
                onClick={clearCompletedUploads}
                className="text-[11px] text-slate-400 hover:text-white transition-colors py-1 px-2 rounded hover:bg-white/[0.04]"
              >
                Clear completed
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
