import type { HealthLog } from "./types";

// Sane starting values for a health entry with no data yet. Every caller
// that builds a new day's log — the Log Health form and the Quick Add
// reducer alike — goes through this, so a HealthLog in state always has
// all 7 fields. Nothing downstream (TodayView's snapshot, HealthView's
// averages, the report) should ever have to handle a partially-shaped one.
//
// Weight is the one field that makes more sense carried forward from the
// last known entry than reset to a generic default — repeating yesterday's
// actual weight is less misleading than a made-up baseline.
export function defaultHealthLogValues(last?: HealthLog): Omit<HealthLog, "date"> {
  const defaults: Omit<HealthLog, "date"> = {
    sleep: 7,
    steps: 6000,
    exerciseMin: 30,
    weight: last?.weight ?? 70,
    waterL: 1.5,
    mood: 3,
    energy: 3,
  };
  if (!last) return defaults;
  const { date: _date, ...rest } = last;
  return { ...defaults, ...rest };
}