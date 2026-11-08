"use client";

import React, { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import MobileNav from "../../components/layout/MobileNav";
import Footer from "../../components/layout/Footer";
import LoginModal from "../../components/auth/LoginModal";
import { useAuth } from "../../context/AuthContext";
import InstallAppButton from "../../components/common/InstallAppButton";
import { Settings, HardDrive, User, Server } from "lucide-react";

export default function SettingsPage() {
  const { firebaseUser, airshareUser, loading: authLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (authLoading) return null;
  if (!firebaseUser) return <LoginModal />;

  return (
    <div className="flex h-screen w-screen bg-[#090d16] overflow-hidden select-none">
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header
          searchQuery=""
          onSearchChange={() => {}}
          viewMode="grid"
          onViewModeToggle={() => {}}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl space-y-5 pb-24 md:pb-6">
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-3">
            <Settings className="w-4 h-4 text-slate-400" />
            <h2 className="text-slate-100 font-medium text-base">Settings</h2>
          </div>

          {/* User Profile Card */}
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Identity profile</span>
            </div>

            <div className="flex items-center gap-3.5 pt-1">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || "User"}
                  className="w-12 h-12 rounded-full border border-white/10"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-medium text-slate-200">
                  {firebaseUser.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="space-y-0.5 flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-100 truncate">{firebaseUser.displayName}</p>
                <p className="text-xs text-slate-400 truncate">{firebaseUser.email}</p>
                <p className="text-[11px] font-mono tabular-nums text-slate-500 truncate">UID: {firebaseUser.uid}</p>
              </div>
              <InstallAppButton variant="card" />
            </div>
          </div>

          {/* Storage & Cloud Architecture */}
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Storage quota</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Storage used</span>
                <span className="text-slate-200 font-mono tabular-nums">{formatBytes(airshareUser?.storageUsedBytes || 0)}</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 w-1/4 rounded-full" />
              </div>
              <p className="text-[11px] text-slate-400">
                Unlimited cloud drive powered by Telegram MTProto storage backend.
              </p>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="bg-slate-900/50 border border-white/[0.06] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Server className="w-3.5 h-3.5 text-slate-400" />
              <span>Infrastructure</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <span className="text-slate-500 block text-[11px]">Frontend</span>
                <span className="text-slate-200 font-medium">Vercel Edge</span>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <span className="text-slate-500 block text-[11px]">Backend</span>
                <span className="text-slate-200 font-medium">FastAPI Engine</span>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <span className="text-slate-500 block text-[11px]">Database</span>
                <span className="text-slate-200 font-medium">Google Cloud Firestore</span>
              </div>
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                <span className="text-slate-500 block text-[11px]">Chunk store</span>
                <span className="text-slate-200 font-medium">Telegram MTProto Bitstream</span>
              </div>
            </div>
          </div>

          <Footer />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
