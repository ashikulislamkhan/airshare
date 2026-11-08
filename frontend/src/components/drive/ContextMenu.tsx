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
  target?: AirShareFile | AirShareFolder | null;
  targetType?: "file" | "folder";
  selectedCount?: number;
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
  selectedCount = 1,
  onClose,
  onPreview,
  onDownload,
  onShare,
  onStar,
  onTrash,
}: ContextMenuProps) {
  const isMulti = selectedCount > 1;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ top: y, left: x }}
      className="fixed bg-slate-900 border border-white/[0.08] rounded-xl shadow-xl py-1 w-52 z-50 text-xs text-slate-200 select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Header if multi-selected */}
      {isMulti && (
        <div className="px-3 py-1.5 text-[11px] font-mono tabular-nums text-slate-400 border-b border-white/[0.06] mb-0.5">
          {selectedCount} items selected
        </div>
      )}

      {!isMulti && targetType === "file" && onPreview && (
        <button
          onClick={() => { onPreview(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.06] transition-colors text-left"
        >
          <Eye className="w-3.5 h-3.5 text-slate-400" />
          <span>Preview</span>
        </button>
      )}

      {onDownload && (
        <button
          onClick={() => { onDownload(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.06] transition-colors text-left"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>{isMulti ? `Download (${selectedCount} items)` : "Download"}</span>
        </button>
      )}

      {!isMulti && onShare && (
        <button
          onClick={() => { onShare(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.06] transition-colors text-left"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Share</span>
        </button>
      )}

      {!isMulti && targetType === "file" && onStar && (
        <button
          onClick={() => { onStar(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/[0.06] transition-colors text-left"
        >
          <Star className={`w-3.5 h-3.5 ${(target as AirShareFile)?.isStarred ? "text-amber-300 fill-amber-300" : "text-slate-400"}`} />
          <span>{(target as AirShareFile)?.isStarred ? "Unstar" : "Add to Starred"}</span>
        </button>
      )}

      <div className="h-px bg-white/[0.06] my-1" />

      {onTrash && (
        <button
          onClick={() => { onTrash(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-500/10 text-rose-300 hover:text-rose-200 transition-colors text-left"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Move to Trash</span>
        </button>
      )}
    </div>
  );
}
