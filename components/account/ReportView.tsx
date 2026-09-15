"use client";
import { X, Printer, Link2 } from "lucide-react";
import type { PublicUser } from "@/lib/auth";
import type { LifeOSState } from "@/lib/types";
import { calculateAge, fmtShort, todayISO, daysBetween } from "@/lib/date";
import { habitRate, habitStreak, domainMomentum, goalProgress, buildTimeline } from "@/lib/derived";
import { computeInsights } from "@/lib/insights";
import { computePersonalityTraits, personalityToSlices, computePeakImprovementEra } from "@/lib/personality";
import { DOMAINS } from "@/lib/domains";
import MomentumDial from "@/components/shared/MomentumDial";
import Sparkline from "@/components/shared/Sparkline";
import LifePulse from "@/components/shared/LifePulse";
import PersonalityChart from "@/components/account/PersonalityChart";
import Portal from "@/components/shared/Portal";

// Forces light, ink-friendly colors regardless of the app's current
// dark/light mode — printing a dark background wastes ink and looks wrong
// on paper. These values are a deliberate static copy of the light theme in
// globals.css :root; if that palette changes, update both.
const PRINT_VARS = {
  "--bg": "#F1EEE6", "--surface": "#FBF9F4", "--surface-2": "#EDE9DD",
  "--ink": "#221F19", "--ink-dim": "#746C5C", "--ink-faint": "#A39C8A",
  "--line": "#DED6C2", "--line-strong": "#C7BCA1",
  "--accent": "#A9461E", "--accent-ink": "#FBF6EE",
  "--health": "#1F6F78", "--habits": "#B9791E", "--goals": "#46536B",
  "--tasks": "#A63D2F", "--academics": "#386B4E",
} as React.CSSProperties;

const HEALTH_METRICS = [
  { key: "sleep", label: "Sleep", unit: "h" },
  { key: "steps", label: "Steps", unit: "" },
  { key: "exerciseMin", label: "Exercise", unit: "m" },
  { key: "weight", label: "Weight", unit: "kg" },
  { key: "waterL", label: "Water", unit: "L" },
  { key: "mood", label: "Mood", unit: "/5" },
  { key: "energy", label: "Energy", unit: "/5" },
] as const;

