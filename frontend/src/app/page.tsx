"use client";

import React from "react";
import Link from "next/link";
import { HardDrive, Shield, Zap, ArrowRight, Lock, Database } from "lucide-react";

export default function HomePage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 font-sans select-none flex flex-col justify-between">
      {/* Navigation */}
      <header className="h-16 border-b border-white/[0.08] px-6 sm:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-slate-900 p-0.5">
            <img src={`${basePath}/logo.png`} alt="AirShare" className="w-full h-full object-cover rounded-md" />
          </div>
          <div>
            <span className="font-medium text-sm text-slate-100">AirShare</span>
            <span className="text-[10px] text-slate-400 block leading-none">#ShareOnAir</span>
          </div>
        </div>

        <Link
          href="/drive"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-white text-slate-950 transition-colors shadow-sm"
        >
          <span>Launch Drive</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center space-y-8 flex-1 flex flex-col justify-center">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-400 text-xs font-mono">
            <span>Zero-Dollar Cloud Storage</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-slate-100 max-w-2xl mx-auto leading-tight">
            High-performance cloud storage with zero storage bills
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            AirShare transforms Telegram MTProto infrastructure into an encrypted, high-speed personal drive with Google Cloud Firestore metadata.
          </p>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/drive"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-white text-slate-950 transition-colors shadow-sm"
          >
            <span>Open AirShare Drive</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8 text-left">
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300 mb-2">
              <Database className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-medium text-slate-200">Unlimited Capacity</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Files are sliced into binary stream chunks and archived across private Telegram channels with no monthly quota ceiling.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300 mb-2">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-medium text-slate-200">Private & Encrypted</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Authenticated through Google Identity. Only the authenticated workspace owner has access to browse, stream, and download.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/[0.06] space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-slate-300 mb-2">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-medium text-slate-200">Zero Bandwidth Cost</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Direct streaming and chunked pipeline uploading operate within free cloud tier bounds with no egress fees.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-6 sm:px-12 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© 2026 Ashikul Islam Khan | Khan Inc. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}
