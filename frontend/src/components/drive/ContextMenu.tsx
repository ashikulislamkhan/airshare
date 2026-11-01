"use client";

import React from "react";
import { 
  Eye, 
  Download, 
  Star, 
  Share2, 
  Trash2, 
  CornerDownRight 
} from "lucide-react";
import { AirShareFile, AirShareFolder } from "../../lib/types";

interface ContextMenuProps {
  x: number;
  y: number;
  target: AirShareFile | AirShareFolder | null;
  targetType: "file" | "folder";
  onClose: () => void;
  onPreview?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onStar?: () => void;
  onTrash?: () => void;
}

export default function ContextMenu({
  x,
  y,
  target,
  targetType,
  onClose,
  onPreview,
  onDownload,
  onShare,
  onStar,
  onTrash,
}: ContextMenuProps) {
  if (!target) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ top: y, left: x }}
      className="fixed bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 w-52 z-50 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {targetType === "file" && onPreview && (
        <button
          onClick={() => { onPreview(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 transition"
        >
          <Eye className="w-4 h-4 text-blue-400" />
          Preview
        </button>
      )}

      {targetType === "file" && onDownload && (
        <button
          onClick={() => { onDownload(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 transition"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Download
        </button>
      )}

      {onShare && (
        <button
          onClick={() => { onShare(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 transition"
        >
          <Share2 className="w-4 h-4 text-indigo-400" />
          Share
        </button>
      )}

      {onStar && (
        <button
          onClick={() => { onStar(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-700/70 transition"
        >
          <Star className={`w-4 h-4 ${target.isStarred ? "text-amber-400 fill-amber-400" : "text-slate-400"}`} />
          {target.isStarred ? "Remove from Starred" : "Add to Starred"}
        </button>
      )}

      <div className="h-px bg-slate-700 my-1" />

      {onTrash && (
        <button
          onClick={() => { onTrash(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:bg-red-500/10 transition"
        >
          <Trash2 className="w-4 h-4" />
          Move to Trash
        </button>
      )}
    </div>
  );
}
