"use client";

import React, { useEffect, useState } from "react";
import { 
  X, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FileText, 
  ExternalLink,
  Loader2 
} from "lucide-react";
import { AirShareFile } from "../../lib/types";
import { api } from "../../lib/api";

interface PreviewModalProps {
  file: AirShareFile | null;
  onClose: () => void;
}

export default function PreviewModal({ file, onClose }: PreviewModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!file) {
      setToken(null);
      return;
    }

    setLoading(true);
    setZoom(1);
    setRotation(0);

    api.getPreviewToken(file.id)
      .then((t) => setToken(t))
      .catch((err) => console.error("Failed to generate preview token:", err))
      .finally(() => setLoading(false));
  }, [file]);

  if (!file) return null;

  const streamUrl = token ? api.getStreamUrl(file.id, token, false) : "";
  const downloadUrl = token ? api.getStreamUrl(file.id, token, true) : "";

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col z-50 select-none">
      {/* Header Bar */}
      <div className="h-16 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 truncate pr-4">
          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span className="text-white font-medium text-sm truncate">{file.name}</span>
        </div>

        <div className="flex items-center gap-2">
          {file.fileType === "image" && (
            <>
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                title="Rotate"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={file.name}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </a>
          )}

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Viewer */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm">Preparing stream preview...</p>
          </div>
        ) : (
          <>
            {/* Image Viewer */}
            {file.fileType === "image" && (
              <div className="relative max-w-full max-h-full overflow-auto flex items-center justify-center">
                <img
                  src={streamUrl}
                  alt={file.name}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: "transform 0.2s ease-out",
                  }}
                  className="max-h-[80vh] max-w-[80vw] object-contain rounded-lg shadow-2xl"
                />
              </div>
            )}

            {/* Video / Audio Player with HTTP 206 Seeking */}
            {file.fileType === "video" && (
              <div className="max-w-4xl w-full bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                <video
                  controls
                  autoPlay
                  playsInline
                  src={streamUrl}
                  className="w-full max-h-[75vh]"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {/* PDF Viewer */}
            {file.fileType === "pdf" && (
              <iframe
                src={`${streamUrl}#toolbar=1`}
                className="w-full h-full max-w-5xl rounded-xl border border-slate-800 shadow-2xl bg-white"
                title={file.name}
              />
            )}

            {/* Office Document Embed Viewer (Google Docs Viewer) */}
            {file.fileType === "office" && (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(streamUrl)}&embedded=true`}
                className="w-full h-full max-w-5xl rounded-xl border border-slate-800 shadow-2xl bg-white"
                title={file.name}
              />
            )}

            {/* Plain Text / Code / Other */}
            {(file.fileType === "text" || file.fileType === "other") && (
              <iframe
                src={streamUrl}
                className="w-full h-full max-w-4xl bg-slate-900 text-slate-200 rounded-xl border border-slate-800 p-4 font-mono text-sm"
                title={file.name}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
