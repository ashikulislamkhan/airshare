"use client";

import React from "react";
import { Download, Check } from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

interface InstallAppButtonProps {
  className?: string;
  variant?: "header" | "card" | "sidebar";
}

export default function InstallAppButton({ className = "", variant = "header" }: InstallAppButtonProps) {
  const { installApp, isInstalled } = usePWAInstall();

  // If already running inside standalone app mode, show subtle checkmark
  if (isInstalled) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium select-none ${className}`}>
        <Check className="w-3.5 h-3.5" />
        <span>App Installed</span>
      </div>
    );
  }

  return (
    <button
      onClick={installApp}
      className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition duration-200 active:scale-95 select-none cursor-pointer ${
        variant === "card"
          ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 border border-white/20"
          : "bg-slate-900/90 hover:bg-slate-800/95 text-cyan-300 hover:text-white border border-cyan-400/35 hover:border-cyan-400/60 shadow-lg shadow-cyan-500/15 backdrop-blur-xl"
      } ${className}`}
      title="Install AirShare App on your device"
    >
      <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
      <span>Install App</span>
    </button>
  );
}
