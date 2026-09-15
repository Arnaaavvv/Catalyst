"use client";
import { useEffect, useState } from "react";
import { X, Target } from "lucide-react";
import { domainMomentum, goalProgress, habitRate } from "@/lib/derived";
import { fmtShort, isoOf } from "@/lib/date";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader, TaskCheck, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import type { LifeOSState } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";
import { Flame, Plus } from "lucide-react";

interface Satellite {
  id: string;
  name: string;
  type: "habit" | "task";
  goalId: string;
  x: number;
  y: number;
  goalX: number;
  goalY: number;
}

function ConstellationMap({
  state, onSelect, selectedId,
}: { state: LifeOSState; onSelect: (id: string) => void; selectedId: string | null }) {
  const w = 700;
  const rowH = 20; // vertical space reserved per satellite item
  const minBand = 84; // minimum height per goal, even with 0-1 items
  const goals = state.goals;

  // Each goal gets a band sized to how many items it actually has — a goal
  // with 4 linked items no longer competes for the same fixed slice of
  // height as one with zero, which is what caused labels to collide.
  const bands = goals.map((g) => {
    const habitsFor = state.habits.filter((h) => h.linkedGoalId === g.id);
    const tasksFor = state.tasks.filter((t) => t.linkedGoalId === g.id && !t.done).slice(0, 3);
    const items = [
      ...habitsFor.map((h) => ({ id: h.id, name: h.name, type: "habit" as const })),
      ...tasksFor.map((t) => ({ id: t.id, name: t.title, type: "task" as const })),
    ];
    return { goal: g, items, height: Math.max(minBand, items.length * rowH + 28) };
  });

  const h = bands.reduce((sum, b) => sum + b.height, 0) + 20;

  let cursorY = 10;
  const nodes = bands.map(({ goal, items, height }) => {
    const top = cursorY;
    const centerY = top + height / 2;
    cursorY += height;
    return { goal, items, top, height, y: centerY };
  });

  const satellites: Satellite[] = [];
  nodes.forEach(({ goal, items, top, height, y }) => {
    const n = items.length;
    items.forEach((item, i) => {
      const sy = n <= 1 ? y : top + 16 + i * ((height - 32) / Math.max(1, n - 1));
      satellites.push({ ...item, goalId: goal.id, x: w * 0.72, y: sy, goalX: w * 0.28, goalY: y });
    });
  });

  // When a goal is selected, everything belonging to other goals fades back
  // so the selected goal's actual relationships are what stands out.
  const dimmed = (goalId: string) => selectedId !== null && selectedId !== goalId;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      {satellites.map((s) => (
        <line key={"l" + s.id} x1={s.goalX} y1={s.goalY} x2={s.x} y2={s.y}
          stroke={s.type === "habit" ? "var(--habits)" : "var(--tasks)"}
          strokeWidth="1" opacity={dimmed(s.goalId) ? 0.08 : 0.35} strokeDasharray="2 3" />
      ))}
      {satellites.map((s) => (
        <g key={s.id} opacity={dimmed(s.goalId) ? 0.3 : 1} style={{ transition: "opacity 0.15s ease" }}>
          <circle cx={s.x} cy={s.y} r="4" fill={s.type === "habit" ? "var(--habits)" : "var(--tasks)"} opacity="0.85" />
          <text x={s.x + 9} y={s.y + 3} fontSize="10" fill="var(--ink-dim)" fontFamily="Public Sans">
            {s.name.length > 26 ? s.name.slice(0, 24) + "…" : s.name}
          </text>
        </g>
      ))}
      {nodes.map(({ goal, y }) => {
        const prog = goalProgress(goal);
        const r = 10 + prog * 10;
        const selected = selectedId === goal.id;
        return (
          <g key={goal.id} onClick={() => onSelect(goal.id)} style={{ cursor: "pointer" }}>
            <circle cx={w * 0.28} cy={y} r={r + 6} fill="none" stroke="var(--goals)" strokeWidth={selected ? 1.5 : 0.75} opacity={selected ? 0.6 : 0.25} />
            <circle cx={w * 0.28} cy={y} r={r} fill="var(--goals)" opacity={0.85} />
            <text x={w * 0.28} y={y - r - 10} fontSize="12" fontWeight="600" fill="var(--ink)" textAnchor="middle" fontFamily="Fraunces">
              {goal.title.length > 34 ? goal.title.slice(0, 32) + "…" : goal.title}
            </text>
            <text x={w * 0.28} y={y + 3} fontSize="9" fill="var(--accent-ink)" textAnchor="middle" fontFamily="IBM Plex Mono">
              {Math.round(prog * 100)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function GoalsView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const [selected, setSelected] = useState<string | null>(state.goals[0]?.id || null);
  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const goal = state.goals.find((g) => g.id === selected);
  const mom = domainMomentum("goals", state);
  const hasGoals = state.goals.length > 0;

  // If goals start empty and the person adds their first one, select it
  // automatically instead of leaving the detail panel permanently blank.
  useEffect(() => {
    if (!selected && state.goals[0]) setSelected(state.goals[0].id);
  }, [state.goals, selected]);

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="MILESTONES · RELATIONSHIPS · NEXT ACTIONS" title="Goals"
        action={<button onClick={() => setNewGoalOpen(true)} className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><Plus size={13} /> New goal</button>} />

      {!hasGoals ? (
        <EmptyState icon={Target} title="No goals yet"
          hint={'Add your first one with "New goal" above, milestones and linked habits/tasks will show up here as a relationship map.'} />
      ) : (
        <>
          <div className="surface rounded-xl p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-mono text-[10px] text-faint tracking-wide">RELATIONSHIP MAP · click a goal</div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-faint">
                <span className="flex items-center gap-1"><span className="dot" style={{ background: "var(--goals)" }} /> goal</span>
                <span className="flex items-center gap-1"><span className="dot" style={{ background: "var(--habits)" }} /> habit</span>
                <span className="flex items-center gap-1"><span className="dot" style={{ background: "var(--tasks)" }} /> task</span>
              </div>
            </div>
            <ConstellationMap state={state} onSelect={setSelected} selectedId={selected} />
          </div>

          {goal && (
            <div className="grid gap-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="surface rounded-xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-display text-xl" style={{ maxWidth: 280 }}>{goal.title}</h3>
                  <MomentumDial state={mom.state} color="var(--goals)" size={48} />
                </div>
                <div className="font-mono text-[10px] text-faint mb-4">due {fmtShort(goal.deadline)} · {Math.round(goalProgress(goal) * 100)}% complete</div>
                <div className="space-y-1">
                  {goal.milestones.map((m) => (
                    <div key={m.id} className="row-hover flex items-center gap-2.5 px-2 py-2 rounded-lg">
                      <TaskCheck done={m.done} onClick={() => actions.toggleMilestone(goal.id, m.id)} />
                      <span className={`text-sm flex-1 ${m.done ? "line-through text-faint" : ""}`}>{m.title}</span>
                      <span className="font-mono text-[10px] text-faint">{fmtShort(m.date)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="surface rounded-xl p-4">
                <div className="font-mono text-[10px] text-faint tracking-wide mb-3">LINKED HABITS</div>
                <div className="space-y-2 mb-4">
                  {state.habits.filter((h) => h.linkedGoalId === goal.id).map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-sm">
                      <Flame size={12} style={{ color: "var(--habits)" }} /> {h.name}
                      <span className="font-mono text-[10px] text-faint ml-auto">{Math.round(habitRate(h) * 100)}%</span>
                    </div>
                  ))}
                  {state.habits.filter((h) => h.linkedGoalId === goal.id).length === 0 && <div className="text-xs text-dim">No habits linked yet.</div>}
                </div>
                <div className="font-mono text-[10px] text-faint tracking-wide mb-3">NEXT ACTION</div>
                <div className="text-sm surface-2 rounded-lg p-3">
                  {goal.milestones.find((m) => !m.done)?.title || "All milestones complete — add the next one."}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {newGoalOpen && <NewGoalModal actions={actions} onClose={() => setNewGoalOpen(false)} />}
    </div>
  );
}

function NewGoalModal({ actions, onClose }: { actions: LifeOSActions; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState(isoOf(30));
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[400px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4"><span className="font-display text-lg">New goal</span><button onClick={onClose}><X size={16} className="text-faint" /></button></div>
          <FieldLabel>Title</FieldLabel>
          <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working toward?" />
          <div className="h-3" />
          <FieldLabel>Deadline</FieldLabel>
          <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <button onClick={() => { if (title.trim()) { actions.addGoal(title, deadline); onClose(); } }} className="btn-primary w-full mt-4 py-2.5 rounded-lg text-sm">Create goal</button>
        </div>
      </div>
    </Portal>
  );
}