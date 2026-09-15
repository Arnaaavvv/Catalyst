"use client";
import { useMemo, useState } from "react";
import { BedDouble, Footprints, Activity, Droplet, Sparkles, Info } from "lucide-react";
import { todayISO, fmtDay, fmtShort, daysBetween } from "@/lib/date";
import { habitStreak, domainMomentum, goalProgress } from "@/lib/derived";
import { DOMAINS } from "@/lib/domains";
import LifePulse from "@/components/shared/LifePulse";
import { EmptyState, TaskCheck, MiniStat } from "@/components/shared/Primitives";
import ConfirmModal from "@/components/shared/ConfirmModal";
import type { LifeOSState } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";
import { CheckSquare, Flame } from "lucide-react";

export default function TodayView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const today = todayISO();
  const todaysTasks = state.tasks.filter((t) => t.due === today || (t.due && t.due < today && !t.done));
  const overdue = todaysTasks.filter((t) => t.due && t.due < today && !t.done).length;
  const doneToday = state.tasks.filter((t) => t.due === today && t.done).length;
  const todaysLog = state.healthLogs.find((l) => l.date === today) || state.healthLogs[state.healthLogs.length - 1];
  const upcomingAssignments = state.assignments.filter((a) => !a.done && a.due >= today).sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 3);
  const activeGoals = state.goals.slice(0, 3);

  const isBlank = state.tasks.length === 0 && state.habits.length === 0 && state.goals.length === 0
    && state.healthLogs.length === 0 && state.subjects.length === 0 && state.assignments.length === 0
    && state.studySessions.length === 0;

  const statLine = useMemo(() => {
    if (isBlank) return "Nothing tracked yet — let's fix that.";
    const doms = Object.keys(DOMAINS) as (keyof typeof DOMAINS)[];
    const states = doms.map((d) => domainMomentum(d, state).state);
    const accel = states.filter((s) => s === "accelerating" || s === "steady").length;
    const dayNum = Math.abs(daysBetween(state.goals[0]?.createdAt || today, today)) + 1;
    return `Day ${dayNum} of tracking. Momentum steady or better across ${accel} of ${doms.length} domains.`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, isBlank]);

  return (
    <div className="fade-in">
      <div className="mb-7">
        <div className="font-mono text-[11px] text-faint tracking-wide mb-1">{fmtDay(today).toUpperCase()}</div>
        <h1 className="font-display text-[30px] leading-tight mb-2" style={{ fontWeight: 500, maxWidth: 640 }}>{statLine}</h1>
      </div>

      {isBlank ? (
        <div className="surface rounded-xl p-6 max-w-lg">
          <Sparkles size={18} style={{ color: "var(--accent)" }} className="mb-3" />
          <h2 className="font-display text-xl mb-2">This is your blank slate</h2>
          <p className="text-sm text-dim leading-relaxed mb-5">
            Add your own tasks, habits, goals, and health logs with <span className="kbd">Ctrl + K</span> or,
            if you'd rather see the app fully populated first, load the example template below. It's a
            complete, clearly-separate dataset you can clear at any time; it won't merge with anything you add yourself.
          </p>
          <button onClick={actions.loadExampleTemplate} className="btn-primary px-4 py-2.5 rounded-lg text-sm">
            Load example template
          </button>
        </div>
      ) : (
        <>
          {state.isExample && (
            <div className="surface rounded-xl p-3.5 mb-5 flex items-center gap-3" style={{ borderColor: "var(--accent)" }}>
              <Info size={15} style={{ color: "var(--accent)" }} className="flex-shrink-0" />
              <p className="text-xs text-dim flex-1">
                You&apos;re viewing the <strong className="text-ink font-medium">example template</strong>,
                sample data to explore the app. Clear it whenever you&apos;re ready to track your own.
              </p>
              <button onClick={() => setClearConfirmOpen(true)}
                className="text-xs px-3 py-1.5 rounded-lg hairline border flex-shrink-0">
                Clear example data
              </button>
            </div>
          )}

          <div className="surface rounded-xl p-4 mb-6">
            <div className="font-mono text-[10px] text-faint tracking-wide mb-3">LIFE PULSE · LAST 14 DAYS</div>
            <LifePulse state={state} />
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "1.5fr 1fr" }}>
            <div className="surface rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-[10px] text-faint tracking-wide">TODAY&apos;S FOCUS</div>
                <span className="text-xs text-dim">{doneToday} done{overdue ? ` · ${overdue} overdue` : ""}</span>
              </div>
              {todaysTasks.length === 0 ? (
                <EmptyState icon={CheckSquare} title="Nothing on deck" hint="Add a task with Ctrl + K, or enjoy the clear day." />
              ) : (
                <div className="space-y-0.5">
                  {todaysTasks.map((t) => (
                    <div key={t.id} className="row-hover flex items-center gap-2.5 px-2 py-2 rounded-lg">
                      <TaskCheck done={t.done} onClick={() => actions.toggleTask(t.id)} />
                      <span className={`text-sm flex-1 ${t.done ? "line-through text-faint" : ""}`}>{t.title}</span>
                      {t.due && t.due < today && !t.done && <span className="chip" style={{ color: "var(--tasks)", borderColor: "var(--tasks)" }}>overdue</span>}
                      <span className="chip text-faint">{t.project}</span>
                    </div>
                  ))}
                </div>
              )}

              {state.habits.length > 0 && (
                <>
                  <div className="font-mono text-[10px] text-faint tracking-wide mt-5 mb-2">HABITS TODAY</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {state.habits.map((h) => {
                      const done = h.history.find((x) => x.date === today)?.done;
                      const streak = habitStreak(h);
                      return (
                        <div
                          key={h.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => actions.logHabit(h.id, today)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              actions.logHabit(h.id, today);
                            }
                          }}
                          className="row-hover flex items-center gap-2 px-2.5 py-2 rounded-lg text-left cursor-pointer"
                        >
                          <TaskCheck done={!!done} onClick={() => actions.logHabit(h.id, today)} />
                          <span className="text-xs flex-1">{h.name}</span>
                          {streak > 0 && <span className="font-mono text-[10px] flex items-center gap-0.5" style={{ color: "var(--habits)" }}><Flame size={10} />{streak}</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="space-y-5">
              <div className="surface rounded-xl p-4">
                <div className="font-mono text-[10px] text-faint tracking-wide mb-3">HEALTH SNAPSHOT</div>
                {todaysLog ? (
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat icon={BedDouble} label="Sleep" value={`${todaysLog.sleep}h`} color="var(--health)" />
                    <MiniStat icon={Footprints} label="Steps" value={todaysLog.steps.toLocaleString()} color="var(--health)" />
                    <MiniStat icon={Activity} label="Active" value={`${todaysLog.exerciseMin}m`} color="var(--health)" />
                    <MiniStat icon={Droplet} label="Water" value={`${todaysLog.waterL}L`} color="var(--health)" />
                  </div>
                ) : (
                  <div className="text-xs text-dim">No health data logged yet.</div>
                )}
              </div>

              <div className="surface rounded-xl p-4">
                <div className="font-mono text-[10px] text-faint tracking-wide mb-3">GOAL MOMENTUM</div>
                {activeGoals.length === 0 ? (
                  <div className="text-xs text-dim">No goals yet.</div>
                ) : (
                  <div className="space-y-3">
                    {activeGoals.map((g) => (
                      <div key={g.id} className="flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-xs font-medium truncate">{g.title}</div>
                          <div className="font-mono text-[10px] text-faint mt-0.5">{Math.round(goalProgress(g) * 100)}% · due {fmtShort(g.deadline)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="surface rounded-xl p-4">
                <div className="font-mono text-[10px] text-faint tracking-wide mb-3">DEADLINES AHEAD</div>
                {upcomingAssignments.length === 0 ? (
                  <div className="text-xs text-dim">Nothing due soon.</div>
                ) : (
                  <div className="space-y-2">
                    {upcomingAssignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-xs">
                        <span className="dot" style={{ background: "var(--academics)" }} />
                        <span className="flex-1 truncate">{a.title}</span>
                        <span className="font-mono text-faint">{fmtShort(a.due)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {clearConfirmOpen && (
        <ConfirmModal
          title="Clear example data?"
          message="This removes all example template data so you can start tracking your own from a blank slate. This can't be undone."
          confirmLabel="Clear it"
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => { actions.clearAllData(); setClearConfirmOpen(false); }}
        />
      )}
    </div>
  );
}