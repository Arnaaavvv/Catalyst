import type { LifeOSState } from "./types";
import { fmtShort } from "./date";

// Every score below is a 0–1 raw signal computed from data that already
// exists elsewhere in the app — nothing here is self-reported or arbitrary.
// The formulas are simple on purpose: each one should be explainable in a
// sentence, not a black box. Adjust the weights below if a trait feels like
// it's over- or under-reacting to your actual data.

export interface PersonalityTraits {
  disciplined: number;
  curious: number;
  driven: number;
  balanced: number;
}

export const TRAIT_META: Record<keyof PersonalityTraits, { label: string; color: string; blurb: string }> = {
  disciplined: { label: "Disciplined", color: "var(--habits)", blurb: "How reliably your habits and tasks actually get followed through." },
  curious: { label: "Curious", color: "var(--academics)", blurb: "How many different areas you're actively engaged with at once." },
  driven: { label: "Driven", color: "var(--goals)", blurb: "How much you're pursuing and progressing on goals, not just setting them." },
  balanced: { label: "Balanced", color: "var(--health)", blurb: "How consistently you're paying attention to your health alongside everything else." },
};

function habitRateFor(history: { date: string; done: boolean }[], windowDays: number): number {
  const recent = history.slice(-windowDays);
  if (!recent.length) return 0;
  return recent.filter((h) => h.done).length / recent.length;
}

export function computePersonalityTraits(state: LifeOSState): PersonalityTraits {
  // Disciplined: average habit-completion consistency (30-day window),
  // blended with overall task completion rate. Pure follow-through signal —
  // says nothing about how ambitious or wide-ranging the tracking is.
  const avgHabitRate = state.habits.length
    ? state.habits.reduce((sum, h) => sum + habitRateFor(h.history, 30), 0) / state.habits.length
    : 0;
  const taskCompletionRate = state.tasks.length
    ? state.tasks.filter((t) => t.done).length / state.tasks.length
    : 0;
  const disciplined = avgHabitRate * 0.6 + taskCompletionRate * 0.4;

  // Curious: breadth of active engagement — how many distinct subjects,
  // habits, and goals exist at all, relative to a "wide-ranging" baseline of
  // 10 combined. Says nothing about depth or consistency, only variety.
  const breadth = state.subjects.length + state.habits.length + state.goals.length;
  const curious = Math.min(1, breadth / 10);

  // Driven: average progress across active goals, plus a bonus for pursuing
  // several at once rather than just one.
  const avgGoalProgress = state.goals.length
    ? state.goals.reduce((sum, g) => sum + (g.milestones.length ? g.milestones.filter((m) => m.done).length / g.milestones.length : 0), 0) / state.goals.length
    : 0;
  const goalCountBonus = Math.min(1, state.goals.length / 5);
  const driven = avgGoalProgress * 0.7 + goalCountBonus * 0.3;

  // Balanced: how consistently health gets logged at all, over the last 30
  // days — a proxy for paying attention to wellbeing, not about hitting any
  // specific number.
  const balanced = Math.min(1, state.healthLogs.slice(-30).length / 30);

  return { disciplined, curious, driven, balanced };
}

export interface PersonalitySlice {
  key: keyof PersonalityTraits;
  label: string;
  color: string;
  blurb: string;
  fraction: number; // 0–1, for computing chart geometry — always sums to 1 across all slices
  pct: number; // rounded 0–100, for display labels only
}

// Normalizes the four raw scores into slices that sum to 1 (fraction) / 100
// (pct). If there's no data anywhere yet, falls back to an even split rather
// than dividing by zero.
export function personalityToSlices(traits: PersonalityTraits): PersonalitySlice[] {
  const entries = Object.entries(traits) as [keyof PersonalityTraits, number][];
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  return entries.map(([key, v]) => {
    const fraction = total > 0 ? v / total : 0.25;
    return { key, fraction, pct: Math.round(fraction * 100), ...TRAIT_META[key] };
  });
}

export interface PeakEra {
  label: string;
  startDate: string;
  endDate: string;
  improvementPct: number; // how much the 7-day average rose, as a percentage-point jump
}

// Scans the full tracked habit history (not just a recent window) for the
// single biggest week-over-week jump in completion rate — the point where
// things visibly turned a corner. Returns null when there isn't enough
// history yet (under 2 weeks) or the trend has never actually improved
// week-over-week, rather than showing a misleading result.
export function computePeakImprovementEra(state: LifeOSState): PeakEra | null {
  const allDates = new Set<string>();
  state.habits.forEach((h) => h.history.forEach((x) => allDates.add(x.date)));
  const dates = [...allDates].sort();
  if (dates.length < 14 || state.habits.length === 0) return null;

  const dayScore = (date: string) => {
    const doneCount = state.habits.filter((h) => h.history.some((x) => x.date === date && x.done)).length;
    return doneCount / state.habits.length;
  };

  let best: { endIdx: number; delta: number } | null = null;
  for (let i = 13; i < dates.length; i++) {
    const thisWeek = dates.slice(i - 6, i + 1);
    const priorWeek = dates.slice(i - 13, i - 6);
    const thisAvg = thisWeek.reduce((s, d) => s + dayScore(d), 0) / thisWeek.length;
    const priorAvg = priorWeek.reduce((s, d) => s + dayScore(d), 0) / priorWeek.length;
    const delta = thisAvg - priorAvg;
    if (!best || delta > best.delta) best = { endIdx: i, delta };
  }

  if (!best || best.delta <= 0) return null;

  const endDate = dates[best.endIdx];
  const startDate = dates[best.endIdx - 6];

  return {
    startDate,
    endDate,
    label: `${fmtShort(startDate)} – ${fmtShort(endDate)}`,
    improvementPct: Math.round(best.delta * 100),
  };
}