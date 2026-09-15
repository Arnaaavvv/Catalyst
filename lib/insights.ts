import { todayISO, daysBetween } from "./date";
import { habitRate, goalProgress } from "./derived";
import type { DomainId, LifeOSState } from "./types";

export interface Insight {
  domain: DomainId;
  text: string;
}

// Single source of truth for the "patterns in your own data" text — used by
// both the Insights view and the PDF report. Keeping this in one place means
// the two can never quietly disagree with each other.
export function computeInsights(state: LifeOSState): Insight[] {
  const out: Insight[] = [];
  const today = todayISO();

  const logs = state.healthLogs.slice(-21);
  const withEx = logs.filter((l) => l.exerciseMin > 20);
  const withoutEx = logs.filter((l) => l.exerciseMin <= 20);
  if (withEx.length > 3 && withoutEx.length > 3) {
    const a = withEx.reduce((s, l) => s + l.sleep, 0) / withEx.length;
    const b = withoutEx.reduce((s, l) => s + l.sleep, 0) / withoutEx.length;
    if (Math.abs(a - b) > 0.25) {
      out.push({ domain: "health", text: `On days with 20+ minutes of exercise, you sleep ${Math.abs(a - b).toFixed(1)}h ${a > b ? "more" : "less"} on average (${a.toFixed(1)}h vs ${b.toFixed(1)}h).` });
    }
  }

  const worst = [...state.habits].sort((x, y) => habitRate(x, 14) - habitRate(y, 14))[0];
  if (worst) out.push({ domain: "habits", text: `"${worst.name}" has the lowest 14-day completion rate at ${Math.round(habitRate(worst, 14) * 100)}% — it's the easiest lever to pull this week.` });

  const risky = state.goals.filter((g) => daysBetween(today, g.deadline) < 30 && goalProgress(g) < 0.5)
    .sort((a, b) => daysBetween(today, a.deadline) - daysBetween(today, b.deadline))[0];
  if (risky) out.push({ domain: "goals", text: `"${risky.title}" is ${daysBetween(today, risky.deadline)} days from deadline but only ${Math.round(goalProgress(risky) * 100)}% through its milestones.` });

  const subjectMins = state.subjects.map((s) => ({ s, mins: state.studySessions.filter((x) => x.subjectId === s.id && daysBetween(x.date, today) <= 14).reduce((a, b) => a + b.duration, 0) }));
  const sorted = [...subjectMins].sort((a, b) => a.mins - b.mins);
  if (sorted.length > 1 && sorted[0].mins < sorted[sorted.length - 1].mins * 0.4) {
    out.push({ domain: "academics", text: `${sorted[0].s.name} has gotten the least study time in 14 days (${sorted[0].mins}m) versus ${sorted[sorted.length - 1].s.name} (${sorted[sorted.length - 1].mins}m) — worth rebalancing before the next deadline.` });
  }

  if (state.tasks.length > 0) {
    const doneRate = state.tasks.filter((t) => t.done).length / state.tasks.length;
    out.push({ domain: "tasks", text: `You're closing out ${Math.round(doneRate * 100)}% of tracked tasks. ${doneRate > 0.5 ? "Ahead of a healthy pace." : "Consider trimming scope or re-prioritizing the backlog."}` });
  }

  return out;
}