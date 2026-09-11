import type { LifeOSState } from "./types";

// Everything here is browser-cache storage (localStorage) — there is no
// server or database. That's the explicit design: your data lives on this
// device, in this browser, until you clear site data. Wrapped in try/catch
// throughout because localStorage can throw (private browsing, quota, SSR).

const dataKey = (userId: string) => `lifeos:data:${userId}`;

export function isStorageAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const k = "__lifeos_test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function loadState(userId: string): LifeOSState | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(dataKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LifeOSState;
    // Backfills a field for state saved before `isExample` existed, so old
    // sessions don't break on a schema change like this one.
    if (typeof parsed.isExample !== "boolean") parsed.isExample = false;
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(userId: string, state: LifeOSState): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(dataKey(userId), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(userId: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(dataKey(userId));
  } catch {
    /* ignore */
  }
}