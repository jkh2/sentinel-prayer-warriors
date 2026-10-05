"use client";
import { useSyncExternalStore } from "react";

// Reads a browser storage string as an external store, so server and first client render agree
// (both see null) and changes in this tab re-render every reader.
const EVENT = "spw-storage";

export function useStoredValue(area: "local" | "session", key: string): string | null {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener("storage", cb);
      return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
    },
    () => { try { return (area === "local" ? localStorage : sessionStorage).getItem(key); } catch { return null; } },
    () => null,
  );
}

export function writeStoredValue(area: "local" | "session", key: string, value: string | null) {
  try {
    const s = area === "local" ? localStorage : sessionStorage;
    if (value === null) s.removeItem(key); else s.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}
