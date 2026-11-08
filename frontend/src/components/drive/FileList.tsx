"use client";

import React, { useState } from "react";
import { 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  FileCode, 
  FileArchive, 
  MoreVertical, 
  Star,
  ArrowUpDown,
  Music,
  Eye 
} from "lucide-react";
import { AirShareFile, AirShareFolder } from "../../lib/types";

interface FileListProps {
  folders: AirShareFolder[];
  files: AirShareFile[];
  selectedIds?: Set<string>;
  token?: string;
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

export default function FileList({
  folders,
  files,
  selectedIds = new Set(),
  token,
  onFolderClick,
  onFileClick,
  onItemSelect,
  onContextMenu,
}: FileListProps) {
  const [sortField, setSortField] = useState<"name" | "size" | "updated">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const formatBytes = (bytes: number) => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "—";
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getFileIcon = (type: string, ext: string = "") => {
    const e = ext.toLowerCase();
    if (type === "audio" || ["mp3", "wav", "flac", "ogg", "m4a", "aac"].includes(e)) {
      return <Music className="w-4 h-4 text-slate-400" />;
    }
    if (type === "code" || ["json", "html", "htm", "bat", "cmd", "py", "js", "ts", "tsx", "jsx", "css"].includes(e)) {
      return <FileCode className="w-4 h-4 text-slate-400" />;
    }
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4 text-slate-400" />;
      case "video":
        return <Video className="w-4 h-4 text-slate-400" />;
      case "pdf":
      case "office":
        return <FileText className="w-4 h-4 text-slate-400" />;
      default:
        return <FileArchive className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto select-none">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-white/[0.08] text-slate-400 font-medium">
            <th className="py-2 px-3">Name</th>
            <th className="py-2 px-3 hidden sm:table-cell">Type</th>
            <th className="py-2 px-3">Size</th>
            <th className="py-2 px-3 hidden sm:table-cell">Last modified</th>
            <th className="py-2 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {/* Folders */}
          {folders.map((folder) => {
            const isSelected = selectedIds.has(folder.id);
            return (
              <tr
                key={folder.id}
                data-selectable-id={folder.id}
                onClick={(e) => {
                  onItemSelect?.(e, folder, "folder");
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    onFolderClick(folder);
                  }
                }}
                onDoubleClick={() => onFolderClick(folder)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, folder, "folder");
                }}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-sky-500/10 text-sky-200"
                    : "hover:bg-white/[0.03] text-slate-200"
                }`}
              >
                <td className="py-2 px-3 flex items-center gap-2.5 truncate max-w-xs sm:max-w-md">
                  <Folder className="w-4 h-4 text-amber-300 fill-amber-300/20 flex-shrink-0" />
                  <span className="truncate font-medium hover:underline">{folder.name}</span>
                </td>
                <td className="py-2 px-3 text-slate-400 hidden sm:table-cell">Folder</td>
                <td className="py-2 px-3 text-slate-400 font-mono tabular-nums">—</td>
                <td className="py-2 px-3 text-slate-400 font-mono tabular-nums hidden sm:table-cell">
                  {formatDate(folder.updatedAt)}
                </td>
                <td className="py-2 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, folder, "folder");
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}

          {/* Files */}
          {files.map((file) => {
            const isSelected = selectedIds.has(file.id);
            return (
              <tr
                key={file.id}
                data-selectable-id={file.id}
                onClick={(e) => {
                  onItemSelect?.(e, file, "file");
                  if (typeof window !== "undefined" && window.innerWidth < 768) {
                    onFileClick(file);
                  }
                }}
                onDoubleClick={() => onFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, file, "file");
                }}
                className={`group cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-sky-500/10 text-sky-200"
                    : "hover:bg-white/[0.03] text-slate-200"
                }`}
              >
                <td 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileClick(file);
                  }}
                  className="py-2 px-3 flex items-center gap-2.5 truncate max-w-xs sm:max-w-md cursor-pointer"
                >
                  {getFileIcon(file.fileType || "other", file.extension)}
                  <span className="truncate font-medium hover:underline hover:text-sky-300 transition-colors">{file.name}</span>
                  {file.isStarred && (
                    <Star className="w-3 h-3 text-amber-300 fill-amber-300 flex-shrink-0 ml-1" />
                  )}
                </td>
                <td className="py-2 px-3 text-slate-400 uppercase text-[10px] hidden sm:table-cell font-mono">
                  {file.extension || "FILE"}
                </td>
                <td className="py-2 px-3 text-slate-400 font-mono tabular-nums">
                  {formatBytes(file.totalSizeBytes)}
                </td>
                <td className="py-2 px-3 text-slate-400 font-mono tabular-nums hidden sm:table-cell">
                  {formatDate(file.updatedAt)}
                </td>
                <td className="py-2 px-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFileClick(file);
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.06]"
                      title="Preview file"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, file, "file");
                      }}
                      className="p-1 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/[0.06]"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
