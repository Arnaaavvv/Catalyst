import { daysBetween, isoOf, todayISO } from "./date";
import type { DomainId, Goal, Habit, LifeOSState, MomentumState } from "./types";

export function habitStreak(habit: Habit): number {
  let streak = 0;
  const hist = [...habit.history].reverse();
  for (const h of hist) {
    if (h.done) streak++;
    else break;
  }
  return streak;
}

export function habitRate(habit: Habit, windowDays = 14): number {
  const recent = habit.history.slice(-windowDays);
  if (!recent.length) return 0;
  return recent.filter((h) => h.done).length / recent.length;
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

export function habitMomentum(habit: Habit): Momentum {
  const recent = habit.history.slice(-10).filter((h) => h.done).length / 10;
  const prior = habit.history.slice(-20, -10).filter((h) => h.done).length / 10;
  return computeMomentum(recent, prior);
}

export function domainMomentum(domainId: DomainId, state: LifeOSState): Momentum {
  if (domainId === "habits") {
    const recentAvg = state.habits.reduce((a, h) => a + habitRate(h, 7), 0) / (state.habits.length || 1);
    const priorAvg = state.habits.reduce((a, h) => {
      const win = h.history.slice(-14, -7);
      return a + win.filter((x) => x.done).length / (win.length || 1);
    }, 0) / (state.habits.length || 1);
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

  state.tasks.filter((t) => t.done).forEach((t) =>
    events.push({ id: t.id, date: t.due || todayISO(), domain: "tasks", kind: "Task completed", title: t.title, linkTo: t.linkedGoalId })
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
    events.push({ id: a.id, date: a.due, domain: "academics", kind: "Assignment submitted", title: a.title, linkTo: null })
  );
  state.studySessions.forEach((s) =>
    events.push({ id: s.id, date: s.date, domain: "academics", kind: "Study session", title: `${s.topic} · ${s.duration}min`, linkTo: null })
  );

  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return events;
}
