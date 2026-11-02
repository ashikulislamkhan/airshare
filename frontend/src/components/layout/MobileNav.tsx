"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HardDrive, Users, Star, Trash2, Plus, Clock } from "lucide-react";
import { useTransfer } from "../../context/TransferContext";

interface MobileNavProps {
  currentFolderId?: string | null;
  onOpenUploadModal?: () => void;
}

export default function MobileNav({ currentFolderId = null, onOpenUploadModal }: MobileNavProps) {
  const pathname = usePathname();
  const { addUploads } = useTransfer();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addUploads(e.target.files, currentFolderId);
      e.target.value = "";
    }
  };

  const navItems = [
    { label: "Drive", href: "/drive", icon: HardDrive },
    { label: "Shared", href: "/shared", icon: Users },
    { label: "Recent", href: "/recent", icon: Clock },
    { label: "Starred", href: "/starred", icon: Star },
    { label: "Trash", href: "/trash", icon: Trash2 },
  ];

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around z-40 px-2 pb-safe">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              isActive ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}

      {/* Floating Center Action Button */}
      <div className="flex flex-col items-center justify-center -translate-y-4 px-2">
        <button
          onClick={() => {
            if (onOpenUploadModal) onOpenUploadModal();
            else fileInputRef.current?.click();
          }}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30 border-2 border-white/20 active:scale-95 transition"
          title="Upload File"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {navItems.slice(2).map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              isActive ? "text-cyan-400 font-semibold" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
