"use client";

import React, { useState } from "react";
import { Download, Check, Share, MoreVertical, PlusSquare, X } from "lucide-react";
import { usePWAInstall } from "../../hooks/usePWAInstall";

interface InstallAppButtonProps {
  className?: string;
  variant?: "header" | "card" | "sidebar";
}

export default function InstallAppButton({ className = "", variant = "header" }: InstallAppButtonProps) {
  const { installApp, isInstalled } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  const handleClick = async () => {
    const handled = await installApp();
    if (!handled) {
      setShowGuide(true);
    }
  };

  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium select-none ${className}`}>
        <Check className="w-3.5 h-3.5" />
        <span>Installed</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
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

      {/* Device-aware install guide modal */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm select-none">
          <div className="relative w-full max-w-sm bg-slate-900 border border-white/[0.08] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-white/[0.05] border border-white/10 flex items-center justify-center">
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-100">Install AirShare</h3>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-300">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Install AirShare to your home screen directly from Safari:
                </p>
                <ol className="space-y-2.5 list-none">
                  <li className="flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="w-4 h-4 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">1</span>
                    <span className="leading-snug">
                      Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-sky-400 align-text-bottom" /> <strong>Share</strong> button in Safari toolbar.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="w-4 h-4 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">2</span>
                    <span className="leading-snug">
                      Scroll down and tap <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-slate-200 align-text-bottom" /> <strong>Add to Home Screen</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="w-4 h-4 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">3</span>
                    <span className="leading-snug">
                      Tap <strong>Add</strong> in the top-right corner.
                    </span>
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Add AirShare directly from your browser menu:
                </p>
                <ol className="space-y-2.5 list-none">
                  <li className="flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="w-4 h-4 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">1</span>
                    <span className="leading-snug">
                      Tap the <MoreVertical className="w-3.5 h-3.5 inline mx-0.5 text-slate-300 align-text-bottom" /> <strong>three dots</strong> menu in Chrome.
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                    <span className="w-4 h-4 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center text-[10px] font-medium flex-shrink-0 mt-0.5">2</span>
                    <span className="leading-snug">
                      Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                    </span>
                  </li>
                </ol>
              </div>
            )}

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-2 bg-slate-100 hover:bg-white text-slate-950 font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
