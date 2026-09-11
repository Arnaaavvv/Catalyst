"use client";
import { Flame, Link2 } from "lucide-react";
import { habitRate, habitStreak, habitMomentum, domainMomentum, MOMENTUM_META } from "@/lib/derived";
import { todayISO } from "@/lib/date";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader, TaskCheck } from "@/components/shared/Primitives";
import { DOMAINS } from "@/lib/domains";
import type { Habit, LifeOSState } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";

function HabitHistoryRow({ habit }: { habit: Habit }) {
  const days = habit.history.slice(-28);
  return (
    <div className="flex gap-[3px]">
      {days.map((d, i) => (
        <div key={i} title={d.date} className="rounded-[2px]"
          style={{ width: 7, height: 18, background: d.done ? DOMAINS.habits.color : "var(--line)", opacity: d.done ? 0.9 : 0.5 }} />
      ))}
    </div>
  );
}

export default function HabitsView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const mom = domainMomentum("habits", state);
  return (
    <div className="fade-in">
      <SectionHeader eyebrow="RECURRING · STREAKS · TARGETS" title="Habits" />

      <div className="surface rounded-xl p-4 mb-5 flex items-center gap-5">
        <MomentumDial state={mom.state} color="var(--habits)" size={64} />
        <div>
          <div className="font-mono text-[10px] text-faint tracking-wide mb-1">HABITS MOMENTUM</div>
          <div className="text-xs text-dim max-w-md">Trailing 7-day completion rate vs. the 7 days before that, averaged across all habits.</div>
        </div>
      </div>

      <div className="space-y-2.5">
        {state.habits.map((h) => {
          const rate = habitRate(h, 14);
          const streak = habitStreak(h);
          const linkedGoal = state.goals.find((g) => g.id === h.linkedGoalId);
          const hm = habitMomentum(h);
          const doneToday = h.history.find((x) => x.date === todayISO())?.done;
          return (
            <div key={h.id} className="surface rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <TaskCheck done={!!doneToday} onClick={() => actions.logHabit(h.id, todayISO())} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{h.name}</div>
                  <div className="font-mono text-[10px] text-faint mt-0.5">
                    target {h.target} {h.unit} {linkedGoal && <>· <Link2 size={9} className="inline mb-0.5" /> {linkedGoal.title}</>}
                  </div>
                </div>
                <div className="flex items-center gap-1 font-mono text-xs" style={{ color: DOMAINS.habits.color }}>
                  <Flame size={13} /> {streak}
                </div>
                <span className="chip" style={{ color: hm.state === "stalled" ? "var(--tasks)" : "var(--ink-dim)" }}>{MOMENTUM_META[hm.state].label}</span>
              </div>
              <div className="flex items-center justify-between">
                <HabitHistoryRow habit={h} />
                <span className="font-mono text-[11px] text-faint">{Math.round(rate * 100)}% · 14d</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
