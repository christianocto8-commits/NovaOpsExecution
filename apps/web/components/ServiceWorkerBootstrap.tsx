"use client";

import { useEffect } from "react";

import { registerAppServiceWorker } from "@/lib/pwa/register-service-worker";

export function ServiceWorkerBootstrap() {
  useEffect(() => {
    void registerAppServiceWorker();
  }, []);

  return null;
}
