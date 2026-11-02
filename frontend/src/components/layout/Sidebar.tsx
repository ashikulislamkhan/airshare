"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HardDrive, 
  Users, 
  Clock, 
  Star, 
  Trash2, 
  Settings, 
  Plus, 
  FolderPlus, 
  Upload, 
  X 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTransfer } from "../../context/TransferContext";

interface SidebarProps {
  onCreateFolder?: () => void;
  currentFolderId?: string | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  onCreateFolder,
  currentFolderId = null,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const { airshareUser } = useAuth();
  const { addUploads } = useTransfer();
  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  // Close "+ New" dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setIsNewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { label: "My Drive", href: "/drive", icon: HardDrive },
    { label: "Shared with Me", href: "/shared", icon: Users },
    { label: "Recent", href: "/recent", icon: Clock },
    { label: "Starred", href: "/starred", icon: Star },
    { label: "Trash", href: "/trash", icon: Trash2 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const usedBytes = airshareUser?.storageUsedBytes || 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addUploads(e.target.files, currentFolderId);
      e.target.value = "";
      onCloseMobile?.();
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 border border-white/10 flex-shrink-0 bg-slate-900">
            <img src="/logo.png" alt="AirShare" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-1.5">
              AirShare
            </h1>
            <p className="text-[10px] text-cyan-400 font-mono font-medium">#ShareOnAir v3.0</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* New Action Dropdown / Button (Liquid Glass, Click only - NOT ON HOVER) */}
      <div className="p-4" ref={newMenuRef}>
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold py-3 px-4 rounded-2xl shadow-lg shadow-cyan-500/25 border border-white/20 active:scale-95 transition duration-200"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>+ New</span>
          </button>

          {/* Action Menu (Shows ONLY when isNewMenuOpen is true) */}
          {isNewMenuOpen && (
            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl transition"
              >
                <Upload className="w-4 h-4 text-cyan-400" />
                Files Upload
              </button>
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  folderInputRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl transition"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Folder Upload
              </button>
              <div className="h-px bg-white/10 my-1" />
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  onCreateFolder?.();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 rounded-xl transition"
              >
                <FolderPlus className="w-4 h-4 text-emerald-400" />
                Create Folder
              </button>
            </div>
          )}
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Navigation Links (Liquid Glass Aesthetic) */}
      <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/drive" && pathname.startsWith("/drive"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-gradient-to-r from-cyan-500/20 to-blue-600/10 text-cyan-300 border border-cyan-400/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] font-semibold"
                  : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Storage Indicator (Frosted Liquid Glass Card) */}
      <div className="p-4 border-t border-white/[0.08]">
        <div className="bg-slate-900/40 backdrop-blur-xl rounded-2xl p-3.5 border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.25)]">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Storage Used</span>
            <span className="text-white font-semibold">{formatBytes(usedBytes)}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 w-1/3 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Unlimited Telegram MTProto backend</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex md:w-64 bg-slate-950/60 backdrop-blur-2xl border-r border-white/[0.08] flex-col h-screen text-slate-300 select-none flex-shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible only when isMobileOpen is true) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />
          {/* Slide-out drawer */}
          <div className="relative w-72 max-w-[80vw] bg-slate-950/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl h-full flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
