"use client";

import { useEffect, useState } from "react";

function formatRealtime(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(value);
}

export function RealtimeClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <span suppressHydrationWarning className="text-sm font-medium text-slate-500">
      {formatRealtime(now)}
    </span>
  );
}
