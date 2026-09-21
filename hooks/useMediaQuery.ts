"use client";
import { useSyncExternalStore } from "react";

// Subscribes to a CSS media query. The server snapshot is always `false`, so
// anything gated on this renders its desktop form first and only switches
// after hydration — no mismatch warning, no window access during SSR.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", notify);
      return () => mql.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}