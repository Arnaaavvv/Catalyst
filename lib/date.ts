export const DAY = 86400000;

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const isoOf = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

// Like isoOf, but offsets from a given ISO date instead of from "now" — for
// walking calendar days relative to an arbitrary anchor (e.g. habit streaks
// counting backward from today, or a prior window anchored to a past date).
export const addDays = (iso: string, offsetDays: number): string =>
  new Date(Date.parse(iso) + offsetDays * DAY).toISOString().slice(0, 10);

export const fmtDay = (iso: string): string =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const fmtShort = (iso: string): string =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const daysBetween = (a: string, b: string): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);

// Derived from date of birth rather than stored as its own field — a raw
// "age" number would silently go stale the moment a birthday passes, since
// nothing would ever re-save it. dob is the only source of truth; age is
// always computed fresh at render time.
export const calculateAge = (dobISO: string): number => {
  const dob = new Date(dobISO + "T00:00:00");
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hadBirthdayThisYear =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  if (!hadBirthdayThisYear) age -= 1;
  return age;
};

let _id = 1000;
export const uid = (prefix: string): string => `${prefix}_${(_id++).toString(36)}_${Date.now().toString(36).slice(-4)}`;