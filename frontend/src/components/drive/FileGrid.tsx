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
  Star,
  Music 
} from "lucide-react";
import { AirShareFile, AirShareFolder } from "../../lib/types";
import { api } from "../../lib/api";

interface FileGridProps {
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

function FileThumbnail({
  file,
  token,
  fallback,
}: {
  file: AirShareFile;
  token?: string;
  fallback: React.ReactNode;
}) {
  const [loaded, setLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const ext = (file.extension || (file.name && file.name.includes(".") ? file.name.split(".").pop() : "") || "").toLowerCase();
  const isImage = file.fileType === "image" || ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"].includes(ext);

  if (!isImage || hasError) {
    return <div className="flex items-center justify-center w-full h-full">{fallback}</div>;
  }

  const streamUrl = api.getStreamUrl(file, token, false);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}
      <img
        src={streamUrl}
        alt={file.name}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {loaded && (
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
      )}
    </div>
  );
}

export default function FileGrid({
  folders,
  files,
  selectedIds = new Set(),
  token,
  onFolderClick,
  onFileClick,
  onItemSelect,
  onContextMenu,
}: FileGridProps) {
  const formatBytes = (bytes: number) => {
    if (!bytes || isNaN(bytes) || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getFileIcon = (type: string, ext: string = "") => {
    const e = ext.toLowerCase();
    if (type === "audio" || ["mp3", "wav", "flac", "ogg", "m4a", "aac"].includes(e)) {
      return <Music className="w-6 h-6 text-slate-400" />;
    }
    if (type === "code" || ["json", "html", "htm", "bat", "cmd", "py", "js", "ts", "tsx", "jsx", "css"].includes(e)) {
      return <FileCode className="w-6 h-6 text-slate-400" />;
    }
    switch (type) {
      case "image":
        return <ImageIcon className="w-6 h-6 text-slate-400" />;
      case "video":
        return <Video className="w-6 h-6 text-slate-400" />;
      case "pdf":
      case "office":
        return <FileText className="w-6 h-6 text-slate-400" />;
      default:
        return <FileArchive className="w-6 h-6 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-slate-400 mb-2.5">
            Folders ({folders.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {folders.map((folder) => {
              const isSelected = selectedIds.has(folder.id);
              return (
                <div
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
                  className={`group relative border rounded-xl p-2.5 flex items-center gap-2.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/30 text-sky-200"
                      : "bg-slate-900/50 hover:bg-slate-800/60 border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <Folder className="w-4 h-4 text-amber-300 fill-amber-300/20 flex-shrink-0" />
                  <span className="text-xs font-medium text-slate-200 truncate flex-1" title={folder.name}>
                    {folder.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onContextMenu(e, folder, "folder");
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded transition-opacity"
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
          <h3 className="text-xs font-medium text-slate-400 mb-2.5">
            Files ({files.length})
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {files.map((file) => {
              const isSelected = selectedIds.has(file.id);
              return (
                <div
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
                  className={`group relative border rounded-xl overflow-hidden cursor-pointer transition-colors flex flex-col ${
                    isSelected
                      ? "bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/30"
                      : "bg-slate-900/50 hover:bg-slate-800/60 border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  {/* Thumbnail / Icon Container (Click to preview directly) */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileClick(file);
                    }}
                    className="h-28 bg-slate-950/60 flex items-center justify-center relative border-b border-white/[0.06] overflow-hidden"
                  >
                    <FileThumbnail
                      file={file}
                      token={token}
                      fallback={getFileIcon(file.fileType || "other", file.extension)}
                    />

                    {file.isStarred && (
                      <div className="absolute top-2 right-2 p-1 rounded-md bg-slate-900/80 backdrop-blur-sm border border-white/10">
                        <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                      </div>
                    )}

                    {!file.telegramFileId && (!file.chunks || file.chunks.length === 0) && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-amber-500/20 backdrop-blur-sm border border-amber-500/30 text-[10px] text-amber-300 font-mono">
                        Incomplete
                      </div>
                    )}
                  </div>

                  {/* Info Footer */}
                  <div className="p-2.5 flex items-center justify-between gap-1.5">
                    <div className="truncate flex-1">
                      <p className="text-xs font-medium text-slate-200 truncate leading-snug" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono tabular-nums leading-none mt-1">
                        {formatBytes(file.totalSizeBytes)}
                      </p>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onContextMenu(e, file, "file");
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded transition-opacity"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
