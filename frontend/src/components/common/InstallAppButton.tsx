"use client";

import React from "react";
import { Download, Check, Share, PlusSquare, X, MonitorSmartphone } from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

interface InstallAppButtonProps {
  className?: string;
  variant?: "header" | "card" | "sidebar";
}

export default function InstallAppButton({ className = "", variant = "header" }: InstallAppButtonProps) {
  const {
    installApp,
    isInstalled,
    isIOS,
    showIOSPrompt,
    setShowIOSPrompt,
    showManualPrompt,
    setShowManualPrompt,
  } = usePWAInstall();

  // If already installed, show subtle "App Installed" indicator or render clean state
  if (isInstalled) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium select-none ${className}`}>
        <Check className="w-3.5 h-3.5" />
        <span>App Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={installApp}
        className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition duration-200 active:scale-95 select-none ${
          variant === "card"
            ? "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-lg shadow-cyan-500/25 border border-white/20"
            : "bg-slate-900/90 hover:bg-slate-800/95 text-cyan-300 hover:text-white border border-cyan-400/35 hover:border-cyan-400/60 shadow-lg shadow-cyan-500/15 backdrop-blur-xl"
        } ${className}`}
        title="Install AirShare App on your device"
      >
        <Download className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
        <span>Install App</span>
      </button>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <button
              onClick={() => setShowIOSPrompt(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <MonitorSmartphone className="w-6 h-6 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Install AirShare on iOS</h3>
              <p className="text-xs text-slate-400">Install to your home screen for full-screen cloud storage experience.</p>
            </div>

            <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 text-left space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Share className="w-4 h-4" />
                </div>
                <span>1. Tap the <strong>Share</strong> button in Safari's bottom toolbar.</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <span>2. Scroll down and select <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSPrompt(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-500/20 active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Manual / Browser Menu Installation Guide Modal */}
      {showManualPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-slate-900/95 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
            <button
              onClick={() => setShowManualPrompt(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <MonitorSmartphone className="w-6 h-6 text-white" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Install AirShare App</h3>
              <p className="text-xs text-slate-400">Add AirShare to your desktop or mobile app launcher.</p>
            </div>

            <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-300">
              <p>To install manually:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Click the <strong>Install (⊕)</strong> icon in your browser URL bar.</li>
                <li>Or open your browser settings (<strong>⋮</strong> or <strong>⋯</strong>) and click <strong>"Install AirShare"</strong>.</li>
              </ul>
            </div>

            <button
              onClick={() => setShowManualPrompt(false)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-xs transition shadow-md shadow-cyan-500/20 active:scale-95"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
