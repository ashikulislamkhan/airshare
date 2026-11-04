"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export default function LoginModal() {
  const { signIn, loading } = useAuth();

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 z-50 select-none">
      {/* Background ambient gradient glow */}
      <div className="absolute w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
      <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

      <div className="relative w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] text-center space-y-6">
        {/* Brand Icon (3D Origami Airplane Logo) */}
        <div className="w-20 h-20 mx-auto rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/30 border border-white/20 bg-slate-900 p-1">
          <img src="/logo.png" alt="AirShare" className="w-full h-full object-cover rounded-xl" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">AirShare</h1>
          <p className="text-sm text-cyan-400 font-semibold tracking-wide">#ShareOnAir</p>
        </div>

        {/* Google Sign-In Button (iOS Liquid Glass) */}
        <div className="pt-2">
          <button
            onClick={signIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 px-4 rounded-2xl shadow-lg transition duration-200 disabled:opacity-60 active:scale-98 cursor-pointer"
          >
            {/* Google G SVG */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>End-to-End encrypted</span>
        </div>
      </div>
    </div>
  );
}
