"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import MobileNav from "../../components/layout/MobileNav";
import Footer from "../../components/layout/Footer";
import LoginModal from "../../components/auth/LoginModal";
import FileGrid from "../../components/drive/FileGrid";
import FileList from "../../components/drive/FileList";
import { SelectionBox } from "../../components/common/SelectionBox";
import { ErrorBoundary } from "../../components/common/ErrorBoundary";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { AirShareFile, AirShareFolder } from "../../lib/types";
import { useDriveSelection } from "../../hooks/useDriveSelection";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";

export default function TrashPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [trashFiles, setTrashFiles] = useState<AirShareFile[]>([]);
  const [trashFolders, setTrashFolders] = useState<AirShareFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchTrash = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const data = await api.getTrash();
      setTrashFiles(data.files || []);
      setTrashFolders(data.folders || []);
    } catch (err) {
      console.error("Failed to load trash:", err);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // Combined trash items
  const allTrashItems = [...trashFolders, ...trashFiles];

  // Filtered by search
  const filteredFolders = trashFolders.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredFiles = trashFiles.filter((f) =>
    (f.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredItems = [...filteredFolders, ...filteredFiles];

  // Restore single or multiple items
  const handleRestoreSelected = async (ids?: string[]) => {
    const targetIds = ids || Array.from(selectedIds);
    if (targetIds.length === 0) return;

    for (const id of targetIds) {
      const isFile = trashFiles.some((f) => f.id === id);
      await api.restoreItem(isFile ? "file" : "folder", id);
    }
    fetchTrash();
    setSelectedIds(new Set());
  };

  // Permanently delete single or multiple items
  const handlePermanentDeleteSelected = async (ids?: string[]) => {
    const targetIds = ids || Array.from(selectedIds);
    if (targetIds.length === 0) return;

    const count = targetIds.length;
    if (confirm(`Permanently delete ${count} item${count > 1 ? "s" : ""}? This purges all binary data from Telegram MTProto forever.`)) {
      for (const id of targetIds) {
        const isFile = trashFiles.some((f) => f.id === id);
        await api.permanentDeleteItem(isFile ? "file" : "folder", id);
      }
      fetchTrash();
      setSelectedIds(new Set());
    }
  };

  // Connect full keyboard shortcuts & marquee selection
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
    items: filteredItems,
    onDelete: handlePermanentDeleteSelected,
  });

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-5 h-5 text-rose-400" />
              <div>
                <h2 className="text-slate-100 font-medium text-base">Trash</h2>
                <p className="text-[11px] text-slate-400">
                  Items in trash can be restored or permanently purged.
                </p>
              </div>
            </div>

            {/* Selection actions & counter */}
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 ? (
                <>
                  <span className="text-xs font-medium text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20 font-mono tabular-nums">
                    {selectedIds.size} selected
                  </span>
                  <button
                    onClick={() => handleRestoreSelected()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore ({selectedIds.size})</span>
                  </button>
                  <button
                    onClick={() => handlePermanentDeleteSelected()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Forever</span>
                  </button>
                </>
              ) : allTrashItems.length > 0 ? (
                <button
                  onClick={() => handlePermanentDeleteSelected(allTrashItems.map((i) => i.id))}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 rounded-xl text-xs font-medium transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Empty Trash</span>
                </button>
              ) : null}
            </div>
          </div>

          <ErrorBoundary>
            {loading ? (
              <div className="py-20 text-center text-slate-500 text-xs">Loading trash...</div>
            ) : filteredItems.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Trash2 className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
                <p className="text-sm">Trash is empty</p>
                <p className="text-xs text-slate-600">Select any item and press Delete to move it here</p>
              </div>
            ) : viewMode === "grid" ? (
              <FileGrid
                folders={filteredFolders}
                files={filteredFiles}
                selectedIds={selectedIds}
                onFolderClick={() => {}}
                onFileClick={() => {}}
                onItemSelect={handleItemSelect}
                onContextMenu={(e, item, type) => {
                  e.preventDefault();
                  if (!selectedIds.has(item.id)) setSelectedIds(new Set([item.id]));
                }}
              />
            ) : (
              <FileList
                folders={filteredFolders}
                files={filteredFiles}
                selectedIds={selectedIds}
                onFolderClick={() => {}}
                onFileClick={() => {}}
                onItemSelect={handleItemSelect}
                onContextMenu={(e, item, type) => {
                  e.preventDefault();
                  if (!selectedIds.has(item.id)) setSelectedIds(new Set([item.id]));
                }}
              />
            )}
          </ErrorBoundary>

          <Footer />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
