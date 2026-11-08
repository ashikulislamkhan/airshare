"use client";

import React from "react";
import { Search, LayoutGrid, List, LogOut, Menu } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import InstallAppButton from "../common/InstallAppButton";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "grid" | "list";
  onViewModeToggle: () => void;
  onToggleMobileMenu?: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeToggle,
  onToggleMobileMenu,
}: HeaderProps) {
  const { firebaseUser, signOut } = useAuth();

  return (
    <header className="h-14 bg-[#090d16] border-b border-white/[0.08] flex items-center justify-between px-3 sm:px-5 z-10 flex-shrink-0">
      {/* Left: Mobile Menu & Logo */}
      <div className="flex items-center gap-2 mr-2">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg bg-white/[0.04] border border-white/[0.08] transition-colors"
            title="Open menu"
          >
            <Menu className="w-4 h-4 text-slate-300" />
          </button>
        )}

        <div className="flex items-center gap-2 md:hidden">
          <div className="w-7 h-7 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-slate-900 p-0.5">
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.png`} alt="AirShare" className="w-full h-full object-cover rounded-md" />
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex-1 max-w-md mx-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full bg-slate-900/60 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* View Mode Toggle */}
        <button
          onClick={onViewModeToggle}
          title={viewMode === "grid" ? "Switch to list" : "Switch to grid"}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded-lg border border-white/[0.06] transition-colors"
        >
          {viewMode === "grid" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
        </button>

        {/* User Profile */}
        {firebaseUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            {firebaseUser.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName || "User"}
                className="w-7 h-7 rounded-full border border-white/10"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-medium text-slate-300">
                {firebaseUser.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-medium text-slate-200 leading-none truncate max-w-[120px]">
                {firebaseUser.displayName || "User"}
              </p>
              <p className="text-[10px] text-slate-400 leading-none truncate max-w-[120px] mt-0.5">
                {firebaseUser.email}
              </p>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded-lg border border-white/[0.06] transition-colors ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center">
            <InstallAppButton />
          </div>
        )}
      </div>
    </header>
  );
}
