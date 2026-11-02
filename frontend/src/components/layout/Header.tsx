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
    <header className="min-h-[70px] py-2 bg-slate-950/70 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between px-3 sm:px-6 z-10 flex-shrink-0">
      {/* Left Section: Mobile Menu Button & Mobile Logo */}
      <div className="flex items-center gap-2 mr-2">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-white/[0.05] border border-white/10 active:scale-95 transition"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 text-cyan-400" />
          </button>
        )}

        {/* Mobile Brand Logo */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 shadow-sm flex-shrink-0">
            <img src="/logo.png" alt="AirShare" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Smart Search Bar (Liquid Glass) */}
      <div className="flex-1 max-w-xl mx-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400/80" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search in AirShare..."
            className="w-full bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/30 transition shadow-inner"
          />
        </div>
      </div>

      {/* Right Controls: View Switcher & User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* View Mode Toggle */}
        <button
          onClick={onViewModeToggle}
          title={viewMode === "grid" ? "Switch to List View" : "Switch to Grid View"}
          className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-xl border border-white/[0.05] transition"
        >
          {viewMode === "grid" ? <List className="w-4.5 h-4.5" /> : <LayoutGrid className="w-4.5 h-4.5" />}
        </button>

        {/* User Profile & Install App */}
        {firebaseUser ? (
          <div className="flex flex-col items-end gap-1.5 pl-2 sm:pl-3 border-l border-white/[0.08]">
            <div className="flex items-center gap-2 sm:gap-2.5">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || "User"}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-cyan-400/40 shadow-sm"
                />
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                  {firebaseUser.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                  {firebaseUser.displayName || "AirShare User"}
                </p>
                <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">
                  {firebaseUser.email}
                </p>
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-white/[0.06] rounded-xl border border-white/[0.05] transition"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            {/* Install App Button just below the profile bar */}
            <InstallAppButton />
          </div>
        ) : null}
      </div>
    </header>
  );
}
