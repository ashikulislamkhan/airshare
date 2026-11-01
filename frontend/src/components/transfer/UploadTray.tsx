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
  Loader2 
} from "lucide-react";
import { useTransfer } from "../../context/TransferContext";

export default function UploadTray() {
  const { uploadTasks, clearCompletedUploads, pauseUpload, isTrayOpen, setIsTrayOpen } = useTransfer();
  const [minimized, setMinimized] = useState(false);
  const [persistentSpeed, setPersistentSpeed] = useState<number>(0);

  if (uploadTasks.length === 0 || !isTrayOpen) return null;

  const completedCount = uploadTasks.filter((t) => t.status === "completed").length;
  const activeCount = uploadTasks.filter((t) => t.status === "uploading" || t.status === "queued").length;

  const formatSpeed = (bytesPerSec: number) => {
    if (bytesPerSec <= 0) return "";
    const mbps = bytesPerSec / (1024 * 1024);
    return `${mbps.toFixed(1)} MB/s`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const totalSpeed = uploadTasks
    .filter((t) => t.status === "uploading")
    .reduce((sum, t) => sum + (t.speedBytesPerSec || 0), 0);

  // Keep speed display steady without flickering
  React.useEffect(() => {
    if (totalSpeed > 0) {
      setPersistentSpeed(totalSpeed);
    } else if (activeCount === 0) {
      setPersistentSpeed(0);
    }
  }, [totalSpeed, activeCount]);

  return (
    <div className="fixed bottom-6 right-6 w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-50 select-none">
      {/* Header */}
      <div className="bg-slate-800/90 px-4 py-3 flex items-center justify-between border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          {activeCount > 0 ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="text-sm font-semibold text-white">
            {activeCount > 0 ? `Uploading ${activeCount} item${activeCount > 1 ? "s" : ""}` : "Uploads complete"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && persistentSpeed > 0 && (
            <span className="text-emerald-400 font-mono text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shadow-sm">
              {formatSpeed(persistentSpeed)}
            </span>
          )}
          <button
            onClick={() => setMinimized(!minimized)}
            className="p-1 text-slate-400 hover:text-white rounded transition"
          >
            {minimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsTrayOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      {!minimized && (
        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50 p-2">
          {uploadTasks.map((task) => (
            <div key={task.id} className="p-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-slate-200 font-medium truncate" title={task.file.name}>
                    {task.file.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-slate-400 text-[11px] whitespace-nowrap">
                    {task.status === "completed" && <span className="text-emerald-400 font-medium">Done</span>}
                    {task.status === "uploading" && (
                      <span className="text-blue-400 font-semibold">{task.progressPercent}%</span>
                    )}
                    {task.status === "error" && <span className="text-red-400">Error</span>}
                    {task.status === "queued" && <span className="text-slate-400">Queued</span>}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    task.status === "completed"
                      ? "bg-emerald-500"
                      : task.status === "error"
                      ? "bg-red-500"
                      : "bg-blue-500"
                  }`}
                  style={{ width: `${task.progressPercent}%` }}
                />
              </div>

              {/* Sub-status & Part progress */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>
                  {formatBytes(task.uploadedBytes)} of {formatBytes(task.totalBytes)}
                  {task.chunksTotal > 1 && ` (Part ${task.chunksUploaded}/${task.chunksTotal})`}
                </span>
              </div>

              {task.status === "error" && task.errorMessage && (
                <p className="text-[10px] text-red-400 truncate pt-0.5" title={task.errorMessage}>
                  {task.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {!minimized && completedCount > 0 && (
        <div className="p-2 bg-slate-800/40 border-t border-slate-800 flex justify-end">
          <button
            onClick={clearCompletedUploads}
            className="text-xs text-slate-400 hover:text-white transition px-2 py-1"
          >
            Clear completed
          </button>
        </div>
      )}
    </div>
  );
}
