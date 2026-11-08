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
import InstallAppButton from "../common/InstallAppButton";

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

  // Close "New" dropdown on click outside
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
    <div className="flex flex-col h-full text-slate-300 select-none bg-[#090d16]">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-slate-900 p-0.5">
            <img src="/logo.png" alt="AirShare" className="w-full h-full object-cover rounded-md" />
          </div>
          <div>
            <h1 className="font-medium text-sm text-slate-100 tracking-tight leading-none">
              AirShare
            </h1>
            <p className="text-[11px] text-slate-400 font-normal leading-tight mt-0.5">Cloud storage</p>
          </div>
        </div>

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* New Action Dropdown / Button (Click only) */}
      <div className="p-3" ref={newMenuRef}>
        <div className="relative">
          <button
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
            className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-white text-slate-950 font-medium text-xs py-2 px-3 rounded-lg border border-slate-200 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>New</span>
          </button>

          {/* Action Menu (Shows ONLY when clicked) */}
          {isNewMenuOpen && (
            <div className="absolute top-full left-0 w-full mt-1.5 bg-slate-900/95 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-xl p-1 z-50">
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06] hover:text-white rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Files Upload</span>
              </button>
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  folderInputRef.current?.click();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06] hover:text-white rounded-md transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-slate-400" />
                <span>Folder Upload</span>
              </button>
              <div className="h-px bg-white/[0.06] my-1" />
              <button
                onClick={() => {
                  setIsNewMenuOpen(false);
                  onCreateFolder?.();
                  onCloseMobile?.();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/[0.06] hover:text-white rounded-md transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-slate-400" />
                <span>Create Folder</span>
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

      {/* Navigation Links */}
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/drive" && pathname.startsWith("/drive"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? "bg-white/[0.08] text-slate-100 border border-white/[0.08]"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* PWA Install App Button */}
      <div className="px-3 py-2 border-t border-white/[0.06]">
        <InstallAppButton className="w-full justify-center" />
      </div>

      {/* Storage Indicator */}
      <div className="p-3 border-t border-white/[0.08]">
        <div className="bg-slate-900/60 rounded-xl p-3 border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Storage used</span>
            <span className="text-slate-200 font-mono text-[11px] tabular-nums">{formatBytes(usedBytes)}</span>
          </div>
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 w-1/4 rounded-full" />
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Unlimited Telegram backend</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-60 bg-[#090d16] border-r border-white/[0.08] flex-col h-screen select-none flex-shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />
          <div className="relative w-64 max-w-[80vw] bg-[#090d16] border-r border-white/10 shadow-2xl h-full flex flex-col z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
