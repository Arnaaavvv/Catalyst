import { addDays, daysBetween, isoOf, todayISO } from "./date";
import type { DomainId, Goal, Habit, LifeOSState, MomentumState } from "./types";

// logHabit only ever appends an entry for a day that was actually toggled —
// untouched days simply don't exist in `history`. Streak and rate therefore
// can't slice the array by entry count (that treats "5 ticks scattered over
// 2 months" as "5 done days in a row"); they have to walk real calendar
// days and check whether each one is present and done.
function habitDoneDates(habit: Habit): Set<string> {
  return new Set(habit.history.filter((h) => h.done).map((h) => h.date));
}

// Walks backward from `today` through a set of dates, counting a
// consecutive run. If `today` itself isn't in the set yet, that's treated
// as a day still in progress rather than a broken streak — start counting
// from yesterday instead of zeroing out. Shared by per-habit streaks and
// the account-wide tracking streak below, so the "what counts as still
// live today" rule can't quietly drift between the two.
function consecutiveStreak(dates: Set<string>, today: string): number {
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function habitStreak(habit: Habit, today: string = todayISO()): number {
  return consecutiveStreak(habitDoneDates(habit), today);
}

export function habitRate(habit: Habit, windowDays = 14, today: string = todayISO()): number {
  const done = habitDoneDates(habit);
  let count = 0;
  for (let i = 0; i < windowDays; i++) {
    if (done.has(addDays(today, -i))) count++;
  }
  return count / windowDays;
}

// Every calendar day with at least one piece of genuinely tracked activity,
// across every domain: goal creation, milestone completions, habit history
// entries (done or not — presence itself means the person was engaging
// with tracking that day), health logs, study sessions, and task/
// assignment completions. Due dates are deliberately excluded — they're
// arbitrary targets a person can set in the past or future, not a record
// that something actually happened on that day, and including them would
// let a single backdated item wrongly inflate a streak or tracking count.
export function trackedDates(state: LifeOSState): Set<string> {
  const dates = new Set<string>();
  state.goals.forEach((g) => dates.add(g.createdAt));
  state.goals.forEach((g) => g.milestones.forEach((m) => m.done && dates.add(m.date)));
  state.habits.forEach((h) => h.history.forEach((x) => dates.add(x.date)));
  state.healthLogs.forEach((l) => dates.add(l.date));
  state.studySessions.forEach((s) => dates.add(s.date));
  state.tasks.forEach((t) => t.completedAt && dates.add(t.completedAt));
  state.assignments.forEach((a) => a.completedAt && dates.add(a.completedAt));
  return dates;
}

// Consecutive days of any tracked activity, account-wide — the same rule
// habitStreak applies to one habit's history, applied to trackedDates
// instead. A day still in progress (nothing logged yet today) doesn't
// zero the streak, matching the same no-punishing-streaks reasoning as
// individual habit streaks.
export function accountStreak(state: LifeOSState, today: string = todayISO()): number {
  return consecutiveStreak(trackedDates(state), today);
}

export interface Momentum {
  state: MomentumState;
  delta: number;
}

// Compares a recent window against the window before it. This is the single
// rule that drives every Momentum Dial in the app — accelerating / steady /
// recovering / stalled are all derived, never stored.
export function computeMomentum(recentRate: number, priorRate: number): Momentum {
  const delta = recentRate - priorRate;
  if (recentRate < 0.25 && priorRate < 0.25) return { state: "stalled", delta };
  if (delta > 0.12) return { state: recentRate > priorRate && priorRate < 0.4 ? "recovering" : "accelerating", delta };
  if (delta < -0.15) return { state: "stalled", delta };
  return { state: "steady", delta };
}

export function habitMomentum(habit: Habit, today: string = todayISO()): Momentum {
  const recent = habitRate(habit, 10, today);
  const prior = habitRate(habit, 10, addDays(today, -10));
  return computeMomentum(recent, prior);
}

export function domainMomentum(domainId: DomainId, state: LifeOSState): Momentum {
  if (domainId === "habits") {
    const today = todayISO();
    const recentAvg = state.habits.reduce((a, h) => a + habitRate(h, 7, today), 0) / (state.habits.length || 1);
    const priorAvg = state.habits.reduce((a, h) => a + habitRate(h, 7, addDays(today, -7)), 0) / (state.habits.length || 1);
    return computeMomentum(recentAvg, priorAvg);
  }
  if (domainId === "tasks") {
    const done = state.tasks.filter((t) => t.done).length;
    const total = state.tasks.length || 1;
    return computeMomentum(done / total, 0.5);
  }
  if (domainId === "academics") {
    const recent = state.studySessions.filter((s) => daysBetween(s.date, todayISO()) <= 7).length;
    const prior = state.studySessions.filter((s) => {
      const d = daysBetween(s.date, todayISO());
      return d > 7 && d <= 14;
    }).length;
    return computeMomentum(recent / 7, prior / 7);
  }
  if (domainId === "health") {
    const recent = state.healthLogs.slice(-7);
    const prior = state.healthLogs.slice(-14, -7);
    const score = (l: LifeOSState["healthLogs"][number]) => (l.exerciseMin > 15 ? 1 : 0.3) * (l.sleep >= 7 ? 1 : 0.6);
    const rAvg = recent.reduce((a, l) => a + score(l), 0) / (recent.length || 1);
    const pAvg = prior.reduce((a, l) => a + score(l), 0) / (prior.length || 1);
    return computeMomentum(rAvg, pAvg);
  }
  // goals
  const rates = state.goals.map((g) => {
    const total = g.milestones.length || 1;
    const done = g.milestones.filter((m) => m.done).length;
    return done / total;
  });
  const avg = rates.reduce((a, b) => a + b, 0) / (rates.length || 1);
  return computeMomentum(avg, avg - 0.08);
}

export const MOMENTUM_META: Record<MomentumState, { label: string; angle: number }> = {
  accelerating: { label: "Accelerating", angle: 135 },
  steady: { label: "Steady", angle: 45 },
  recovering: { label: "Recovering", angle: -20 },
  stalled: { label: "Stalled", angle: -110 },
};

export function goalProgress(goal: Goal): number {
  const total = goal.milestones.length || 1;
  const done = goal.milestones.filter((m) => m.done).length;
  return done / total;
}

export interface TimelineEvent {
  id: string;
  date: string;
  domain: DomainId;
  kind: string;
  title: string;
  sub?: string;
  linkTo?: string | null;
}

// Unified, chronologically sorted timeline across every domain — this is what
// powers the Timeline view and nothing else needs to duplicate this logic.
export function buildTimeline(state: LifeOSState): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // completedAt is the actual completion date; due is only a fallback for
  // legacy rows saved before that field existed (where it'd be undefined,
  // not null, since it simply didn't exist in the stored JSON yet).
  state.tasks.filter((t) => t.done).forEach((t) =>
    events.push({ id: t.id, date: t.completedAt ?? t.due ?? todayISO(), domain: "tasks", kind: "Task completed", title: t.title, linkTo: t.linkedGoalId })
  );
  state.habits.forEach((h) =>
    h.history.filter((x) => x.done).slice(-6).forEach((x) =>
      events.push({ id: `${h.id}_${x.date}`, date: x.date, domain: "habits", kind: "Habit logged", title: h.name, linkTo: h.linkedGoalId })
    )
  );
  state.healthLogs.slice(-8).forEach((l) =>
    events.push({ id: `hl_${l.date}`, date: l.date, domain: "health", kind: "Health logged", title: `${l.exerciseMin}min active · ${l.sleep}h sleep`, linkTo: null })
  );
  state.goals.forEach((g) =>
    g.milestones.filter((m) => m.done).forEach((m) =>
      events.push({ id: m.id, date: m.date, domain: "goals", kind: "Milestone reached", title: m.title, sub: g.title, linkTo: g.id })
    )
  );
  state.assignments.filter((a) => a.done).forEach((a) =>
    events.push({ id: a.id, date: a.completedAt ?? a.due, domain: "academics", kind: "Assignment submitted", title: a.title, linkTo: null })
  );
  state.studySessions.forEach((s) =>
    events.push({ id: s.id, date: s.date, domain: "academics", kind: "Study session", title: `${s.topic} · ${s.duration}min`, linkTo: null })
  );

  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return events;
}