"use client";

import React from "react";
import { ChevronRight, HardDrive, Folder } from "lucide-react";
import { AirShareFolder } from "../../lib/types";

interface BreadcrumbsProps {
  currentFolder: AirShareFolder | null;
  onNavigateHome: () => void;
}

export default function Breadcrumbs({ currentFolder, onNavigateHome }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 py-1 select-none">
      <button
        onClick={onNavigateHome}
        className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors font-medium"
      >
        <HardDrive className="w-3.5 h-3.5 text-slate-400" />
        <span>My Drive</span>
      </button>

      {currentFolder && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <div className="flex items-center gap-1.5 text-slate-200 font-medium truncate max-w-xs">
            <Folder className="w-3.5 h-3.5 text-amber-300 fill-amber-300/20 flex-shrink-0" />
            <span className="truncate">{currentFolder.name}</span>
          </div>
        </>
      )}
    </nav>
  );
}
