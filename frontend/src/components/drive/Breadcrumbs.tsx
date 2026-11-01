"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, HardDrive, Folder } from "lucide-react";
import { AirShareFolder } from "../../lib/types";

interface BreadcrumbsProps {
  currentFolder: AirShareFolder | null;
  onNavigateHome: () => void;
}

export default function Breadcrumbs({ currentFolder, onNavigateHome }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 py-2 select-none">
      <button
        onClick={onNavigateHome}
        className="flex items-center gap-1.5 hover:text-white transition font-medium"
      >
        <HardDrive className="w-4 h-4 text-blue-400" />
        <span>My Drive</span>
      </button>

      {currentFolder && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <div className="flex items-center gap-1 text-slate-200 font-semibold truncate max-w-xs">
            <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20 flex-shrink-0" />
            <span className="truncate">{currentFolder.name}</span>
          </div>
        </>
      )}
    </nav>
  );
}
