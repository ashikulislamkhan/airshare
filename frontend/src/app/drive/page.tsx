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

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  // Filter items by search query
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.fileType.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {/* Breadcrumbs & Selection Count */}
          <div className="flex items-center justify-between">
            <Breadcrumbs
              currentFolder={currentFolder}
              onNavigateHome={() => setCurrentFolder(null)}
            />
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/30">
                {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          {/* Drive Grid or List View */}
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              Loading drive items...
            </div>
          ) : viewMode === "grid" ? (
            <FileGrid
              folders={filteredFolders}
              files={filteredFiles}
              selectedIds={selectedIds}
              onFolderClick={(folder) => setCurrentFolder(folder)}
              onFileClick={(file) => setPreviewFile(file)}
              onItemSelect={handleItemSelect}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <FileList
              folders={filteredFolders}
              files={filteredFiles}
              selectedIds={selectedIds}
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
