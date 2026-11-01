"use client";

import React from "react";
import { Search, LayoutGrid, List, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "grid" | "list";
  onViewModeToggle: () => void;
}

export default function Header({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeToggle,
}: HeaderProps) {
  const { firebaseUser, airshareUser, signOut } = useAuth();

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 z-10">
      {/* Smart Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in AirShare (e.g. filename, .mp4, type:pdf)..."
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
        </div>
      </div>

      {/* Right Controls: View Switcher & User Profile */}
      <div className="flex items-center gap-4">
        {/* View Mode Toggle */}
        <button
          onClick={onViewModeToggle}
          title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
        >
          {viewMode === "grid" ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
        </button>

        {/* User Profile */}
        {firebaseUser ? (
          <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
            {firebaseUser.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName || "User"}
                className="w-8 h-8 rounded-full border border-blue-500/50"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                {firebaseUser.displayName?.charAt(0) || "U"}
              </div>
            )}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">
                {firebaseUser.displayName || "AirShare User"}
              </p>
              <p className="text-[11px] text-slate-400 leading-tight">
                {firebaseUser.email}
              </p>
            </div>
            <button
              onClick={signOut}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
