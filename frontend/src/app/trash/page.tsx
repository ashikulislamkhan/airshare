"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import LoginModal from "../../components/auth/LoginModal";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../lib/api";
import { AirShareFile, AirShareFolder } from "../../lib/types";
import { Trash2, RotateCcw, AlertTriangle, Folder, FileText } from "lucide-react";

export default function TrashPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [trashFiles, setTrashFiles] = useState<AirShareFile[]>([]);
  const [trashFolders, setTrashFolders] = useState<AirShareFolder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = async () => {
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
  };

  useEffect(() => {
    fetchTrash();
  }, [firebaseUser]);

  const handleRestore = async (type: "file" | "folder", id: string) => {
    await api.restoreItem(type, id);
    fetchTrash();
  };

  const handlePermanentDelete = async (type: "file" | "folder", id: string) => {
    if (confirm("Are you sure? This permanently purges binary chunks from Telegram Storage.")) {
      await api.permanentDeleteItem(type, id);
      fetchTrash();
    }
  };

  if (authLoading) return null;
  if (!firebaseUser) return <LoginModal />;

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          searchQuery=""
          onSearchChange={() => {}}
          viewMode="list"
          onViewModeToggle={() => {}}
        />

        <main className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-5 h-5 text-red-400" />
              <h2 className="text-white font-semibold text-lg">Trash</h2>
            </div>
            <p className="text-xs text-slate-500">
              Items in trash are automatically purged after 30 days.
            </p>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs">Loading trash...</div>
          ) : trashFiles.length === 0 && trashFolders.length === 0 ? (
            <div className="py-20 text-center text-slate-500 space-y-2">
              <Trash2 className="w-12 h-12 mx-auto stroke-1 text-slate-600" />
              <p className="text-sm">Trash is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {trashFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="py-3 flex items-center justify-between text-xs text-slate-300"
                >
                  <div className="flex items-center gap-3">
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span>{folder.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore("folder", folder.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete("folder", folder.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                    >
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}

              {trashFiles.map((file) => (
                <div
                  key={file.id}
                  className="py-3 flex items-center justify-between text-xs text-slate-300"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-blue-400" />
                    <span>{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore("file", file.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                      Restore
                    </button>
                    <button
                      onClick={() => handlePermanentDelete("file", file.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                    >
                      Delete Forever
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
