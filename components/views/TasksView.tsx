"use client";
import { useState } from "react";
import { Plus, ChevronDown, Repeat } from "lucide-react";
import { todayISO, fmtShort, isoOf } from "@/lib/date";
import { SectionHeader, TaskCheck, EmptyState } from "@/components/shared/Primitives";
import type { LifeOSState, Priority } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";
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
  const today = todayISO();

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
        <div className="flex gap-1 surface-2 p-1 rounded-lg">
          {TASK_FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className="text-xs px-3 py-1.5 rounded-md font-medium"
              style={{ background: filter === f.id ? "var(--surface)" : "transparent", color: filter === f.id ? "var(--ink)" : "var(--ink-dim)" }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="surface rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-faint" />
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && newTitle.trim()) { actions.addTask(newTitle, filter === "upcoming" ? isoOf(2) : today); setNewTitle(""); } }}
            placeholder="Add a task and press Enter…" className="flex-1 bg-transparent text-sm" style={{ border: "none" }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={CheckSquare} title="All clear" hint="Nothing here right now." />
      ) : (
        <div className="space-y-0.5">
          {filtered.map((t) => {
            const isOpen = expanded[t.id];
            return (
              <div key={t.id} className="surface rounded-xl mb-2 overflow-hidden">
                <div className="row-hover flex items-center gap-2.5 px-3 py-3">
                  <TaskCheck done={t.done} onClick={() => actions.toggleTask(t.id)} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${t.done ? "line-through text-faint" : ""}`}>{t.title}</div>
                  </div>
                  <span className="dot" style={{ background: PRIORITY_COLOR[t.priority] }} title={t.priority} />
                  {t.due && <span className="font-mono text-[10px] text-faint w-14 text-right">{fmtShort(t.due)}</span>}
                  <span className="chip text-faint">{t.project}</span>
                  {t.recurring && <Repeat size={11} className="text-faint" />}
                  {t.subtasks.length > 0 && (
                    <button onClick={() => setExpanded((s) => ({ ...s, [t.id]: !isOpen }))} className="text-faint">
                      <ChevronDown size={13} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
                    </button>
                  )}
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
    </div>
  );
}
