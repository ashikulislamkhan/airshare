"use client";

import React, { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Header from "../../components/layout/Header";
import MobileNav from "../../components/layout/MobileNav";
import Footer from "../../components/layout/Footer";
import LoginModal from "../../components/auth/LoginModal";
import { useAuth } from "../../context/AuthContext";
import InstallAppButton from "../../components/common/InstallAppButton";
import { Settings, Shield, HardDrive, User, Server } from "lucide-react";

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
    <div className="flex h-screen w-screen bg-[#060b18] overflow-hidden select-none">
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl space-y-6 pb-24 md:pb-6">
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] pb-4">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="text-white font-semibold text-lg">Account & Storage Settings</h2>
          </div>

          {/* User Profile Card (Liquid Glass) */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
              <User className="w-4 h-4 text-cyan-400" />
              <span>Google Identity Profile</span>
            </div>

            <div className="flex items-center gap-4 pt-2">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || "User"}
                  className="w-14 h-14 rounded-full border-2 border-cyan-400/50 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-lg font-bold text-white shadow-md">
                  {firebaseUser.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="space-y-1 flex-1">
                <p className="text-sm font-semibold text-white">{firebaseUser.displayName}</p>
                <p className="text-xs text-slate-400">{firebaseUser.email}</p>
                <p className="text-[11px] font-mono text-slate-500">UID: {firebaseUser.uid}</p>
              </div>
              <InstallAppButton variant="card" />
            </div>
          </div>

          {/* Storage & Cloud Architecture */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <HardDrive className="w-4 h-4 text-indigo-400" />
              <span>Storage Quota</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Current Storage Used</span>
                <span className="text-white font-semibold">{formatBytes(airshareUser?.storageUsedBytes || 0)}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 w-1/4 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.5)]" />
              </div>
              <p className="text-[11px] text-slate-400">
                Backed by Telegram MTProto zero-dollar storage channels. No monthly quota ceiling.
              </p>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Zero-Dollar Infrastructure Config</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                <span className="text-slate-500 block">Frontend Host</span>
                <span className="text-slate-200 font-medium">Vercel (Hobby Tier - UI Delivery)</span>
              </div>
              <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                <span className="text-slate-500 block">Backend Runtime</span>
                <span className="text-slate-200 font-medium">Render.com / Cloud Run (Always Free)</span>
              </div>
              <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                <span className="text-slate-500 block">Metadata Database</span>
                <span className="text-slate-200 font-medium">Google Cloud Firestore (Spark Free)</span>
              </div>
              <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
                <span className="text-slate-500 block">Binary Chunk Store</span>
                <span className="text-slate-200 font-medium">Telegram MTProto Storage Channels</span>
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
