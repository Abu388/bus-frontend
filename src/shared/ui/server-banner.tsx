"use client";

import * as React from "react";
import { useSyncExternalStore } from "react";
import { serverWakingStore } from "@/shared/api/waking-store";

export function ServerBanner() {
  const isWaking = useSyncExternalStore(
    (callback) => serverWakingStore.subscribe(callback),
    () => serverWakingStore.getSnapshot(),
    () => false
  );

  if (!isWaking) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-accent text-accent-foreground px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between border-b border-border shadow-sm animate-pulse"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-foreground"></span>
        </span>
        <span>
          Backend is waking up from sleep. The first request may take up to 60 seconds...
        </span>
      </div>
    </div>
  );
}
