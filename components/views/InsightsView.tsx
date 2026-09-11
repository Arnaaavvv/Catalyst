"use client";
import { useMemo } from "react";
import { todayISO, daysBetween } from "@/lib/date";
import { domainMomentum, habitRate, goalProgress } from "@/lib/derived";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader } from "@/components/shared/Primitives";
import { DOMAINS } from "@/lib/domains";
import type { DomainId, LifeOSState } from "@/lib/types";

export default function InsightsView({ state }: { state: LifeOSState }) {
  const doms = Object.keys(DOMAINS) as DomainId[];
  const momentums = doms.map((d) => ({ id: d, ...domainMomentum(d, state) }));

  const insights = useMemo(() => {
    const out: { domain: DomainId; text: string }[] = [];
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

    const doneRate = state.tasks.filter((t) => t.done).length / state.tasks.length;
    out.push({ domain: "tasks", text: `You're closing out ${Math.round(doneRate * 100)}% of tracked tasks. ${doneRate > 0.5 ? "Ahead of a healthy pace." : "Consider trimming scope or re-prioritizing the backlog."}` });

    return out;
  }, [state]);

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="PATTERNS IN YOUR OWN DATA" title="Insights" />

      <div className="grid grid-cols-5 gap-3 mb-6">
        {momentums.map((m) => {
          const Icon = DOMAINS[m.id].icon;
          return (
            <div key={m.id} className="surface rounded-xl p-3.5 flex flex-col items-center">
              <Icon size={13} style={{ color: DOMAINS[m.id].color }} className="mb-1.5" />
              <MomentumDial state={m.state} color={DOMAINS[m.id].color} size={50} />
              <div className="text-[10px] text-faint mt-1">{DOMAINS[m.id].label}</div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2.5">
        {insights.map((ins, i) => (
          <div key={i} className="surface rounded-xl p-4 flex items-start gap-3">
            <span className="dot mt-1.5" style={{ background: DOMAINS[ins.domain].color }} />
            <p className="text-sm leading-relaxed">{ins.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
