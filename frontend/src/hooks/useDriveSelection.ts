"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AirShareFile, AirShareFolder } from "../lib/types";

interface UseDriveSelectionOptions {
  items: (AirShareFile | AirShareFolder)[];
  onDelete?: (selectedIds: string[]) => void | Promise<void>;
  onPaste?: (clipboardIds: string[]) => void | Promise<void>;
  onDownload?: (selectedIds: string[]) => void | Promise<void>;
}

export function useDriveSelection({
  items,
  onDelete,
  onPaste,
  onDownload,
}: UseDriveSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clipboard, setClipboard] = useState<{ action: "copy"; ids: string[] } | null>(null);

  // Marquee Selection Box State
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Item Click Selection
  const handleItemSelect = useCallback(
    (
      e: React.MouseEvent,
      target: AirShareFile | AirShareFolder,
      type: "file" | "folder"
    ) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(target.id)) next.delete(target.id);
          else next.add(target.id);
          return next;
        });
      } else {
        setSelectedIds(new Set([target.id]));
      }
    },
    []
  );

  // Marquee Selection Box (Click, hold, and drag mouse)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only trigger box selection on left mouse button and not on interactive cards
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-selectable-id]") ||
      target.closest("button") ||
      target.closest("input") ||
      target.closest("aside") ||
      target.closest("header") ||
      target.closest("nav")
    ) {
      return;
    }

    if (!e.ctrlKey && !e.metaKey) {
      setSelectedIds(new Set());
    }

    setIsSelecting(true);
    setSelectionBox({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isSelecting || !selectionBox) return;

      const currentX = e.clientX;
      const currentY = e.clientY;

      setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : null));

      const left = Math.min(selectionBox.startX, currentX);
      const top = Math.min(selectionBox.startY, currentY);
      const right = Math.max(selectionBox.startX, currentX);
      const bottom = Math.max(selectionBox.startY, currentY);

      // Compute intersecting cards
      const selectableElements = document.querySelectorAll("[data-selectable-id]");
      const intersecting = new Set<string>();

      selectableElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const hits = !(
          rect.right < left ||
          rect.left > right ||
          rect.bottom < top ||
          rect.top > bottom
        );
        if (hits) {
          const id = el.getAttribute("data-selectable-id");
          if (id) intersecting.add(id);
        }
      });

      setSelectedIds(intersecting);
    },
    [isSelecting, selectionBox]
  );

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
    setSelectionBox(null);
  }, []);

  // Keyboard Shortcuts (Ctrl+A, Ctrl+C, Ctrl+V, Delete, Escape)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + A: Select All
      if (isCtrl && e.key.toLowerCase() === "a") {
        e.preventDefault();
        const allIds = new Set<string>(items.map((i) => i.id));
        setSelectedIds(allIds);
      }

      // Ctrl + C: Copy Selected
      if (isCtrl && e.key.toLowerCase() === "c") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          const ids = Array.from(selectedIds);
          setClipboard({ action: "copy", ids });
          try {
            sessionStorage.setItem("airshare_clipboard", JSON.stringify({ action: "copy", ids }));
          } catch (_) {}
        }
      }

      // Ctrl + V: Paste Items
      if (isCtrl && e.key.toLowerCase() === "v") {
        let clip = clipboard;
        if (!clip) {
          try {
            const stored = sessionStorage.getItem("airshare_clipboard");
            if (stored) clip = JSON.parse(stored);
          } catch (_) {}
        }
        if (clip && clip.ids.length > 0) {
          e.preventDefault();
          onPaste?.(clip.ids);
        }
      }

      // Delete / Backspace: Delete/Trash Selected
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0) {
          e.preventDefault();
          onDelete?.(Array.from(selectedIds));
        }
      }

      // Escape: Clear Selection
      if (e.key === "Escape") {
        setSelectedIds(new Set());
        setSelectionBox(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, selectedIds, clipboard, onDelete, onPaste]);

  return {
    selectedIds,
    setSelectedIds,
    clipboard,
    setClipboard,
    selectionBox,
    containerRef,
    handleItemSelect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
