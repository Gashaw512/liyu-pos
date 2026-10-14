"use client";

import { useEffect } from "react";

let registrationTask: Promise<void> | null = null;

function registerServiceWorkerOnce() {
  if (registrationTask) return registrationTask;

  registrationTask = (async () => {
    const existing = await navigator.serviceWorker.getRegistration("/");
    if (existing) return;

    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  })().catch((error: unknown) => {
    console.error("[PWA] Service worker registration failed.", error);
    registrationTask = null;
  });

  return registrationTask;
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    void registerServiceWorkerOnce();
  }, []);

  return null;
}
