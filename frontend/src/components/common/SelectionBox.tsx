"use client";

import React from "react";

export function SelectionBox({
  selectionBox,
}: {
  selectionBox: {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null;
}) {
  if (!selectionBox) return null;

  return (
    <div
      style={{
        left: Math.min(selectionBox.startX, selectionBox.currentX),
        top: Math.min(selectionBox.startY, selectionBox.currentY),
        width: Math.abs(selectionBox.currentX - selectionBox.startX),
        height: Math.abs(selectionBox.currentY - selectionBox.startY),
      }}
      className="fixed pointer-events-none bg-cyan-500/20 border border-cyan-400/80 rounded-lg z-40 backdrop-blur-[2px] shadow-sm"
    />
  );
}
