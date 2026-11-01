"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import LoginModal from "../../components/auth/LoginModal";
import FileGrid from "../../components/drive/FileGrid";
import PreviewModal from "../../components/preview/PreviewModal";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { AirShareFile, AirShareFolder } from "../../lib/types";
import { Star } from "lucide-react";

export default function StarredPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [files, setFiles] = useState<AirShareFile[]>([]);
  const [previewFile, setPreviewFile] = useState<AirShareFile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    setLoading(true);
    api.listFiles(null, true)
      .then((f) => setFiles(f))
      .catch((err) => console.error("Failed to load starred files:", err))
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  if (authLoading) return null;
  if (!firebaseUser) return <LoginModal />;

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          searchQuery=""
          onSearchChange={() => {}}
          viewMode="grid"
          onViewModeToggle={() => {}}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h2 className="text-white font-semibold text-lg">Starred Items</h2>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs">Loading starred items...</div>
          ) : (
            <FileGrid
              folders={[]}
              files={files}
              onFolderClick={() => {}}
              onFileClick={(f) => setPreviewFile(f)}
              onContextMenu={() => {}}
            />
          )}
        </main>
      </div>

      <PreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
