export const DAY = 86400000;

export const todayISO = (): string => new Date().toISOString().slice(0, 10);

export const isoOf = (offsetDays: number): string =>
  new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);

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

let _id = 1000;
export const uid = (prefix: string): string => `${prefix}_${(_id++).toString(36)}_${Date.now().toString(36).slice(-4)}`;
