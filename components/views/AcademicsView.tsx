"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square, Plus, X, GraduationCap, Pencil } from "lucide-react";
import { todayISO, fmtShort, daysBetween } from "@/lib/date";
import { SectionHeader, TaskCheck, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import type { Assignment, LifeOSState, StudySession, Subject } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";

export default function AcademicsView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const [timerSubject, setTimerSubject] = useState(state.subjects[0]?.id);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [newSubjectOpen, setNewSubjectOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubjects = state.subjects.length > 0;

  // If subjects start empty and the person adds their first one, the timer's
  // subject picker needs to pick it up instead of staying stuck on undefined.
  // Also resets if the timer's subject was deleted (no longer among
  // state.subjects), rather than leaving the picker pointing at a ghost id.
  useEffect(() => {
    if (timerSubject && state.subjects.some((s) => s.id === timerSubject)) return;
    setTimerSubject(state.subjects[0]?.id);
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
          <div className="grid gap-5 mb-5 grid-cols-1 md:grid-cols-2">
            <div className="surface rounded-xl p-4 min-w-0">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">FOCUSED STUDY MODE</div>
              <div className="flex items-center gap-4">
                <div className="font-mono text-4xl tabular-nums" style={{ color: "var(--academics)" }}>{mm}:{ss}</div>
                <div className="flex-1">
                  <select className={inputCls + " mb-2"} value={timerSubject} onChange={(e) => setTimerSubject(e.target.value)} disabled={running}>
                    {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setRunning((r) => !r)} className="btn-primary flex-1 py-2 max-md:py-3 rounded-lg text-xs flex items-center justify-center gap-1.5">
                      {running ? <Pause size={12} /> : <Play size={12} />} {running ? "Pause" : "Start"}
                    </button>
                    {timerSeconds > 0 && (
                      <button onClick={finishSession} className="flex-1 py-2 max-md:py-3 rounded-lg text-xs hairline border flex items-center justify-center gap-1.5">
                        <Square size={11} /> Log
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="surface rounded-xl p-4 min-w-0">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">STUDY LOAD · LAST 7 DAYS</div>
              <div className="space-y-2">
                {state.subjects.map((s) => {
                  const mins = state.studySessions.filter((ss2) => ss2.subjectId === s.id && daysBetween(ss2.date, todayISO()) <= 7).reduce((a, b) => a + b.duration, 0);
                  return (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="text-xs w-28 md:w-36 truncate">{s.name}</span>
                      <div className="flex-1 h-1.5 rounded-full surface-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, mins / 2)}%`, background: "var(--academics)" }} />
                      </div>
                      <span className="font-mono text-[10px] text-faint w-10 text-right">{mins}m</span>
                      <button onClick={() => setEditingSubject(s)} className="icon-btn text-faint hover:text-ink p-0.5" aria-label="Edit subject">
                        <Pencil size={12} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-5 grid-cols-1 md:grid-cols-[1.3fr_1fr]">
            <div className="surface rounded-xl p-4 min-w-0">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">ASSIGNMENTS & EXAMS</div>
              {state.assignments.length === 0 ? (
                <div className="text-xs text-dim py-4">No assignments tracked yet. Add one with <span className="md:hidden">the + button</span><span className="hidden md:inline">Ctrl + K</span>.</div>
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
                        <button onClick={() => setEditingAssignment(a)} className="icon-btn text-faint hover:text-ink p-1" aria-label="Edit assignment">
                          <Pencil size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="surface rounded-xl p-4 min-w-0">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">RECENT SESSIONS</div>
              {state.studySessions.length === 0 ? (
                <div className="text-xs text-dim py-4">No study sessions logged yet.</div>
              ) : (
                <div className="space-y-2.5">
                  {[...state.studySessions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6).map((s) => {
                    const sub = state.subjects.find((x) => x.id === s.subjectId);
                    return (
                      <div key={s.id} className="row-hover -mx-1 px-1 py-1 rounded-lg text-xs flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between"><span className="font-medium">{s.topic}</span><span className="font-mono text-faint">{s.duration}m</span></div>
                          <div className="text-faint">{sub?.name} · {fmtShort(s.date)}</div>
                        </div>
                        <button onClick={() => setEditingSession(s)} className="icon-btn text-faint hover:text-ink p-1" aria-label="Edit study session">
                          <Pencil size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {newSubjectOpen && <SubjectModal actions={actions} onClose={() => setNewSubjectOpen(false)} />}
      {editingSubject && <SubjectModal actions={actions} existing={editingSubject} onClose={() => setEditingSubject(null)} />}
      {editingAssignment && <AssignmentModal state={state} actions={actions} existing={editingAssignment} onClose={() => setEditingAssignment(null)} />}
      {editingSession && <StudySessionModal state={state} actions={actions} existing={editingSession} onClose={() => setEditingSession(null)} />}
    </div>
  );
}

function SubjectModal({ actions, onClose, existing }: { actions: LifeOSActions; onClose: () => void; existing?: Subject }) {
  const [name, setName] = useState(existing?.name ?? "");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  function submit() {
    if (!name.trim()) return;
    if (existing) actions.editSubject(existing.id, name.trim());
    else actions.addSubject(name.trim());
    onClose();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[380px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-lg">{existing ? "Edit subject" : "New subject"}</span>
            <button onClick={onClose} className="icon-btn -mr-1" aria-label="Close"><X size={16} className="text-faint" /></button>
          </div>
          <FieldLabel>Name</FieldLabel>
          <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organic Chemistry" />
          <div className="flex gap-2 mt-4">
            {existing && (
              <button onClick={() => setConfirmDeleteOpen(true)} className="py-2.5 px-4 rounded-lg text-sm hairline border" style={{ color: "var(--tasks)" }}>
                Delete
              </button>
            )}
            <button onClick={submit} className="btn-primary flex-1 py-2.5 rounded-lg text-sm">
              {existing ? "Save changes" : "Add subject"}
            </button>
          </div>
        </div>
      </div>
      {existing && confirmDeleteOpen && (
        <ConfirmModal
          title="Delete subject?"
          message={`This permanently deletes "${existing.name}" along with all its assignments and study sessions. This can't be undone.`}
          confirmLabel="Delete subject"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => { actions.deleteSubject(existing.id); onClose(); }}
        />
      )}
    </Portal>
  );
}

function AssignmentModal({
  state, actions, onClose, existing,
}: { state: LifeOSState; actions: LifeOSActions; onClose: () => void; existing: Assignment }) {
  const [title, setTitle] = useState(existing.title);
  const [subjectId, setSubjectId] = useState(existing.subjectId);
  const [due, setDue] = useState(existing.due);
  const [weight, setWeight] = useState<Assignment["weight"]>(existing.weight);
  const [grade, setGrade] = useState(existing.grade ?? "");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[400px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4"><span className="font-display text-lg">Edit assignment</span><button onClick={onClose} className="icon-btn -mr-1" aria-label="Close"><X size={16} className="text-faint" /></button></div>
          <div className="space-y-3">
            <div>
              <FieldLabel>Title</FieldLabel>
              <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Subject</FieldLabel>
                <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel>Due</FieldLabel>
                <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Weight</FieldLabel>
                <select className={inputCls} value={weight} onChange={(e) => setWeight(e.target.value as Assignment["weight"])}>
                  <option value="low">Low</option>
                  <option value="med">Medium</option>
                  <option value="high">High</option>
                  <option value="exam">Exam</option>
                </select>
              </div>
              <div>
                <FieldLabel>Grade (optional)</FieldLabel>
                <input className={inputCls} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. A-" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setConfirmDeleteOpen(true)} className="py-2.5 px-4 rounded-lg text-sm hairline border" style={{ color: "var(--tasks)" }}>
              Delete
            </button>
            <button
              onClick={() => { if (title.trim()) { actions.editAssignment(existing.id, title.trim(), subjectId, due, weight, grade.trim() || null); onClose(); } }}
              className="btn-primary flex-1 py-2.5 rounded-lg text-sm"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
      {confirmDeleteOpen && (
        <ConfirmModal
          title="Delete assignment?"
          message={`This permanently deletes "${existing.title}". This can't be undone.`}
          confirmLabel="Delete assignment"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => { actions.deleteAssignment(existing.id); onClose(); }}
        />
      )}
    </Portal>
  );
}

function StudySessionModal({
  state, actions, onClose, existing,
}: { state: LifeOSState; actions: LifeOSActions; onClose: () => void; existing: StudySession }) {
  const [subjectId, setSubjectId] = useState(existing.subjectId);
  const [topic, setTopic] = useState(existing.topic);
  const [duration, setDuration] = useState(existing.duration);
  const [date, setDate] = useState(existing.date);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[400px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4"><span className="font-display text-lg">Edit study session</span><button onClick={onClose} className="icon-btn -mr-1" aria-label="Close"><X size={16} className="text-faint" /></button></div>
          <div className="space-y-3">
            <div>
              <FieldLabel>Subject</FieldLabel>
              <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Topic</FieldLabel>
              <input autoFocus className={inputCls} value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Minutes</FieldLabel>
                <input type="number" min={1} className={inputCls} value={duration} onChange={(e) => setDuration(+e.target.value)} />
              </div>
              <div>
                <FieldLabel>Date</FieldLabel>
                <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setConfirmDeleteOpen(true)} className="py-2.5 px-4 rounded-lg text-sm hairline border" style={{ color: "var(--tasks)" }}>
              Delete
            </button>
            <button
              onClick={() => { if (topic.trim()) { actions.editStudySession(existing.id, subjectId, topic.trim(), Math.max(1, duration), date); onClose(); } }}
              className="btn-primary flex-1 py-2.5 rounded-lg text-sm"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
      {confirmDeleteOpen && (
        <ConfirmModal
          title="Delete study session?"
          message="This permanently deletes this logged session. This can't be undone."
          confirmLabel="Delete session"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => { actions.deleteStudySession(existing.id); onClose(); }}
        />
      )}
    </Portal>
  );
}