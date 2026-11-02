"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("AirShare PWA ServiceWorker active, scope:", registration.scope);
          })
          .catch((error) => {
            console.warn("AirShare PWA ServiceWorker failed:", error);
          });
      });
    }
  }, []);

  return null;
}
