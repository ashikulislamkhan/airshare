import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
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
              <p className="text-[11px] text-slate-400">Terms of Service</p>
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
            <h2 className="text-sm font-medium text-slate-100">1. Acceptance of Terms</h2>
            <p className="text-slate-400">
              By accessing and using AirShare, you agree to comply with these Terms of Service. AirShare provides zero-cost cloud storage infrastructure powered by Google Cloud and Telegram MTProto protocols.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-medium text-slate-100">2. Appropriate Use</h2>
            <p className="text-slate-400">
              You agree not to use AirShare to store, transmit, or share unlawful material, malicious software, copyright-infringing content, or content that violates Telegram or Google platform service policies.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-medium text-slate-100">3. Service Availability</h2>
            <p className="text-slate-400">
              AirShare is provided on an "as is" and "as available" basis without warranty of any kind. Users are encouraged to maintain independent backups of critical records.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-sm font-medium text-slate-100">4. Inquiries</h2>
            <p className="text-slate-400">
              For administrative inquiries, please contact <span className="text-slate-200 font-mono">inboxashikulislam@gmail.com</span>.
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
