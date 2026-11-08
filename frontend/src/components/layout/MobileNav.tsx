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

      {/* Mobile Action Bottom Sheet */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <div
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div className="relative bg-slate-900 border-t border-white/[0.08] rounded-t-2xl p-4 shadow-2xl z-10 space-y-2 pb-8">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-medium text-slate-200">New</span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-1.5 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 rounded-xl border border-white/[0.06] transition-colors text-xs font-medium"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <Upload className="w-4 h-4" />
                </div>
                <span>Files Upload</span>
              </button>

              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 rounded-xl border border-white/[0.06] transition-colors text-xs font-medium"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <Upload className="w-4 h-4" />
                </div>
                <span>Folder Upload</span>
              </button>

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  onCreateFolder?.();
                }}
                className="flex items-center gap-3 px-3 py-2.5 bg-white/[0.03] hover:bg-white/[0.06] text-slate-200 rounded-xl border border-white/[0.06] transition-colors text-xs font-medium"
              >
                <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <span>Create Folder</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Quick Access Snackbar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-[#090d16]/95 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-around z-40 px-3 pb-safe">
        {/* Left Side: Drive, Shared */}
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === "/drive" && pathname.startsWith("/drive"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? "text-sky-400 font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4.5 h-4.5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}

        {/* Center Action Button */}
        <div className="flex flex-col items-center justify-center -translate-y-3 px-2 flex-shrink-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-white text-slate-950 flex items-center justify-center shadow-lg border border-slate-200 transition-colors"
            title="New"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
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
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
                isActive ? "text-sky-400 font-medium" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4.5 h-4.5 mb-0.5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
