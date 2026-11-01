"use client";

import React, { useRef } from "react";
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
  Cloud 
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTransfer } from "../../context/TransferContext";

interface SidebarProps {
  onCreateFolder?: () => void;
  currentFolderId?: string | null;
}

export default function Sidebar({ onCreateFolder, currentFolderId = null }: SidebarProps) {
  const pathname = usePathname();
  const { airshareUser } = useAuth();
  const { addUploads } = useTransfer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { label: "My Drive", href: "/drive", icon: HardDrive },
    { label: "Shared with Me", href: "/shared", icon: Users },
    { label: "Recent", href: "/recent", icon: Clock },
    { label: "Starred", href: "/starred", icon: Star },
    { label: "Trash", href: "/trash", icon: Trash2 },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const usedBytes = airshareUser?.storageUsedBytes || 0;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addUploads(e.target.files, currentFolderId);
      e.target.value = "";
    }
  };

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <Cloud className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-wide">AirShare</h1>
          <p className="text-xs text-blue-400 font-medium">#ShareOnAir v3.0</p>
        </div>
      </div>

      {/* New Action Dropdown / Button */}
      <div className="p-4">
        <div className="relative group">
          <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-blue-600/20 transition duration-200">
            <Plus className="w-5 h-5" />
            <span>New Upload</span>
          </button>

          {/* Action Menu */}
          <div className="hidden group-hover:block group-focus-within:block absolute top-full left-0 w-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 rounded-lg transition"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              Upload Files
            </button>
            <button
              onClick={() => folderInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 rounded-lg transition"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              Upload Folder
            </button>
            <div className="h-px bg-slate-700 my-1" />
            <button
              onClick={onCreateFolder}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 rounded-lg transition"
            >
              <FolderPlus className="w-4 h-4 text-emerald-400" />
              New Folder
            </button>
          </div>
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
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/drive" && pathname.startsWith("/drive"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Storage Indicator */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
            <span>Storage Used</span>
            <span className="text-white font-semibold">{formatBytes(usedBytes)}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-1/3 rounded-full" />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Unlimited Telegram MTProto backend</p>
        </div>
      </div>
    </aside>
  );
}
