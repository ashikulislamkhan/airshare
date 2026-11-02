"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import MobileNav from "../../components/layout/MobileNav";
import LoginModal from "../../components/auth/LoginModal";
import FileGrid from "../../components/drive/FileGrid";
import FileList from "../../components/drive/FileList";
import PreviewModal from "../../components/preview/PreviewModal";
import ContextMenu from "../../components/drive/ContextMenu";
import { SelectionBox } from "../../components/common/SelectionBox";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { AirShareFile } from "../../lib/types";
import { getFirebaseIdToken } from "../../lib/firebase";
import { useDriveSelection } from "../../hooks/useDriveSelection";
import { Clock } from "lucide-react";

export default function RecentPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<AirShareFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewFile, setPreviewFile] = useState<AirShareFile | null>(null);
  const [authToken, setAuthToken] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target?: AirShareFile;
    selectedCount: number;
  } | null>(null);

  const fetchRecent = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const recent = await api.getRecentFiles();
      setFiles(recent);
      const token = await getFirebaseIdToken();
      if (token) setAuthToken(token);
    } catch (err) {
      console.error("Failed to load recent files:", err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchRecent();
  }, [fetchRecent]);

  // Filter files by search
  const filteredFiles = files.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteItems = async (ids: string[]) => {
    for (const id of ids) {
      await api.trashFile(id);
    }
    fetchRecent();
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
    items: filteredFiles,
    onDelete: handleDeleteItems,
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
      target: target as AirShareFile,
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
      className="flex h-screen w-screen bg-[#060b18] overflow-hidden relative select-none"
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-24 md:pb-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h2 className="text-white font-semibold text-lg">Recent Files</h2>
            </div>
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
                {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          <ErrorBoundary>
            {loading ? (
              <div className="py-20 text-center text-slate-500 text-xs">Loading recent files...</div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Clock className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : viewMode === "grid" ? (
              <FileGrid
                folders={[]}
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
                folders={[]}
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
        </main>
      </div>

      <MobileNav />

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          targetType="file"
          selectedCount={contextMenu.selectedCount}
          onClose={() => setContextMenu(null)}
          onPreview={
            contextMenu.selectedCount === 1
              ? () => setPreviewFile(contextMenu.target as AirShareFile)
              : undefined
          }
          onTrash={() => handleDeleteItems(Array.from(selectedIds))}
        />
      )}

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
