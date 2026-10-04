"use client";
import { useEffect, useState } from "react";
import { X, Target, Pencil } from "lucide-react";
import { domainMomentum, goalProgress, habitRate } from "@/lib/derived";
import { fmtShort, isoOf } from "@/lib/date";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader, TaskCheck, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import type { Goal, LifeOSState } from "@/lib/types";
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

const trunc = (s: string, max: number) => (s.length > max ? s.slice(0, max - 2) + "…" : s);

function ConstellationMap({
  state, onSelect, selectedId, compact,
}: { state: LifeOSState; onSelect: (id: string) => void; selectedId: string | null; compact: boolean }) {
  // The SVG scales to its card's width. At 700 units wide a phone would shrink
  // the 10px labels to ~4px, so phones get a narrower canvas, a bigger label
  // size, and shorter truncation instead of the same drawing made smaller.
  const w = compact ? 360 : 700;
  const goalX = w * (compact ? 0.3 : 0.28);
  const satX = w * (compact ? 0.66 : 0.72);
  const labelSize = compact ? 11 : 10;
  const rowH = compact ? 22 : 20; // vertical space reserved per satellite item
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
      satellites.push({ ...item, goalId: goal.id, x: satX, y: sy, goalX, goalY: y });
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
          <text x={s.x + 9} y={s.y + 3} fontSize={labelSize} fill="var(--ink-dim)" fontFamily="Public Sans">
            {trunc(s.name, compact ? 18 : 26)}
          </text>
        </g>
      ))}
      {nodes.map(({ goal, y }) => {
        const prog = goalProgress(goal);
        const r = 10 + prog * 10;
        const selected = selectedId === goal.id;
        return (
          <g key={goal.id} onClick={() => onSelect(goal.id)} style={{ cursor: "pointer" }}>
            <circle cx={goalX} cy={y} r={r + 14} fill="transparent" />
            <circle cx={goalX} cy={y} r={r + 6} fill="none" stroke="var(--goals)" strokeWidth={selected ? 1.5 : 0.75} opacity={selected ? 0.6 : 0.25} />
            <circle cx={goalX} cy={y} r={r} fill="var(--goals)" opacity={0.85} />
            <text x={goalX} y={y - r - 10} fontSize="12" fontWeight="600" fill="var(--ink)" textAnchor="middle" fontFamily="Fraunces">
              {trunc(goal.title, compact ? 22 : 34)}
            </text>
            <text x={goalX} y={y + 3} fontSize={compact ? 10 : 9} fill="var(--accent-ink)" textAnchor="middle" fontFamily="IBM Plex Mono">
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
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const compact = useMediaQuery("(max-width: 767px)");
  const goal = state.goals.find((g) => g.id === selected);
  const mom = domainMomentum("goals", state);
  const hasGoals = state.goals.length > 0;

  // If goals start empty and the person adds their first one, select it
  // automatically instead of leaving the detail panel permanently blank.
  // Also re-selects when `selected` no longer matches any current goal —
  // e.g. the selected goal was just deleted — rather than leaving the panel
  // stuck pointing at a goal that no longer exists.
  useEffect(() => {
    if (selected && state.goals.some((g) => g.id === selected)) return;
    setSelected(state.goals[0]?.id ?? null);
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
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 mb-2">
              <div className="font-mono text-[10px] text-faint tracking-wide">RELATIONSHIP MAP · <span className="md:hidden">tap</span><span className="hidden md:inline">click</span> a goal</div>
              <div className="flex items-center gap-3 text-[10px] font-mono text-faint">
                <span className="flex items-center gap-1"><span className="dot" style={{ background: "var(--goals)" }} /> goal</span>
                <span className="flex items-center gap-1"><span className="dot" style={{ background: "var(--habits)" }} /> habit</span>
                <span className="flex items-center gap-1"><span className="dot" style={{ background: "var(--tasks)" }} /> task</span>
              </div>
            </div>
            <ConstellationMap state={state} onSelect={setSelected} selectedId={selected} compact={compact} />
          </div>

          {goal && (
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
              <div className="surface rounded-xl p-4 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-display text-xl" style={{ maxWidth: 280 }}>{goal.title}</h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setEditingGoal(goal)} className="icon-btn text-faint hover:text-ink p-1" aria-label="Edit goal">
                      <Pencil size={14} />
                    </button>
                    <MomentumDial state={mom.state} color="var(--goals)" size={48} />
                  </div>
                </div>
                <div className="font-mono text-[10px] text-faint mb-4">due {fmtShort(goal.deadline)} · {Math.round(goalProgress(goal) * 100)}% complete</div>
                <div className="space-y-1">
                  {goal.milestones.map((m) => (
                    <div key={m.id} className="row-hover flex items-center gap-2.5 px-2 py-2 rounded-lg">
                      <TaskCheck done={m.done} onClick={() => actions.toggleMilestone(goal.id, m.id)} />
                      <span className={`text-sm flex-1 min-w-0 ${m.done ? "line-through text-faint" : ""}`}>{m.title}</span>
                      <span className="font-mono text-[10px] text-faint">{fmtShort(m.date)}</span>
                      <button onClick={() => actions.deleteMilestone(goal.id, m.id)} className="icon-btn text-faint hover:text-ink p-0.5" aria-label="Delete milestone">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <AddMilestoneRow goalId={goal.id} actions={actions} />
              </div>
              <div className="surface rounded-xl p-4 min-w-0">
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

      {newGoalOpen && <GoalModal actions={actions} onClose={() => setNewGoalOpen(false)} />}
      {editingGoal && <GoalModal actions={actions} existing={editingGoal} onClose={() => setEditingGoal(null)} />}
    </div>
  );
}

function AddMilestoneRow({ goalId, actions }: { goalId: string; actions: LifeOSActions }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(isoOf(14));

  function submit() {
    if (!title.trim()) return;
    actions.addMilestone(goalId, title.trim(), date);
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="row-hover w-full flex items-center gap-2 px-2 py-2 max-md:py-3 rounded-lg text-left text-xs text-dim mt-1">
        <Plus size={12} /> Add milestone
      </button>
    );
  }
  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-2 mt-1 px-2">
      <div className="basis-full md:basis-0 md:flex-1 min-w-0">
        <input
          autoFocus
          className={inputCls}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
          enterKeyHint="done"
          placeholder="Milestone title"
        />
      </div>
      <div className="flex-1 md:flex-none md:w-[130px] min-w-0">
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <button onClick={submit} className="btn-primary text-xs px-2.5 py-2 max-md:px-4 max-md:py-2.5 rounded-lg flex-shrink-0" aria-label="Add milestone">
        <Plus size={13} />
      </button>
    </div>
  );
}

function GoalModal({ actions, onClose, existing }: { actions: LifeOSActions; onClose: () => void; existing?: Goal }) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [deadline, setDeadline] = useState(existing?.deadline ?? isoOf(30));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  function submit() {
    if (!title.trim()) return;
    if (existing) actions.editGoal(existing.id, title.trim(), deadline);
    else actions.addGoal(title.trim(), deadline);
    onClose();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[400px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4"><span className="font-display text-lg">{existing ? "Edit goal" : "New goal"}</span><button onClick={onClose} className="icon-btn -mr-1" aria-label="Close"><X size={16} className="text-faint" /></button></div>
          <FieldLabel>Title</FieldLabel>
          <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working toward?" />
          <div className="h-3" />
          <FieldLabel>Deadline</FieldLabel>
          <input type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          <div className="flex gap-2 mt-4">
            {existing && (
              <button onClick={() => setConfirmDeleteOpen(true)} className="py-2.5 px-4 rounded-lg text-sm hairline border" style={{ color: "var(--tasks)" }}>
                Delete
              </button>
            )}
            <button onClick={submit} className="btn-primary flex-1 py-2.5 rounded-lg text-sm">{existing ? "Save changes" : "Create goal"}</button>
          </div>
        </div>
      </div>
      {existing && confirmDeleteOpen && (
        <ConfirmModal
          title="Delete goal?"
          message={`This permanently deletes "${existing.title}" and all its milestones. Habits and tasks linked to it will stay, just unlinked. This can't be undone.`}
          confirmLabel="Delete goal"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => { actions.deleteGoal(existing.id); onClose(); }}
        />
      )}
    </Portal>
  );
}