"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HardDrive, 
  Users, 
  Star, 
  Plus, 
  Clock, 
  Upload, 
  FolderPlus, 
  X 
} from "lucide-react";
import { useTransfer } from "../../context/TransferContext";

interface MobileNavProps {
  currentFolderId?: string | null;
  onCreateFolder?: () => void;
}

export default function MobileNav({ currentFolderId = null, onCreateFolder }: MobileNavProps) {
  const pathname = usePathname();
  const { addUploads } = useTransfer();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addUploads(e.target.files, currentFolderId);
      e.target.value = "";
      setIsMenuOpen(false);
    }
  };

  const navItems = [
    { label: "Drive", href: "/drive", icon: HardDrive },
    { label: "Shared", href: "/shared", icon: Users },
    { label: "Recent", href: "/recent", icon: Clock },
    { label: "Starred", href: "/starred", icon: Star },
  ];

  return (
    <>
      {/* Hidden file & folder inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleFileChange}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />

      {/* Mobile + Action Bottom Sheet */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Action Card */}
          <div className="relative bg-slate-900/95 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl p-5 shadow-2xl z-10 space-y-3 pb-8 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <span className="text-sm font-semibold text-white tracking-wide">Create or Upload</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/[0.05]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] active:bg-cyan-500/20 text-slate-200 rounded-2xl border border-white/[0.06] transition text-sm font-medium"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                  <Upload className="w-5 h-5" />
                </div>
                <span>Files Upload</span>
              </button>

              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] active:bg-blue-500/20 text-slate-200 rounded-2xl border border-white/[0.06] transition text-sm font-medium"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Upload className="w-5 h-5" />
                </div>
                <span>Folder Upload</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onCreateFolder?.();
                }}
                className="flex items-center gap-3 px-4 py-3 bg-white/[0.04] hover:bg-white/[0.08] active:bg-emerald-500/20 text-slate-200 rounded-2xl border border-white/[0.06] transition text-sm font-medium"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <span>Create Folder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Quick Access Snackbar (Slightly larger, Trash removed, + in middle) */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-20 bg-slate-950/85 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around z-40 px-3 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
        {/* Left Side: Drive, Shared */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/drive" && pathname.startsWith("/drive"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition ${
                isActive ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5.5 h-5.5 mb-1" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}

        {/* Center Floating "+" Button */}
        <div className="flex flex-col items-center justify-center -translate-y-4 px-3 flex-shrink-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xl shadow-cyan-500/35 border-2 border-white/30 active:scale-95 transition"
            title="+ New"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* Right Side: Recent, Starred */}
        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 transition ${
                isActive ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-5.5 h-5.5 mb-1" />
              <span className="text-[11px] tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
