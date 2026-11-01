"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    target: AirShareFile | AirShareFolder;
    type: "file" | "folder";
  } | null>(null);

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
    } catch (err) {
      console.error("Failed to load drive items:", err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, currentFolder]);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  // Context Menu Handler
  const handleContextMenu = (
    e: React.MouseEvent,
    target: AirShareFile | AirShareFolder,
    type: "file" | "folder"
  ) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target,
      type,
    });
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

  // Actions
  const handleCreateFolder = async (name: string) => {
    await api.createFolder(name, currentFolder?.id || null);
    refreshContent();
  };

  const handleTrashItem = async () => {
    if (!contextMenu) return;
    if (contextMenu.type === "file") {
      await api.trashFile(contextMenu.target.id);
    } else {
      await api.trashFolder(contextMenu.target.id);
    }
    refreshContent();
  };

  const handleStarItem = async () => {
    if (!contextMenu) return;
    const isStarred = !contextMenu.target.isStarred;
    if (contextMenu.type === "file") {
      await api.updateFile(contextMenu.target.id, { isStarred });
    } else {
      await api.updateFolder(contextMenu.target.id, { isStarred });
    }
    refreshContent();
  };

  // Filter items by search query
  const filteredFolders = folders.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.extension.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.fileType.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      onClick={() => setContextMenu(null)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex h-screen w-screen bg-slate-950 overflow-hidden relative"
    >
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
          {/* Breadcrumbs */}
          <Breadcrumbs
            currentFolder={currentFolder}
            onNavigateHome={() => setCurrentFolder(null)}
          />

          {/* Drive Grid or List View */}
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs">
              Loading drive items...
            </div>
          ) : viewMode === "grid" ? (
            <FileGrid
              folders={filteredFolders}
              files={filteredFiles}
              onFolderClick={(folder) => setCurrentFolder(folder)}
              onFileClick={(file) => setPreviewFile(file)}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <FileList
              folders={filteredFolders}
              files={filteredFiles}
              onFolderClick={(folder) => setCurrentFolder(folder)}
              onFileClick={(file) => setPreviewFile(file)}
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

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          targetType={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onPreview={
            contextMenu.type === "file"
              ? () => setPreviewFile(contextMenu.target as AirShareFile)
              : undefined
          }
          onDownload={
            contextMenu.type === "file"
              ? () => window.open(api.getStreamUrl(contextMenu.target.id, undefined, true), "_blank")
              : undefined
          }
          onShare={() => setShareTarget({ target: contextMenu.target, type: contextMenu.type })}
          onStar={handleStarItem}
          onTrash={handleTrashItem}
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
