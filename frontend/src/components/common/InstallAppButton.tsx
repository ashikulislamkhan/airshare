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

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium select-none ${className}`}>
        <Check className="w-3.5 h-3.5" />
        <span>Installed</span>
      </div>
    );
  }

  return (
    <button
      onClick={installApp}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors select-none cursor-pointer border border-white/[0.08] ${
        variant === "card"
          ? "bg-slate-100 hover:bg-white text-slate-950 border-slate-200"
          : "bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white"
      } ${className}`}
      title="Install AirShare on your device"
    >
      <Download className="w-3.5 h-3.5 text-slate-400" />
      <span>Install App</span>
    </button>
  );
}
