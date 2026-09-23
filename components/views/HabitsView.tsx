"use client";
import { useState } from "react";
import { Flame, Link2, Pencil, Plus, X } from "lucide-react";
import { habitRate, habitStreak, habitMomentum, domainMomentum, MOMENTUM_META } from "@/lib/derived";
import { todayISO } from "@/lib/date";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader, TaskCheck, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { DOMAINS } from "@/lib/domains";
import type { Habit, LifeOSState } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";

function HabitHistoryRow({ habit }: { habit: Habit }) {
  const days = habit.history.slice(-28);
  return (
    <div className="flex gap-[3px] min-w-0">
      {days.map((d, i) => (
        <div key={i} title={d.date} className="rounded-[2px]"
          style={{ width: 7, height: 18, background: d.done ? DOMAINS.habits.color : "var(--line)", opacity: d.done ? 0.9 : 0.5 }} />
      ))}
    </div>
  );
}

export default function HabitsView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const [newHabitOpen, setNewHabitOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const mom = domainMomentum("habits", state);
  const hasHabits = state.habits.length > 0;

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="RECURRING · STREAKS · TARGETS" title="Habits"
        action={<button onClick={() => setNewHabitOpen(true)} className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><Plus size={13} /> New habit</button>} />

      {!hasHabits ? (
        <EmptyState icon={Flame} title="No habits yet"
          hint={'Add your first one with "New habit" above — daily reading, workouts, whatever you want to build a streak on.'} />
      ) : (
        <>
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
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                    <TaskCheck done={!!doneToday} onClick={() => actions.logHabit(h.id, todayISO())} />
                    <div className="min-w-[6.5rem] flex-1">
                      <div className="text-sm font-medium">{h.name}</div>
                      <div className="font-mono text-[10px] text-faint mt-0.5">
                        target {h.target} {h.unit} {linkedGoal && <>· <Link2 size={9} className="inline mb-0.5" /> {linkedGoal.title}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-mono text-xs" style={{ color: DOMAINS.habits.color }}>
                      <Flame size={13} /> {streak}
                    </div>
                    <span className="chip" style={{ color: hm.state === "stalled" ? "var(--tasks)" : "var(--ink-dim)" }}>{MOMENTUM_META[hm.state].label}</span>
                    <button onClick={() => setEditingHabit(h)} className="text-faint hover:text-ink p-1" aria-label="Edit habit">
                      <Pencil size={13} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <HabitHistoryRow habit={h} />
                    <span className="font-mono text-[11px] text-faint whitespace-nowrap flex-shrink-0">{Math.round(rate * 100)}% · 14d</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {newHabitOpen && <HabitModal state={state} actions={actions} onClose={() => setNewHabitOpen(false)} />}
      {editingHabit && <HabitModal state={state} actions={actions} existing={editingHabit} onClose={() => setEditingHabit(null)} />}
    </div>
  );
}

function HabitModal({
  state, actions, onClose, existing,
}: { state: LifeOSState; actions: LifeOSActions; onClose: () => void; existing?: Habit }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [target, setTarget] = useState(existing?.target ?? 4);
  const [unit, setUnit] = useState(existing?.unit ?? "days/wk");
  const [linkedGoalId, setLinkedGoalId] = useState<string>(existing?.linkedGoalId ?? "");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  function submit() {
    if (!name.trim()) return;
    if (existing) actions.editHabit(existing.id, name.trim(), target, unit, linkedGoalId || null);
    else actions.addHabit(name.trim(), target, unit, linkedGoalId || null);
    onClose();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
      <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[400px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-lg">{existing ? "Edit habit" : "New habit"}</span>
          <button onClick={onClose}><X size={16} className="text-faint" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <FieldLabel>Name</FieldLabel>
            <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 20 minutes" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Target</FieldLabel>
              <input type="number" min={1} className={inputCls} value={target} onChange={(e) => setTarget(+e.target.value)} />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="days/wk" />
            </div>
          </div>
          {state.goals.length > 0 && (
            <div>
              <FieldLabel>Link to a goal (optional)</FieldLabel>
              <select className={inputCls} value={linkedGoalId} onChange={(e) => setLinkedGoalId(e.target.value)}>
                <option value="">None</option>
                {state.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4">
          {existing && (
            <button onClick={() => setConfirmDeleteOpen(true)} className="py-2.5 px-4 rounded-lg text-sm hairline border" style={{ color: "var(--tasks)" }}>
              Delete
            </button>
          )}
          <button onClick={submit} className="btn-primary flex-1 py-2.5 rounded-lg text-sm">
            {existing ? "Save changes" : "Create habit"}
          </button>
        </div>
      </div>
      </div>
      {existing && confirmDeleteOpen && (
        <ConfirmModal
          title="Delete habit?"
          message={`This permanently deletes "${existing.name}" and its entire logged history. This can't be undone.`}
          confirmLabel="Delete habit"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => { actions.deleteHabit(existing.id); onClose(); }}
        />
      )}
    </Portal>
  );
}