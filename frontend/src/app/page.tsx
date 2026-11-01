"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/drive");
  }, [router]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-slate-950 text-slate-400 text-xs">
      Loading AirShare...
    </div>
  );
}
