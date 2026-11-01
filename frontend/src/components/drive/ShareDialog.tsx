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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h2 className="text-white font-semibold text-base">Share & Permissions</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target name */}
        <p className="text-xs text-slate-400 truncate">
          Configuring access for <span className="text-slate-200 font-medium">"{target.name}"</span>
        </p>

        {/* Share with people */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">Invite Collaborators</label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleAddEmail}
            placeholder="Type user email and press Enter..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />

          {emails.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {emails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300"
                >
                  {email}
                  <button
                    onClick={() => setEmails(emails.filter((e) => e !== email))}
                    className="hover:text-red-400"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Role & Download Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Role Permission</label>
            <select
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value as any)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="viewer">Viewer</option>
              <option value="commenter">Commenter</option>
              <option value="editor">Editor</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1.5">Download Rights</label>
            <button
              type="button"
              onClick={() => setAllowDownload(!allowDownload)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-medium transition flex items-center justify-center gap-2 ${
                allowDownload
                  ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                  : "bg-slate-800 border-slate-700 text-slate-400"
              }`}
            >
              {allowDownload ? "Allowed" : "Restricted"}
            </button>
          </div>
        </div>

        {/* Public Link Toggle */}
        <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPublic ? <Globe className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4 text-slate-400" />}
              <span className="text-xs font-medium text-slate-200">
                {isPublic ? "Anyone with the link can view" : "Restricted link"}
              </span>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              {isPublic ? "Disable" : "Enable"}
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium py-2 rounded-lg transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Link Copied!" : "Copy Share Link"}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveShare}
            disabled={saving}
            className="px-5 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-md transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
