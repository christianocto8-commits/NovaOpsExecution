"use client";

import { useEffect } from "react";

import { registerNativePushIfAvailable } from "@/lib/capacitor/push-bridge";

export function NativePushBootstrap() {
  useEffect(() => {
    void registerNativePushIfAvailable();
  }, []);

  return null;
}
