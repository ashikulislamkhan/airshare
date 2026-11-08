"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import MobileNav from "../../components/layout/MobileNav";
import Footer from "../../components/layout/Footer";
import LoginModal from "../../components/auth/LoginModal";
import FileGrid from "../../components/drive/FileGrid";
import FileList from "../../components/drive/FileList";
import PreviewModal from "../../components/preview/PreviewModal";
import ContextMenu from "../../components/drive/ContextMenu";
import { SelectionBox } from "../../components/common/SelectionBox";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { AirShareFile, AirShareFolder } from "../../lib/types";
import { getFirebaseIdToken } from "../../lib/firebase";
import { useDriveSelection } from "../../hooks/useDriveSelection";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../../components/common/PullToRefreshIndicator";
import { Star } from "lucide-react";

export default function StarredPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<AirShareFile[]>([]);
  const [folders, setFolders] = useState<AirShareFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewFile, setPreviewFile] = useState<AirShareFile | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target?: AirShareFile | AirShareFolder;
    type?: "file" | "folder";
    selectedCount: number;
  } | null>(null);

  const fetchStarred = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const [starredFiles, allFolders] = await Promise.all([
        api.listFiles(null, true),
        api.listFolders(null),
      ]);
      setFiles(starredFiles);
      setFolders(allFolders.filter((f) => f.isStarred));
      const token = await getFirebaseIdToken();
      if (token) setAuthToken(token);
    } catch (err) {
      console.error("Failed to load starred items:", err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchStarred();
  }, [fetchStarred]);

  const {
    containerRef: pullContainerRef,
    pullDistance,
    isRefreshing: isPullRefreshing,
    isReady: isPullReady,
  } = usePullToRefresh({
    onRefresh: fetchStarred,
  });


  // Combined & Filtered items
  const filteredFolders = folders.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = files.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const allFilteredItems = [...filteredFolders, ...filteredFiles];

  const handleUnstarSelected = async (ids?: string[]) => {
    const targetIds = ids || Array.from(selectedIds);
    for (const id of targetIds) {
      const isFile = files.some((f) => f.id === id);
      if (isFile) await api.updateFile(id, { isStarred: false });
      else await api.updateFolder(id, { isStarred: false });
    }
    fetchStarred();
    setSelectedIds(new Set());
  };

  const handleTrashSelected = async (ids?: string[]) => {
    const targetIds = ids || Array.from(selectedIds);
    for (const id of targetIds) {
      const isFile = files.some((f) => f.id === id);
      if (isFile) await api.trashFile(id);
      else await api.trashFolder(id);
    }
    fetchStarred();
    setSelectedIds(new Set());
  };

  const {
    selectedIds,
    setSelectedIds,
    selectionBox,
    containerRef,
    handleItemSelect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useDriveSelection({
    items: allFilteredItems,
    onDelete: handleTrashSelected,
  });

  const handleContextMenu = (
    e: React.MouseEvent,
    target: any,
    type: "file" | "folder"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    let current = selectedIds;
    if (!selectedIds.has(target.id)) {
      current = new Set([target.id]);
      setSelectedIds(current);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target,
      type,
      selectedCount: current.size,
    });
  };

  if (authLoading) return null;
  if (!firebaseUser) return <LoginModal />;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="flex h-screen w-screen bg-[#090d16] overflow-hidden relative select-none"
    >
      <SelectionBox selectionBox={selectionBox} />

      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeToggle={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main
          ref={pullContainerRef as any}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-24 md:pb-6"
        >
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            isRefreshing={isPullRefreshing}
            isReady={isPullReady}
          />
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <h2 className="text-slate-100 font-medium text-base">Starred items</h2>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 font-mono tabular-nums">
                  {selectedIds.size} selected
                </span>
                <button
                  onClick={() => handleUnstarSelected()}
                  className="px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 rounded-xl text-xs font-semibold border border-white/10 transition active:scale-95"
                >
                  Unstar
                </button>
              </div>
            )}
          </div>

          <ErrorBoundary>
            {loading ? (
              <div className="py-20 text-center text-slate-500 text-xs">Loading starred items...</div>
            ) : allFilteredItems.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Star className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
                <p className="text-sm">No starred items yet</p>
                <p className="text-xs text-slate-600">Right click or tap star on any file to quickly access it here</p>
              </div>
            ) : viewMode === "grid" ? (
              <FileGrid
                folders={filteredFolders}
                files={filteredFiles}
                selectedIds={selectedIds}
                token={authToken}
                onFolderClick={() => {}}
                onFileClick={(f) => setPreviewFile(f)}
                onItemSelect={handleItemSelect}
                onContextMenu={handleContextMenu}
              />
            ) : (
              <FileList
                folders={filteredFolders}
                files={filteredFiles}
                selectedIds={selectedIds}
                token={authToken}
                onFolderClick={() => {}}
                onFileClick={(f) => setPreviewFile(f)}
                onItemSelect={handleItemSelect}
                onContextMenu={handleContextMenu}
              />
            )}
          </ErrorBoundary>

          <Footer />
        </main>
      </div>

      <MobileNav />

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
          onStar={() => handleUnstarSelected()}
          onTrash={() => handleTrashSelected()}
        />
      )}

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
