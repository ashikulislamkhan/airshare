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
  ArrowUpDown 
} from "lucide-react";
import { AirShareFile, AirShareFolder } from "../../lib/types";

interface FileListProps {
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

export default function FileList({
  folders,
  files,
  selectedIds = new Set(),
  onFolderClick,
  onFileClick,
  onItemSelect,
  onContextMenu,
}: FileListProps) {
  const [sortField, setSortField] = useState<"name" | "size" | "updated">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "—";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
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

  const getFileIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case "video":
        return <Video className="w-4 h-4 text-purple-400" />;
      case "pdf":
        return <FileText className="w-4 h-4 text-rose-400" />;
      case "office":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "text":
        return <FileCode className="w-4 h-4 text-amber-400" />;
      default:
        return <FileArchive className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto select-none">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-slate-800 text-slate-400 font-semibold">
            <th className="py-2.5 px-3">Name</th>
            <th className="py-2.5 px-3">Type</th>
            <th className="py-2.5 px-3">Size</th>
            <th className="py-2.5 px-3">Last Modified</th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {/* Folders */}
          {folders.map((folder) => {
            const isSelected = selectedIds.has(folder.id);
            return (
              <tr
                key={folder.id}
                data-selectable-id={folder.id}
                onClick={(e) => onItemSelect?.(e, folder, "folder")}
                onDoubleClick={() => onFolderClick(folder)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, folder, "folder");
                }}
                className={`cursor-pointer transition group border-b border-slate-800/20 ${
                  isSelected ? "bg-blue-600/30 font-semibold" : "hover:bg-slate-800/50"
                }`}
              >
                <td className="py-2.5 px-3 flex items-center gap-2.5 text-slate-200 font-medium">
                  <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20 flex-shrink-0" />
                  <span className="truncate max-w-sm">{folder.name}</span>
                </td>
                <td className="py-2.5 px-3 text-slate-400">Folder</td>
                <td className="py-2.5 px-3 text-slate-400">—</td>
                <td className="py-2.5 px-3 text-slate-400">{formatDate(folder.updatedAt)}</td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, folder, "folder");
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition"
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
                onClick={(e) => onItemSelect?.(e, file, "file")}
                onDoubleClick={() => onFileClick(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, file, "file");
                }}
                className={`cursor-pointer transition group border-b border-slate-800/20 ${
                  isSelected ? "bg-blue-600/30 font-semibold" : "hover:bg-slate-800/50"
                }`}
              >
                <td className="py-2.5 px-3 flex items-center gap-2.5 text-slate-200 font-medium">
                  {getFileIcon(file.fileType)}
                  <span className="truncate max-w-sm">{file.name}</span>
                  {file.isStarred && <Star className="w-3 h-3 text-amber-400 fill-amber-400" />}
                </td>
                <td className="py-2.5 px-3 text-slate-400 uppercase font-mono">{file.extension || "FILE"}</td>
                <td className="py-2.5 px-3 text-slate-400">{formatBytes(file.totalSizeBytes)}</td>
                <td className="py-2.5 px-3 text-slate-400">{formatDate(file.updatedAt)}</td>
                <td className="py-2.5 px-3 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, file, "file");
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded opacity-0 group-hover:opacity-100 transition"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
