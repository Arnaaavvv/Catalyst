export const DAY = 86400000;

// Local calendar date (YYYY-MM-DD) of a Date object, using its local getters
// rather than toISOString() (which is always UTC). This is the one place
// "the current instant" or an arbitrary Date gets turned into a calendar
// date string — every other date-only helper in this file operates on
// already-known YYYY-MM-DD strings and never needs to touch a timezone.
function localYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// toISOString() is always UTC, so `new Date().toISOString().slice(0, 10)`
// silently reports yesterday's date for anyone east of UTC between
// midnight and the UTC offset boundary (e.g. 00:00–05:30 for IST) — every
// habit tick, "due today" filter, and health-log match inherited that.
// localYMD reads the browser's own local calendar date instead.
export const todayISO = (): string => localYMD(new Date());

// "N days from today" — built by constructing a local Date with the day
// component offset, then letting the engine normalize the overflow (day 35
// rolls into next month correctly). This is DST-safe: adding raw
// milliseconds to Date.now() can land on the wrong local calendar day
// across a spring-forward/fall-back transition, but incrementing the local
// "date" component of the Date constructor is handled correctly by the
// engine's own calendar math.
export const isoOf = (offsetDays: number): string => {
  const now = new Date();
  return localYMD(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays));
};

// Like isoOf, but offsets from a given ISO date instead of from "now" — for
// walking calendar days relative to an arbitrary anchor (e.g. habit streaks
// counting backward from today, or a prior window anchored to a past date).
// Deliberately UTC-anchored (unlike isoOf above): this never touches "the
// current instant", only shifts an already-known calendar-date string by a
// fixed number of days, which pure UTC arithmetic does safely — UTC has no
// DST to trip over, so there's no timezone-awareness needed here at all.
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