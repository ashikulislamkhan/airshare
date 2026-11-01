"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import Breadcrumbs from "../../components/drive/Breadcrumbs";
import FileGrid from "../../components/drive/FileGrid";
import FileList from "../../components/drive/FileList";
import NewFolderModal from "../../components/drive/NewFolderModal";
import ContextMenu from "../../components/drive/ContextMenu";
import PreviewModal from "../../components/preview/PreviewModal";
import ShareDialog from "../../components/drive/ShareDialog";
import LoginModal from "../../components/auth/LoginModal";

import { useAuth } from "../../context/AuthContext";
import { useTransfer } from "../../context/TransferContext";
import { api } from "../../lib/api";
import { AirShareFile, AirShareFolder } from "../../lib/types";
import { getFirebaseIdToken } from "../../lib/firebase";
import { 
  RefreshCw, 
  ArrowUpDown, 
  Check, 
  ChevronDown,
  Image as ImageIcon,
  Video,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileArchive,
  FileCode
} from "lucide-react";

type FilterCategory = 
  | "all" 
  | "photos" 
  | "videos" 
  | "documents" 
  | "spreadsheets" 
  | "presentations" 
  | "compressed" 
  | "others";

const FILTER_CATEGORIES: { id: FilterCategory; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: null },
  { id: "photos", label: "Photos", icon: <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: "videos", label: "Videos", icon: <Video className="w-3.5 h-3.5 text-purple-400" /> },
  { id: "documents", label: "Documents", icon: <FileText className="w-3.5 h-3.5 text-rose-400" /> },
  { id: "spreadsheets", label: "Spreadsheets", icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: "presentations", label: "Presentations", icon: <Presentation className="w-3.5 h-3.5 text-amber-400" /> },
  { id: "compressed", label: "Compressed", icon: <FileArchive className="w-3.5 h-3.5 text-amber-300" /> },
  { id: "others", label: "Others", icon: <FileCode className="w-3.5 h-3.5 text-cyan-400" /> },
];

type SortOption = 
  | "modified_desc" 
  | "modified_asc" 
  | "name_asc" 
  | "name_desc" 
  | "size_desc" 
  | "size_asc" 
  | "type_asc";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: "modified_desc", label: "Last modified (Newest)" },
  { id: "modified_asc", label: "Last modified (Oldest)" },
  { id: "name_asc", label: "Name (A to Z)" },
  { id: "name_desc", label: "Name (Z to A)" },
  { id: "size_desc", label: "Size (Largest)" },
  { id: "size_asc", label: "Size (Smallest)" },
  { id: "type_asc", label: "Type (Extension)" },
];

