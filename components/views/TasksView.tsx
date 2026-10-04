"use client";
import { useState } from "react";
import { Plus, ChevronDown, Repeat, Pencil, X } from "lucide-react";
import { todayISO, fmtShort, isoOf } from "@/lib/date";
import { SectionHeader, TaskCheck, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import ConfirmModal from "@/components/shared/ConfirmModal";
import type { LifeOSState, Priority, Task } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { CheckSquare } from "lucide-react";

const TASK_FILTERS = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "inbox", label: "Inbox" },
  { id: "all", label: "All" },
] as const;

const PRIORITY_COLOR: Record<Priority, string> = { high: "var(--tasks)", med: "var(--habits)", low: "var(--ink-faint)" };

export default function TasksView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const [filter, setFilter] = useState<(typeof TASK_FILTERS)[number]["id"]>("today");
  const [newTitle, setNewTitle] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const compact = useMediaQuery("(max-width: 767px)");
  const today = todayISO();

  function addNew() {
    if (!newTitle.trim()) return;
    actions.addTask(newTitle, filter === "upcoming" ? isoOf(2) : today);
    setNewTitle("");
  }

  const filtered = state.tasks.filter((t) => {
    if (filter === "today") return t.due === today || (t.due && t.due < today && !t.done);
    if (filter === "upcoming") return t.due && t.due > today;
    if (filter === "inbox") return !t.due;
    return true;
  }).sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="INBOX · PROJECTS · PRIORITIES" title="Tasks" />

      <div className="flex items-center gap-2 mb-4">
        <div className="flex flex-1 md:flex-none gap-1 surface-2 p-1 rounded-lg">
          {TASK_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="flex-1 md:flex-none text-xs px-3 py-2.5 md:py-1.5 rounded-md font-medium"
              style={{ background: filter === f.id ? "var(--surface)" : "transparent", color: filter === f.id ? "var(--ink)" : "var(--ink-dim)" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="surface rounded-xl p-3 md:p-4 mb-4">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-faint flex-shrink-0 ml-1 md:ml-0" />
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addNew(); }}
            enterKeyHint="done"
            placeholder={compact ? "Add a task…" : "Add a task and press Enter…"} className="flex-1 min-w-0 bg-transparent text-sm max-md:py-2" style={{ border: "none" }} />
          {newTitle.trim() && (
            <button onClick={addNew} className="md:hidden btn-primary text-xs px-4 py-2.5 rounded-lg flex-shrink-0">Add</button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="All clear" hint="Nothing here right now." />
      ) : (
        <div>
          {filtered.map((t) => {
            const isOpen = expanded[t.id];
            return (
              <div key={t.id} className="surface rounded-xl mb-2 overflow-hidden">
                <div className="row-hover flex flex-wrap md:flex-nowrap items-center gap-x-2.5 gap-y-1.5 px-3 py-3">
                  <TaskCheck done={t.done} onClick={() => actions.toggleTask(t.id)} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${t.done ? "line-through text-faint" : ""}`}>{t.title}</div>
                  </div>
                  {/* On a phone the metadata drops to its own line under the title (29px = checkbox + gap); from md up it sits inline as before. */}
                  <div className="order-last basis-full pl-[calc(var(--check)_+_10px)] md:order-none md:basis-auto md:pl-0 flex items-center gap-2.5">
                    <span className="dot" style={{ background: PRIORITY_COLOR[t.priority] }} title={t.priority} />
                    {t.due && <span className="font-mono text-[10px] text-faint md:w-14 md:text-right">{fmtShort(t.due)}</span>}
                    <span className="chip text-faint">{t.project}</span>
                    {t.recurring && <Repeat size={11} className="text-faint" />}
                  </div>
                  {t.subtasks.length > 0 && (
                    <button onClick={() => setExpanded((s) => ({ ...s, [t.id]: !isOpen }))} className="icon-btn text-faint"
                      aria-label={isOpen ? "Hide subtasks" : "Show subtasks"} aria-expanded={!!isOpen}>
                      <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                    </button>
                  )}
                  <button onClick={() => setEditingTask(t)} className="icon-btn text-faint hover:text-ink p-1" aria-label="Edit task">
                    <Pencil size={13} />
                  </button>
                </div>
                {isOpen && t.subtasks.length > 0 && (
                  <div className="pl-9 pb-2.5 space-y-1">
                    {t.subtasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-2 py-1">
                        <TaskCheck done={st.done} onClick={() => actions.toggleSubtask(t.id, st.id)} />
                        <span className={`text-xs ${st.done ? "line-through text-faint" : "text-dim"}`}>{st.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editingTask && <EditTaskModal task={editingTask} actions={actions} onClose={() => setEditingTask(null)} />}
    </div>
  );
}

function EditTaskModal({ task, actions, onClose }: { task: Task; actions: LifeOSActions; onClose: () => void }) {
  const [title, setTitle] = useState(task.title);
  const [project, setProject] = useState(task.project);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [due, setDue] = useState(task.due || "");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[420px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-lg">Edit task</span>
            <button onClick={onClose} className="icon-btn -mr-1" aria-label="Close"><X size={16} className="text-faint" /></button>
          </div>
          <div className="space-y-3">
            <div>
              <FieldLabel>Title</FieldLabel>
              <input autoFocus className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <FieldLabel>Project</FieldLabel>
              <input className={inputCls} value={project} onChange={(e) => setProject(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Due</FieldLabel>
                <input type="date" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Priority</FieldLabel>
                <select className={inputCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                  <option value="low">Low</option>
                  <option value="med">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setConfirmDeleteOpen(true)} className="py-2.5 px-4 rounded-lg text-sm hairline border" style={{ color: "var(--tasks)" }}>
              Delete
            </button>
            <button
              onClick={() => { if (title.trim()) { actions.editTask(task.id, title.trim(), project.trim() || "Inbox", priority, due || null); onClose(); } }}
              className="btn-primary flex-1 py-2.5 rounded-lg text-sm"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
      {confirmDeleteOpen && (
        <ConfirmModal
          title="Delete task?"
          message={`This permanently deletes "${task.title}"${task.subtasks.length ? ` and its ${task.subtasks.length} subtask${task.subtasks.length === 1 ? "" : "s"}` : ""}. This can't be undone.`}
          confirmLabel="Delete task"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => { actions.deleteTask(task.id); onClose(); }}
        />
      )}
    </Portal>
  );
}