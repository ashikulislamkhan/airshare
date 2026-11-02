"use client";

import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already running in standalone mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true;

    setIsInstalled(isStandalone);

    // Pick up pre-existing prompt captured in <head>
    // @ts-ignore
    if (window.__AIRSHARE_INSTALL_PROMPT__) {
      // @ts-ignore
      setDeferredPrompt(window.__AIRSHARE_INSTALL_PROMPT__);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // @ts-ignore
      window.__AIRSHARE_INSTALL_PROMPT__ = e as BeforeInstallPromptEvent;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handlePromptReady = () => {
      // @ts-ignore
      if (window.__AIRSHARE_INSTALL_PROMPT__) {
        // @ts-ignore
        setDeferredPrompt(window.__AIRSHARE_INSTALL_PROMPT__);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      // @ts-ignore
      window.__AIRSHARE_INSTALL_PROMPT__ = null;
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("airshare_prompt_ready", handlePromptReady);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("airshare_prompt_ready", handlePromptReady);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    // @ts-ignore
    const promptEvent: BeforeInstallPromptEvent | null =
      deferredPrompt || (typeof window !== "undefined" ? (window as any).__AIRSHARE_INSTALL_PROMPT__ : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") {
          setIsInstalled(true);
        }
      } catch (err) {
        console.warn("Direct install prompt trigger:", err);
      }
      // @ts-ignore
      if (typeof window !== "undefined") {
        (window as any).__AIRSHARE_INSTALL_PROMPT__ = null;
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return {
    installApp,
    isInstalled,
    canInstall: !isInstalled,
  };
}
