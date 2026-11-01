"use client";

import React from "react";
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  FileCode, 
  FileArchive, 
  MoreVertical, 
  Star 
} from "lucide-react";
import { AirShareFile, AirShareFolder } from "../../lib/types";

interface FileGridProps {
  folders: AirShareFolder[];
  files: AirShareFile[];
  selectedIds?: Set<string>;
  onFolderClick: (folder: AirShareFolder) => void;
  onFileClick: (file: AirShareFile) => void;
  onItemSelect?: (
    e: React.MouseEvent,
    target: AirShareFile | AirShareFolder,
    type: "file" | "folder"
  ) => void;
  onContextMenu: (
    e: React.MouseEvent,
    target: AirShareFile | AirShareFolder,
    type: "file" | "folder"
  ) => void;
}

export default function FileGrid({
  folders,
  files,
  selectedIds = new Set(),
  onFolderClick,
  onFileClick,
  onItemSelect,
  onContextMenu,
}: FileGridProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-8 h-8 text-emerald-400" />;
      case "video":
        return <Video className="w-8 h-8 text-purple-400" />;
      case "pdf":
        return <FileText className="w-8 h-8 text-rose-400" />;
      case "office":
        return <FileText className="w-8 h-8 text-blue-400" />;
      case "text":
        return <FileCode className="w-8 h-8 text-amber-400" />;
      default:
        return <FileArchive className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder) => {
              const isSelected = selectedIds.has(folder.id);
              return (
                <div
                  key={folder.id}
                  data-selectable-id={folder.id}
                  onClick={(e) => onItemSelect?.(e, folder, "folder")}
                  onDoubleClick={() => onFolderClick(folder)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(e, folder, "folder");
                  }}
                  className={`group relative border rounded-xl p-3 flex items-center gap-3 cursor-pointer transition shadow-sm hover:shadow-md ${
                    isSelected
                      ? "bg-blue-600/30 border-blue-500 ring-2 ring-blue-500/50"
                      : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 hover:border-blue-500/50"
                  }`}
                >
                  <Folder className="w-5 h-5 text-amber-400 fill-amber-400/20 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-200 truncate flex-1" title={folder.name}>
                    {folder.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, folder, "folder");
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded transition"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Files ({files.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {files.map((file) => {
              const isSelected = selectedIds.has(file.id);
              return (
                <div
                  key={file.id}
                  data-selectable-id={file.id}
                  onClick={(e) => onItemSelect?.(e, file, "file")}
                  onDoubleClick={() => onFileClick(file)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onContextMenu(e, file, "file");
                  }}
                  className={`group relative border rounded-2xl overflow-hidden cursor-pointer transition shadow-sm hover:shadow-lg flex flex-col ${
                    isSelected
                      ? "bg-blue-600/30 border-blue-500 ring-2 ring-blue-500/50"
                      : "bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-blue-500/50"
                  }`}
                >
                  {/* Thumbnail / Icon Container */}
                  <div className="h-32 bg-slate-900/50 flex items-center justify-center relative border-b border-slate-700/40">
                    {getFileIcon(file.fileType)}

                    {file.isStarred && (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 absolute top-2 left-2" />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, file, "file");
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* File Details */}
                  <div className="p-3">
                    <p className="text-xs font-medium text-slate-200 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                      <span className="uppercase font-mono">{file.extension || "FILE"}</span>
                      <span>{formatBytes(file.totalSizeBytes)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {folders.length === 0 && files.length === 0 && (
        <div className="py-20 text-center text-slate-500 space-y-2">
          <Folder className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
          <p className="text-sm">This folder is empty</p>
          <p className="text-xs text-slate-600">Drag and drop files here to upload to Telegram MTProto</p>
        </div>
      )}
    </div>
  );
}
