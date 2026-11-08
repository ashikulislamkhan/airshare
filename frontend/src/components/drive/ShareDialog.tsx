"use client";

import React, { useState } from "react";
import { X, Copy, Check, Globe, Lock, Shield } from "lucide-react";
import { AirShareFile, AirShareFolder } from "../../lib/types";
import { api } from "../../lib/api";

interface ShareDialogProps {
  target: AirShareFile | AirShareFolder | null;
  targetType: "file" | "folder";
  onClose: () => void;
}

export default function ShareDialog({ target, targetType, onClose }: ShareDialogProps) {
  const [emailInput, setEmailInput] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [accessLevel, setAccessLevel] = useState<"viewer" | "commenter" | "editor">("viewer");
  const [allowDownload, setAllowDownload] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!target) return null;

  const handleAddEmail = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && emailInput.trim()) {
      e.preventDefault();
      if (!emails.includes(emailInput.trim())) {
        setEmails([...emails, emailInput.trim()]);
      }
      setEmailInput("");
    }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/shared?id=${target.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveShare = async () => {
    setSaving(true);
    try {
      await api.createShare({
        targetType,
        targetId: target.id,
        isPublic,
        accessLevel,
        allowDownload,
        sharedWithEmails: emails,
      });
      onClose();
    } catch (err) {
      console.error("Failed to update share settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-white/[0.08] rounded-xl w-full max-w-sm p-4 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <h2 className="text-slate-100 font-medium text-xs">Share & permissions</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Target name */}
        <p className="text-xs text-slate-400 truncate">
          Configuring <span className="text-slate-200 font-medium">"{target.name}"</span>
        </p>

        {/* Share with people */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-slate-400">Invite collaborators</label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleAddEmail}
            placeholder="Type email and press Enter"
            className="w-full bg-slate-950 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-white/20 transition-colors"
          />

          {emails.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {emails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 border border-white/[0.06] rounded text-[11px] text-slate-300"
                >
                  {email}
                  <button
                    onClick={() => setEmails(emails.filter((e) => e !== email))}
                    className="hover:text-rose-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Role & Download Controls */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Role</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as any)}
              className="w-full bg-slate-950 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-white/20 transition-colors"
            >
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">Downloads</label>
            <button
              type="button"
              onClick={() => setAllowDownload(!allowDownload)}
              className={`w-full py-1.5 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                allowDownload
                  ? "bg-white/[0.08] border-white/20 text-white"
                  : "bg-slate-950 border-white/[0.08] text-slate-400"
              }`}
            >
              {allowDownload ? "Allowed" : "Restricted"}
            </button>
          </div>
        </div>

        {/* Public Link Toggle */}
        <div className="p-2.5 bg-slate-950 border border-white/[0.06] rounded-lg space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {isPublic ? <Globe className="w-3.5 h-3.5 text-emerald-400" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
              <span className="text-slate-300">
                {isPublic ? "Public link" : "Restricted link"}
              </span>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className="text-sky-400 hover:text-sky-300 font-medium transition-colors"
            >
              {isPublic ? "Disable" : "Enable"}
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium py-1.5 rounded border border-white/[0.08] transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Link copied" : "Copy share link"}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveShare}
            disabled={saving}
            className="px-3.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-white text-slate-950 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
