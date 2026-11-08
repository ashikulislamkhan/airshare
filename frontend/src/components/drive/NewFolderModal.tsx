"use client";

import React, { useState } from "react";
import { FolderPlus, X } from "lucide-react";

interface NewFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function NewFolderModal({ isOpen, onClose, onCreate }: NewFolderModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name.trim());
      setName("");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-white/[0.08] rounded-xl w-full max-w-sm p-4 shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-slate-400" />
            <h3 className="text-slate-100 font-medium text-xs">New folder</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Folder name"
            className="w-full bg-slate-950 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/20 transition-colors"
          />

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-white text-slate-950 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? "Creating..." : "Create folder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