function ReportSection({ title, pageBreak = true, children }: { title: string; pageBreak?: boolean; children: React.ReactNode }) {
  return (
    <section className={pageBreak ? "print-page-break" : ""} style={{ marginTop: 28, paddingTop: pageBreak ? 8 : 0 }}>
      <h2 className="font-display text-xl mb-4" style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-1" style={{ borderBottom: "1px solid var(--line)" }}>
      <span className="text-dim">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

export default function ReportView({
  user, state, onClose,
}: { user: PublicUser; state: LifeOSState; onClose: () => void }) {
  const today = todayISO();
  const age = user.dob ? calculateAge(user.dob) : null;

  const traits = computePersonalityTraits(state);
  const slices = personalityToSlices(traits);
  const peakEra = computePeakImprovementEra(state);
  const insights = computeInsights(state);
  const timeline = buildTimeline(state);
  const timelineByDay = (() => {
    const map = new Map<string, typeof timeline>();
    timeline.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return [...map.entries()];
  })();

  const doms = Object.keys(DOMAINS) as (keyof typeof DOMAINS)[];

  return (
    <Portal>
      <div className="fixed inset-0 z-50 overflow-y-auto scrollbar-thin" style={{ background: "var(--bg)" }}>
        <div className="no-print sticky top-0 z-10 flex items-center justify-between px-5 py-3" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)" }}>
          <span className="text-sm font-medium">Report preview</span>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5">
              <Printer size={13} /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-lg row-hover" aria-label="Close"><X size={16} /></button>
          </div>
        </div>

        <div className="print-report max-w-[760px] mx-auto px-6 py-8" style={PRINT_VARS}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-2 print-avoid-break">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover" style={{ border: "1px solid var(--line-strong)" }} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center surface-2" style={{ border: "1px solid var(--line-strong)" }}>
                <span className="font-display text-2xl text-faint">{(user.username || user.name || "?").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="font-display text-2xl leading-tight">{user.username || user.name}</h1>
              <div className="text-xs text-faint">{user.name}{user.username ? ` · @${user.username}` : ""} · {user.email}</div>
            </div>
          </div>
          <div className="font-mono text-[10px] text-faint mb-6">Generated {fmtShort(today)}</div>

          {state.isExample && (
            <div className="print-avoid-break text-xs px-3 py-2 rounded-lg mb-6" style={{ background: "var(--surface-2)", color: "var(--ink-dim)" }}>
              This report reflects the example template data, not your own tracked data.
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-2 print-avoid-break">
            <StatRow label="Date of birth" value={user.dob ? `${fmtShort(user.dob)}${age !== null ? ` (age ${age})` : ""}` : "—"} />
            <StatRow label="Sex" value={user.sex ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1) : "—"} />
            <StatRow label="Tracking since" value={state.goals[0]?.createdAt ? fmtShort(state.goals[0].createdAt) : "—"} />
          </div>
          {user.bio && (
            <p className="text-xs text-dim leading-relaxed mt-3 print-avoid-break">{user.bio}</p>
          )}

          {/* Personality + peak era */}
          <ReportSection title="Personality" pageBreak={false}>
            <div className="print-avoid-break mb-4">
              <PersonalityChart slices={slices} />
            </div>
            <div className="print-avoid-break">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-1">PEAK IMPROVEMENT ERA</div>
              {peakEra ? (
                <p className="text-xs text-dim leading-relaxed">
                  <strong className="text-ink">{peakEra.label}</strong> — habit consistency rose {peakEra.improvementPct} percentage
                  points that week versus the one before it, the sharpest turnaround in the tracked history.
                </p>
              ) : (
                <p className="text-xs text-dim">Not enough habit history yet to identify a turning point.</p>
              )}
            </div>
          </ReportSection>

          {/* Life Pulse + domain momentum */}
          <ReportSection title="Life Pulse" pageBreak={false}>
            <div className="print-avoid-break mb-4">
              <LifePulse state={state} />
            </div>
            <div className="grid grid-cols-5 gap-2 print-avoid-break">
              {doms.map((d) => {
                const m = domainMomentum(d, state);
                return (
                  <div key={d} className="flex flex-col items-center">
                    <MomentumDial state={m.state} color={DOMAINS[d].color} size={46} />
                    <span className="text-[10px] text-faint mt-1">{DOMAINS[d].label}</span>
                  </div>
                );
              })}
            </div>
          </ReportSection>

          {/* Health — every tracked metric, per the request to keep the
              actual numbers (steps, water, etc.) even though per-day
              checkboxes elsewhere in the app are skipped. */}
          <ReportSection title="Health">
            {state.healthLogs.length === 0 ? (
              <p className="text-xs text-dim">No health data logged yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {HEALTH_METRICS.map((m) => {
                  const logs = state.healthLogs.slice(-30);
                  const values = logs.map((l) => Number(l[m.key]));
                  const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
                  const latest = values[values.length - 1];
                  return (
                    <div key={m.key} className="print-avoid-break">
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs font-medium">{m.label}</span>
                        <span className="font-mono text-[10px] text-faint">latest {latest}{m.unit} · avg {avg}{m.unit}</span>
                      </div>
                      <Sparkline values={values} color="var(--health)" height={32} filled />
                    </div>
                  );
                })}
              </div>
            )}
          </ReportSection>

          {/* Habits — completion rate and streak per habit, not the daily
              tick grid. */}
          <ReportSection title="Habits">
            {state.habits.length === 0 ? (
              <p className="text-xs text-dim">No habits tracked yet.</p>
            ) : (
              <div className="space-y-2">
                {state.habits.map((h) => {
                  const linkedGoal = state.goals.find((g) => g.id === h.linkedGoalId);
                  return (
                    <div key={h.id} className="print-avoid-break py-1.5" style={{ borderBottom: "1px solid var(--line)" }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{h.name}</span>
                        <span className="font-mono text-[11px] text-faint">
                          {Math.round(habitRate(h, 30) * 100)}% · 30d · streak {habitStreak(h)}
                        </span>
                      </div>
                      <div className="text-[10px] text-faint mt-0.5">
                        target {h.target} {h.unit}{linkedGoal ? ` · linked to "${linkedGoal.title}"` : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ReportSection>

          {/* Goals — progress, milestone status as text (not checkboxes),
              and real linked habits/tasks (resolved from task.linkedGoalId,
              since goal.linkedTaskIds is never actually populated anywhere
              in the app). */}
          <ReportSection title="Goals">
            {state.goals.length === 0 ? (
              <p className="text-xs text-dim">No goals tracked yet.</p>
            ) : (
              <div className="space-y-4">
                {state.goals.map((g) => {
                  const linkedHabits = state.habits.filter((h) => h.linkedGoalId === g.id);
                  const linkedTasks = state.tasks.filter((t) => t.linkedGoalId === g.id);
                  return (
                    <div key={g.id} className="print-avoid-break">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">{g.title}</span>
                        <span className="font-mono text-[11px] text-faint">{Math.round(goalProgress(g) * 100)}% · due {fmtShort(g.deadline)}</span>
                      </div>
                      <div className="mt-1 pl-3 space-y-0.5">
                        {g.milestones.map((m) => (
                          <div key={m.id} className="text-[11px] text-dim flex items-center gap-1.5">
                            <span style={{ color: m.done ? "var(--academics)" : "var(--ink-faint)" }}>{m.done ? "done" : "pending"}</span>
                            <span>{m.title}</span>
                            <span className="text-faint">({fmtShort(m.date)})</span>
                          </div>
                        ))}
                      </div>
                      {(linkedHabits.length > 0 || linkedTasks.length > 0) && (
                        <div className="text-[10px] text-faint mt-1 pl-3 flex items-center gap-1">
                          <Link2 size={9} />
                          {[...linkedHabits.map((h) => h.name), ...linkedTasks.map((t) => t.title)].join(" · ")}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ReportSection>

          {/* Tasks — status as plain text ("Done"/"Open"), not a checkbox
              glyph, per the request. Subtasks shown as a count, not their
              own individual checkboxes. */}
          <ReportSection title="Tasks">
            {state.tasks.length === 0 ? (
              <p className="text-xs text-dim">No tasks tracked yet.</p>
            ) : (
              <>
                <div className="text-xs text-dim mb-3">
                  {state.tasks.filter((t) => t.done).length} of {state.tasks.length} completed
                  ({Math.round((state.tasks.filter((t) => t.done).length / state.tasks.length) * 100)}%)
                </div>
                <div className="space-y-1">
                  {state.tasks.map((t) => {
                    const linkedGoal = state.goals.find((g) => g.id === t.linkedGoalId);
                    const doneSubtasks = t.subtasks.filter((s) => s.done).length;
                    return (
                      <div key={t.id} className="print-avoid-break flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid var(--line)" }}>
                        <div className="min-w-0">
                          <span className={t.done ? "text-faint" : ""}>{t.title}</span>
                          <span className="text-faint"> — {t.priority} priority · {t.project}{linkedGoal ? ` · ${linkedGoal.title}` : ""}{t.subtasks.length ? ` · ${doneSubtasks}/${t.subtasks.length} subtasks` : ""}{t.recurring ? ` · recurring (${t.recurring})` : ""}</span>
                        </div>
                        <span className="font-mono text-[10px] flex-shrink-0 ml-2" style={{ color: t.done ? "var(--academics)" : "var(--ink-faint)" }}>
                          {t.done ? "Done" : t.due ? `Due ${fmtShort(t.due)}` : "No due date"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </ReportSection>

          {/* Academics — subjects, study time per subject, assignments
              (with grades), and study sessions. */}
          <ReportSection title="Academics">
            {state.subjects.length === 0 ? (
              <p className="text-xs text-dim">No subjects tracked yet.</p>
            ) : (
              <>
                <div className="font-mono text-[10px] text-faint tracking-wide mb-2">STUDY TIME BY SUBJECT (ALL TIME)</div>
                <div className="space-y-1.5 mb-5">
                  {state.subjects.map((s) => {
                    const mins = state.studySessions.filter((ss) => ss.subjectId === s.id).reduce((a, b) => a + b.duration, 0);
                    return <StatRow key={s.id} label={s.name} value={`${mins} min`} />;
                  })}
                </div>

                <div className="font-mono text-[10px] text-faint tracking-wide mb-2">ASSIGNMENTS & EXAMS</div>
                {state.assignments.length === 0 ? (
                  <p className="text-xs text-dim mb-5">None tracked yet.</p>
                ) : (
                  <div className="space-y-1 mb-5">
                    {state.assignments.map((a) => {
                      const subj = state.subjects.find((s) => s.id === a.subjectId);
                      return (
                        <div key={a.id} className="print-avoid-break flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid var(--line)" }}>
                          <span>{a.title} <span className="text-faint">— {subj?.name} · {a.weight}</span></span>
                          <span className="font-mono text-[10px] flex-shrink-0 ml-2">
                            {a.done ? `Done${a.grade ? ` (${a.grade})` : ""}` : `Due ${fmtShort(a.due)}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="font-mono text-[10px] text-faint tracking-wide mb-2">STUDY SESSIONS</div>
                {state.studySessions.length === 0 ? (
                  <p className="text-xs text-dim">None logged yet.</p>
                ) : (
                  <div className="space-y-1">
                    {[...state.studySessions].sort((a, b) => (a.date < b.date ? 1 : -1)).map((s) => {
                      const subj = state.subjects.find((x) => x.id === s.subjectId);
                      return (
                        <div key={s.id} className="print-avoid-break flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid var(--line)" }}>
                          <span>{s.topic} <span className="text-faint">— {subj?.name}</span></span>
                          <span className="font-mono text-[10px] text-faint flex-shrink-0 ml-2">{s.duration}min · {fmtShort(s.date)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </ReportSection>

          {/* Insights — identical text to the Insights view, via the same
              computeInsights() function, so the two can never disagree. */}
          <ReportSection title="Insights">
            {insights.length === 0 ? (
              <p className="text-xs text-dim">No standout patterns yet.</p>
            ) : (
              <div className="space-y-2">
                {insights.map((ins, i) => (
                  <div key={i} className="print-avoid-break flex items-start gap-2 text-xs">
                    <span className="dot mt-1" style={{ background: DOMAINS[ins.domain].color }} />
                    <span>{ins.text}</span>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>

          {/* Timeline — every event buildTimeline() surfaces, same as the
              on-screen Timeline view. */}
          <ReportSection title="Timeline">
            {timelineByDay.length === 0 ? (
              <p className="text-xs text-dim">Nothing logged yet.</p>
            ) : (
              <div className="space-y-3">
                {timelineByDay.map(([date, events]) => (
                  <div key={date} className="print-avoid-break">
                    <div className="font-mono text-[10px] text-faint mb-1">{fmtShort(date)}</div>
                    <div className="pl-3 space-y-0.5">
                      {events.map((e) => (
                        <div key={e.id} className="text-[11px] flex items-center gap-1.5">
                          <span className="dot" style={{ background: DOMAINS[e.domain].color }} />
                          <span>{e.title}</span>
                          <span className="text-faint">— {e.kind}{e.sub ? ` · ${e.sub}` : ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>

          <div className="text-center font-mono text-[10px] text-faint mt-10 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
            Catalyst · {daysBetween(state.goals[0]?.createdAt || today, today) + 1} days tracked · generated {fmtShort(today)}
          </div>
        </div>
      </div>
    </Portal>
  );
}