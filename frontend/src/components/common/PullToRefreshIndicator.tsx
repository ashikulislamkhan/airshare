"use client";

import React from "react";
import { RefreshCw, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  isReady: boolean;
}

export default function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  isReady,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      style={{ height: `${pullDistance}px` }}
      className="overflow-hidden transition-[height] duration-150 flex items-center justify-center select-none"
    >
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-white/[0.08] shadow-sm text-xs text-slate-300">
        {isRefreshing ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            <span className="text-[11px] font-medium text-slate-300">Updating drive...</span>
          </>
        ) : isReady ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[11px] font-medium text-slate-200">Release to reload</span>
          </>
        ) : (
          <>
            <ArrowDown className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-400">Swipe down to reload</span>
          </>
        )}
      </div>
    </div>
  );
}
