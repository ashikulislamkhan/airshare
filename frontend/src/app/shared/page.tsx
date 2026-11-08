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
import { Users } from "lucide-react";

export default function SharedPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [sharedFiles, setSharedFiles] = useState<AirShareFile[]>([]);
  const [sharedFolders, setSharedFolders] = useState<AirShareFolder[]>([]);
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

  const fetchShared = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const data = await api.getSharedWithMe();
      setSharedFiles(data.files || []);
      setSharedFolders(data.folders || []);
      const token = await getFirebaseIdToken();
      if (token) setAuthToken(token);
    } catch (err) {
      console.error("Failed to load shared items:", err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchShared();
  }, [fetchShared]);

  // Combined & Filtered items
  const filteredFolders = sharedFolders.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = sharedFiles.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const allFilteredItems = [...filteredFolders, ...filteredFiles];

  const handleDownloadSelected = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const file = sharedFiles.find((f) => f.id === id);
      if (file) {
        const token = await api.getPreviewToken(file.id);
        const url = api.getStreamUrl(file.id, token, true);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
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
    onDownload: handleDownloadSelected,
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 pb-24 md:pb-6">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-slate-100 font-medium text-base">Shared with me</h2>
            </div>
            {selectedIds.size > 0 && (
              <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">
                {selectedIds.size} item{selectedIds.size > 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          <ErrorBoundary>
            {loading ? (
              <div className="py-20 text-center text-slate-500 text-xs">Loading shared items...</div>
            ) : allFilteredItems.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Users className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
                <p className="text-sm">Nothing shared with you yet</p>
                <p className="text-xs text-slate-600">Files and folders shared with your email will appear here</p>
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
          onDownload={handleDownloadSelected}
        />
      )}

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
