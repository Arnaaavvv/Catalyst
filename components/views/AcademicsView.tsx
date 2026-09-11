"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Plus, X, GraduationCap } from "lucide-react";
import { todayISO, fmtShort, daysBetween } from "@/lib/date";
import { SectionHeader, TaskCheck, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import type { LifeOSState } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";

export default function AcademicsView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const [timerSubject, setTimerSubject] = useState(state.subjects[0]?.id);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubjects = state.subjects.length > 0;

  // If subjects start empty and the person adds their first one, the timer's
  // subject picker needs to pick it up instead of staying stuck on undefined.
  useEffect(() => {
    if (!timerSubject && state.subjects[0]) setTimerSubject(state.subjects[0].id);
  }, [state.subjects, timerSubject]);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [running]);

  function finishSession() {
    if (!timerSubject) return;
    setRunning(false);
    const mins = Math.max(1, Math.round(timerSeconds / 60));
    actions.addStudySession(timerSubject, mins);
    setTimerSeconds(0);
  }

  const mm = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const ss = String(timerSeconds % 60).padStart(2, "0");

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="SUBJECTS · ASSIGNMENTS · STUDY" title="Academics"
        action={<button onClick={() => setNewSubjectOpen(true)} className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><Plus size={13} /> New subject</button>} />

      {!hasSubjects ? (
        <EmptyState icon={GraduationCap} title="No subjects yet"
          hint={'Add your first subject with "New subject" above to start tracking assignments and study sessions.'} />
      ) : (
        <>
          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="surface rounded-xl p-4">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">FOCUSED STUDY MODE</div>
              <div className="flex items-center gap-4">
                <div className="font-mono text-4xl tabular-nums" style={{ color: "var(--academics)" }}>{mm}:{ss}</div>
                <div className="flex-1">
                  <select className={inputCls + " mb-2"} value={timerSubject} onChange={(e) => setTimerSubject(e.target.value)} disabled={running}>
                    {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setRunning((r) => !r)} className="btn-primary flex-1 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5">
                      {running ? <Pause size={12} /> : <Play size={12} />} {running ? "Pause" : "Start"}
                    </button>
                    {timerSeconds > 0 && (
                      <button onClick={finishSession} className="flex-1 py-2 rounded-lg text-xs hairline border flex items-center justify-center gap-1.5">
                        <Square size={11} /> Log
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="surface rounded-xl p-4">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">STUDY LOAD · LAST 7 DAYS</div>
              <div className="space-y-2">
                {state.subjects.map((s) => {
                  const mins = state.studySessions.filter((ss2) => ss2.subjectId === s.id && daysBetween(ss2.date, todayISO()) <= 7).reduce((a, b) => a + b.duration, 0);
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="text-xs w-36 truncate">{s.name}</span>
                      <div className="flex-1 h-1.5 rounded-full surface-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, mins / 2)}%`, background: "var(--academics)" }} />
                      </div>
                      <span className="font-mono text-[10px] text-faint w-10 text-right">{mins}m</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
            <div className="surface rounded-xl p-4">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">ASSIGNMENTS & EXAMS</div>
              {state.assignments.length === 0 ? (
                <div className="text-xs text-dim py-4">No assignments tracked yet. Add one with ⌘K.</div>
              ) : (
                <div className="space-y-0.5">
                  {[...state.assignments].sort((a, b) => (a.due < b.due ? -1 : 1)).map((a) => {
                    const sub = state.subjects.find((s) => s.id === a.subjectId);
                    return (
                      <div key={a.id} className="row-hover flex items-center gap-2.5 px-2 py-2.5 rounded-lg">
                        <TaskCheck done={a.done} onClick={() => actions.toggleAssignment(a.id)} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${a.done ? "line-through text-faint" : ""}`}>{a.title}</div>
                          <div className="text-[10px] text-faint">{sub?.name}</div>
                        </div>
                        {a.grade && <span className="chip" style={{ color: "var(--academics)", borderColor: "var(--academics)" }}>{a.grade}</span>}
                        <span className="font-mono text-[10px] text-faint w-14 text-right">{fmtShort(a.due)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="surface rounded-xl p-4">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">RECENT SESSIONS</div>
              {state.studySessions.length === 0 ? (
                <div className="text-xs text-dim py-4">No study sessions logged yet.</div>
              ) : (
                <div className="space-y-2.5">
                  {[...state.studySessions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6).map((s) => {
                    const sub = state.subjects.find((x) => x.id === s.subjectId);
                    return (
                      <div key={s.id} className="text-xs">
                        <div className="flex justify-between"><span className="font-medium">{s.topic}</span><span className="font-mono text-faint">{s.duration}m</span></div>
                        <div className="text-faint">{sub?.name} · {fmtShort(s.date)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {newSubjectOpen && <NewSubjectModal actions={actions} onClose={() => setNewSubjectOpen(false)} />}
    </div>
  );
}

function NewSubjectModal({ actions, onClose }: { actions: LifeOSActions; onClose: () => void }) {
  const [name, setName] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
      <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[380px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-display text-lg">New subject</span>
          <button onClick={onClose}><X size={16} className="text-faint" /></button>
        </div>
        <FieldLabel>Name</FieldLabel>
        <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic Chemistry" />
        <button
          onClick={() => { if (name.trim()) { actions.addSubject(name.trim()); onClose(); } }}
          className="btn-primary w-full mt-4 py-2.5 rounded-lg text-sm"
        >
          Add subject
        </button>
      </div>
    </div>
  );
}