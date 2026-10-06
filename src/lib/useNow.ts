"use client";
import { useSyncExternalStore } from "react";

// The current minute in the viewer's own clock and time zone. Null during the server render,
// so pages that depend on local time don't mismatch on hydration.
export function useNow(): Date | null {
  const minute = useSyncExternalStore(
    (cb) => { const t = setInterval(cb, 30_000); return () => clearInterval(t); },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
  return minute === null ? null : new Date(minute * 60_000);
}

export function browserTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch { return "UTC"; }
}
