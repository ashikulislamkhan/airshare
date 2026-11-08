import React from "react";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#090d16] text-slate-300 font-sans p-6 sm:p-12 flex justify-center select-none">
      <div className="max-w-2xl w-full space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-slate-900 p-0.5">
              <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/logo.png`} alt="AirShare" className="w-full h-full object-cover rounded-md" />
            </div>
            <div>
              <h1 className="text-base font-medium text-slate-100">AirShare</h1>
              <p className="text-[11px] text-slate-400">Privacy Policy</p>
            </div>
          </div>

          <Link
            href="/drive"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Drive</span>
          </Link>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-slate-300">
          <section className="space-y-1.5">
            <h2 className="text-sm font-medium text-slate-100">1. Information We Collect</h2>
            <p className="text-slate-400">
              AirShare only accesses basic account identity details provided through Google Sign-In (your name, email address, and profile photo) to authenticate your private workspace. We do not access contacts, personal emails, or third-party cloud data.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-medium text-slate-100">2. File Storage and Encryption</h2>
            <p className="text-slate-400">
              Files uploaded to AirShare are sliced into binary chunks and stored across your designated private Telegram MTProto bitstream channels. Metadata (file names, sizes, folder hierarchies) is stored securely in Google Cloud Firestore. Only the authenticated owner has decryption and download rights to their stored files.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-medium text-slate-100">3. Data Sharing</h2>
            <p className="text-slate-400">
              AirShare does not sell, rent, monetize, or disclose your personal data or uploaded content to any third parties or advertisers. All storage operations remain private to your workspace.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-medium text-slate-100">4. Contact & Updates</h2>
            <p className="text-slate-400">
              For any questions regarding your data privacy, you may contact the administrator at <span className="text-slate-200 font-mono">inboxashikulislam@gmail.com</span>.
            </p>
          </section>
        </div>

        <footer className="pt-6 border-t border-white/[0.08] text-center text-[11px] text-slate-500">
          © 2026 Ashikul Islam Khan | Khan Inc. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