export default function DrivePage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { addUploads } = useTransfer();

  // Navigation State
  const [currentFolder, setCurrentFolder] = useState<AirShareFolder | null>(null);
  const [folders, setFolders] = useState<AirShareFolder[]>([]);
  const [files, setFiles] = useState<AirShareFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection & Clipboard State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ action: "copy"; ids: string[] } | null>(null);

  // Marquee Selection Box State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // View & Search State
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Modals & Context Menus
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<AirShareFile | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    target: AirShareFile | AirShareFolder;
    type: "file" | "folder";
  } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target?: AirShareFile | AirShareFolder;
    type?: "file" | "folder";
    selectedCount: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  // Sorting & Filtering State
  const [authToken, setAuthToken] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>("modified_desc");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");

  // Close sort menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Firebase token for outside thumbnails
  useEffect(() => {
    if (firebaseUser) {
      getFirebaseIdToken().then((t) => {
        if (t) setAuthToken(t);
      });
    }
  }, [firebaseUser]);

  // Fetch folders and files
  const refreshContent = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const folderId = currentFolder?.id || null;
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        api.listFolders(folderId),
        api.listFiles(folderId),
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to load drive items:", err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, currentFolder]);

  // Auto-refresh when an upload completes
  useEffect(() => {
    const handleUploadComplete = () => {
      refreshContent();
    };
    window.addEventListener("airshare:upload-complete", handleUploadComplete);
    return () => window.removeEventListener("airshare:upload-complete", handleUploadComplete);
  }, [refreshContent]);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshContent();
    const t = await getFirebaseIdToken();
    if (t) setAuthToken(t);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const matchFilter = (file: AirShareFile, category: FilterCategory): boolean => {
    if (category === "all") return true;
    const ext = (file.extension || file.name.split(".").pop() || "").toLowerCase();
    const mime = (file.mimeType || "").toLowerCase();

    switch (category) {
      case "photos":
        return ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "avif"].includes(ext) || mime.startsWith("image/");
      case "videos":
        return ["mp4", "mkv", "mov", "avi", "webm", "flv", "wmv", "m4v"].includes(ext) || mime.startsWith("video/");
      case "documents":
        return ["pdf", "doc", "docx", "txt", "rtf", "odt", "pages", "md"].includes(ext) || mime.includes("pdf");
      case "spreadsheets":
        return ["xls", "xlsx", "csv", "numbers", "ods"].includes(ext);
      case "presentations":
        return ["ppt", "pptx", "key", "odp"].includes(ext);
      case "compressed":
        return ["zip", "rar", "7z", "tar", "gz", "bz2", "tgz", "iso"].includes(ext);
      case "others":
        return !matchFilter(file, "photos") &&
               !matchFilter(file, "videos") &&
               !matchFilter(file, "documents") &&
               !matchFilter(file, "spreadsheets") &&
               !matchFilter(file, "presentations") &&
               !matchFilter(file, "compressed");
      default:
        return true;
    }
  };

  const sortItems = <T extends AirShareFile | AirShareFolder>(items: T[], sortOpt: SortOption): T[] => {
    return [...items].sort((a, b) => {
      switch (sortOpt) {
        case "name_asc":
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        case "name_desc":
          return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
        case "modified_desc":
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        case "modified_asc":
          return (a.updatedAt || 0) - (b.updatedAt || 0);
        case "size_desc": {
          const sizeA = "totalSizeBytes" in a ? (a as AirShareFile).totalSizeBytes : 0;
          const sizeB = "totalSizeBytes" in b ? (b as AirShareFile).totalSizeBytes : 0;
          return sizeB - sizeA;
        }
        case "size_asc": {
          const sizeA = "totalSizeBytes" in a ? (a as AirShareFile).totalSizeBytes : 0;
          const sizeB = "totalSizeBytes" in b ? (b as AirShareFile).totalSizeBytes : 0;
          return sizeA - sizeB;
        }
        case "type_asc": {
          const extA = "extension" in a ? (a as AirShareFile).extension || "" : "";
          const extB = "extension" in b ? (b as AirShareFile).extension || "" : "";
          return extA.localeCompare(extB);
        }
        default:
          return 0;
      }
    });
  };

  // Filter & Sort items
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.fileType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = matchFilter(f, activeFilter);
    return matchesSearch && matchesCategory;
  });

  const sortedFolders = sortItems(filteredFolders, sortOption);
  const sortedFiles = sortItems(filteredFiles, sortOption);

  // Item Click Selection
  const handleItemSelect = (
    e: React.MouseEvent,
    target: AirShareFile | AirShareFolder,
    type: "file" | "folder"
  ) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      // Toggle individual selection
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(target.id)) next.delete(target.id);
        else next.add(target.id);
        return next;
      });
    } else {
      setSelectedIds(new Set([target.id]));
    }
  };

  // Context Menu Handler
  const handleContextMenu = (
    e: React.MouseEvent,
    target: AirShareFile | AirShareFolder,
    type: "file" | "folder"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // If right-clicked item is not already in selectedIds, select only it
    let currentSelected = selectedIds;
    if (!selectedIds.has(target.id)) {
      currentSelected = new Set([target.id]);
      setSelectedIds(currentSelected);
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target,
      type,
      selectedCount: currentSelected.size,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Marquee Selection Box (Click, hold, and drag mouse)
  // ─────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only trigger box selection on left mouse button and not on interactive cards
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-selectable-id]") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("aside") ||
      target.closest("header")
    ) {
      return;
    }

    setContextMenu(null);
    if (!e.ctrlKey && !e.metaKey) {
      setSelectedIds(new Set());
    }

    setIsSelecting(true);
    setSelectionBox({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

    const left = Math.min(selectionBox.startX, currentX);
    const top = Math.min(selectionBox.startY, currentY);
    const right = Math.max(selectionBox.startX, currentX);
    const bottom = Math.max(selectionBox.startY, currentY);

    // Compute intersecting cards
    const selectableElements = document.querySelectorAll("[data-selectable-id]");
    const intersecting = new Set<string>();

    selectableElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const hits = !(
        rect.right < left ||
        rect.left > right ||
        rect.bottom < top ||
        rect.top > bottom
      );
      if (hits) {
        const id = el.getAttribute("data-selectable-id");
        if (id) intersecting.add(id);
      }
    });

    setSelectedIds(intersecting);
  };

  const handleMouseUp = () => {
    setIsSelecting(false);
    setSelectionBox(null);
  };

  // ─────────────────────────────────────────────────────────────
  // Keyboard Shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Delete, Escape)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + A: Select All
      if (isCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allIds = new Set<string>([
          ...filteredFolders.map((f) => f.id),
          ...filteredFiles.map((f) => f.id),
        ]);
        setSelectedIds(allIds);
      }

      // Ctrl + C: Copy Selected
      if (isCtrl && e.key.toLowerCase() === "c") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          setClipboard({ action: "copy", ids: Array.from(selectedIds) });
        }
      }

      // Ctrl + V: Paste Items to Current Folder
      if (isCtrl && e.key.toLowerCase() === "v") {
        if (clipboard && clipboard.ids.length > 0) {
          e.preventDefault();
          const targetFolderId = currentFolder?.id || null;
          for (const id of clipboard.ids) {
            const isFile = files.some((f) => f.id === id);
            if (isFile) {
              await api.updateFile(id, { folderId: targetFolderId });
            } else {
              await api.updateFolder(id, { parentFolderId: targetFolderId });
            }
          }
          refreshContent();
        }
      }

      // Delete / Backspace: Move Selected to Trash
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          for (const id of Array.from(selectedIds)) {
            const isFile = files.some((f) => f.id === id);
            if (isFile) await api.trashFile(id);
            else await api.trashFolder(id);
          }
          refreshContent();
        }
      }

      // Escape: Clear Selection & Context Menu
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setContextMenu(null);
        setSelectionBox(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredFolders, filteredFiles, selectedIds, clipboard, currentFolder, files, refreshContent]);

  // ─────────────────────────────────────────────────────────────
  // Multi-Item Download Logic (Files one-by-one, Folders as .zip)
  // ─────────────────────────────────────────────────────────────
  const handleDownloadSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 && contextMenu?.target) {
      ids.push(contextMenu.target.id);
    }

    const itemsToDownload = [
      ...folders.filter((f) => ids.includes(f.id)).map((f) => ({ item: f, type: "folder" as const })),
      ...files.filter((f) => ids.includes(f.id)).map((f) => ({ item: f, type: "file" as const })),
    ];

    itemsToDownload.forEach((entry, index) => {
      setTimeout(async () => {
        try {
          if (entry.type === "file") {
            const fileItem = entry.item as AirShareFile;
            const token = await api.getPreviewToken(fileItem.id);
            const url = api.getStreamUrl(fileItem.id, token, true);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileItem.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          } else {
            // Folder -> Transforms into .zip and downloads
            const folderItem = entry.item as AirShareFolder;
            const token = await api.getFolderPreviewToken(folderItem.id);
            const url = api.getFolderZipUrl(folderItem.id, token);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${folderItem.name}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
        } catch (err) {
          console.error("Download failed for item:", err);
        }
      }, index * 300);
    });
  };

  const handleStarSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 && contextMenu?.target) ids.push(contextMenu.target.id);

    for (const id of ids) {
      const isFile = files.some((f) => f.id === id);
      if (isFile) {
        const item = files.find((f) => f.id === id);
        await api.updateFile(id, { isStarred: !item?.isStarred });
      } else {
        const item = folders.find((f) => f.id === id);
        await api.updateFolder(id, { isStarred: !item?.isStarred });
      }
    }
    refreshContent();
  };

  const handleTrashSelected = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 && contextMenu?.target) ids.push(contextMenu.target.id);

    for (const id of ids) {
      const isFile = files.some((f) => f.id === id);
      if (isFile) await api.trashFile(id);
      else await api.trashFolder(id);
    }
    refreshContent();
  };

  // Drag & Drop Ingestion
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addUploads(e.dataTransfer.files, currentFolder?.id || null);
    }
  };

  const handleCreateFolder = async (name: string) => {
    await api.createFolder(name, currentFolder?.id || null);
    refreshContent();
  };

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
        Authenticating with Google Identity...
      </div>
    );
  }

  if (!firebaseUser) {
    return <LoginModal />;
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex h-screen w-screen bg-slate-950 overflow-hidden relative select-none"
    >
      {/* Marquee Drag Selection Box */}
      {selectionBox && (
        <div
          style={{
            left: Math.min(selectionBox.startX, selectionBox.currentX),
            top: Math.min(selectionBox.startY, selectionBox.currentY),
            width: Math.abs(selectionBox.currentX - selectionBox.startX),
            height: Math.abs(selectionBox.currentY - selectionBox.startY),
          }}
          className="fixed pointer-events-none bg-blue-500/20 border border-blue-400/80 rounded z-40"
        />
      )}

      {/* Drag & Drop Visual Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-2xl m-4 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl text-center space-y-2">
            <p className="text-white font-semibold text-base">Drop files here to upload</p>
            <p className="text-xs text-blue-400">Streams directly to Telegram MTProto storage channels</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        onCreateFolder={() => setIsNewFolderOpen(true)}
        currentFolderId={currentFolder?.id || null}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeToggle={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
        />

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Action Toolbar: Breadcrumbs, Refresh, Sort, and Selection Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Breadcrumbs
                currentFolder={currentFolder}
                onNavigateHome={() => setCurrentFolder(null)}
              />
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 text-xs font-semibold transition active:scale-95 shadow-sm"
                title="Refresh folder content"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/30">
                  {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
                </span>
              )}

              {/* Sort Selector Dropdown */}
              <div className="relative" ref={sortMenuRef}>
                <button
                  onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 text-xs font-medium transition shadow-sm"
                  title="Change sort order"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <span>{SORT_OPTIONS.find((s) => s.id === sortOption)?.label || "Sort"}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </button>

                {isSortMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-40 flex flex-col gap-0.5">
                    <div className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Sort By
                    </div>
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setSortOption(opt.id);
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                          sortOption === opt.id
                            ? "bg-blue-600 text-white font-medium"
                            : "text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {sortOption === opt.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filter Pills Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {FILTER_CATEGORIES.map((cat) => {
              const count =
                cat.id === "all" ? files.length : files.filter((f) => matchFilter(f, cat.id)).length;
              const isActive = activeFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition active:scale-95 ${
                    isActive
                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-700/60 text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Drive Grid or List View */}
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              Loading drive items...
            </div>
          ) : viewMode === "grid" ? (
            <FileGrid
              folders={activeFilter === "all" ? sortedFolders : []}
              files={sortedFiles}
              selectedIds={selectedIds}
              token={authToken}
              onFolderClick={(folder) => setCurrentFolder(folder)}
              onFileClick={(file) => setPreviewFile(file)}
              onItemSelect={handleItemSelect}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <FileList
              folders={activeFilter === "all" ? sortedFolders : []}
              files={sortedFiles}
              selectedIds={selectedIds}
              token={authToken}
              onFolderClick={(folder) => setCurrentFolder(folder)}
              onFileClick={(file) => setPreviewFile(file)}
              onItemSelect={handleItemSelect}
              onContextMenu={handleContextMenu}
            />
          )}
        </main>
      </div>

      {/* New Folder Modal */}
      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      {/* Context Menu (Single or Multi-item) */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          targetType={contextMenu.type}
          selectedCount={contextMenu.selectedCount}
          onClose={() => setContextMenu(null)}
          onPreview={
            contextMenu.selectedCount === 1 && contextMenu.type === "file"
              ? () => setPreviewFile(contextMenu.target as AirShareFile)
              : undefined
          }
          onDownload={handleDownloadSelected}
          onShare={
            contextMenu.selectedCount === 1 && contextMenu.target
              ? () => setShareTarget({ target: contextMenu.target!, type: contextMenu.type! })
              : undefined
          }
          onStar={handleStarSelected}
          onTrash={handleTrashSelected}
        />
      )}

      {/* Preview Modal */}
      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Share Dialog */}
      {shareTarget && (
        <ShareDialog
          target={shareTarget.target}
          targetType={shareTarget.type}
          onClose={() => setShareTarget(null)}
        />
      )}
    </div>
  );
}
