"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadState, saveState } from "@/lib/storage";
import { buildEmptyState, buildExampleTemplate } from "@/lib/seed";
import { todayISO, uid, isoOf } from "@/lib/date";
import type { LifeOSState, Priority, QuickAddResult } from "@/lib/types";

export interface LifeOSActions {
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  addTask: (title: string, due: string | null) => void;
  toggleAssignment: (id: string) => void;
  addStudySession: (subjectId: string, duration: number, topic?: string) => void;
  logHabit: (habitId: string, date: string) => void;
  logHealth: (vals: Record<string, number>) => void;
  toggleMilestone: (goalId: string, msId: string) => void;
  addGoal: (title: string, deadline: string) => void;
  addHabit: (name: string, target: number, unit: string, linkedGoalId: string | null) => void;
  addSubject: (name: string) => void;
  loadExampleTemplate: () => void;
  clearAllData: () => void;
  commitQuickAdd: (parsed: QuickAddResult) => void;
}

export function useLifeOSStore(userId: string) {
  const [state, setState] = useState<LifeOSState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load this user's data from browser cache. A brand-new account starts
  // completely empty — the example template is opt-in only (see
  // loadExampleTemplate below), never applied automatically.
  useEffect(() => {
    setLoading(true);
    const existing = loadState(userId);
    if (existing) {
      setState(existing);
    } else {
      const blank = buildEmptyState();
      setState(blank);
      saveState(userId, blank);
    }
    setLoading(false);
  }, [userId]);

  // Debounced persistence back to localStorage on every change.
  useEffect(() => {
    if (!state) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const ok = saveState(userId, state);
      setSaveError(!ok);
    }, 400);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [state, userId]);

  const actions: LifeOSActions = useMemo(() => ({
    toggleTask: (id) => setState((s) => s && { ...s, tasks: s.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) }),

    toggleSubtask: (taskId, subId) => setState((s) => s && {
      ...s,
      tasks: s.tasks.map((t) => t.id === taskId ? { ...t, subtasks: t.subtasks.map((st) => st.id === subId ? { ...st, done: !st.done } : st) } : t),
    }),

    addTask: (title, due) => setState((s) => s && {
      ...s,
      tasks: [{ id: uid("t"), title, project: "Inbox", priority: "med" as Priority, due, done: false, subtasks: [], recurring: null, linkedGoalId: null }, ...s.tasks],
    }),

    toggleAssignment: (id) => setState((s) => s && { ...s, assignments: s.assignments.map((a) => a.id === id ? { ...a, done: !a.done } : a) }),

    addStudySession: (subjectId, duration, topic) => setState((s) => s && {
      ...s,
      studySessions: [{ id: uid("ss"), subjectId, date: todayISO(), duration, topic: topic || "Focused session" }, ...s.studySessions],
    }),

    logHabit: (habitId, date) => setState((s) => s && {
      ...s,
      habits: s.habits.map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.history.find((x) => x.date === date);
        const history = exists
          ? h.history.map((x) => x.date === date ? { ...x, done: !x.done } : x)
          : [...h.history, { date, done: true }];
        return { ...h, history };
      }),
    }),

    logHealth: (vals) => setState((s) => {
      if (!s) return s;
      const date = todayISO();
      const exists = s.healthLogs.find((l) => l.date === date);
      const entry = { date, ...vals } as LifeOSState["healthLogs"][number];
      return { ...s, healthLogs: exists ? s.healthLogs.map((l) => l.date === date ? entry : l) : [...s.healthLogs, entry] };
    }),

    toggleMilestone: (goalId, msId) => setState((s) => s && {
      ...s,
      goals: s.goals.map((g) => g.id === goalId
        ? { ...g, milestones: g.milestones.map((m) => m.id === msId ? { ...m, done: !m.done, date: !m.done ? todayISO() : m.date } : m) }
        : g),
    }),

    addGoal: (title, deadline) => setState((s) => s && {
      ...s,
      goals: [...s.goals, {
        id: uid("goal"), title, domain: "goals" as const, deadline, createdAt: todayISO(),
        milestones: [{ id: uid("ms"), title: "Define first milestone", done: false, date: deadline }],
        linkedHabitIds: [], linkedTaskIds: [],
      }],
    }),

    addHabit: (name, target, unit, linkedGoalId) => setState((s) => s && {
      ...s,
      habits: [...s.habits, { id: uid("hab"), name, domain: "habits" as const, target, unit, linkedGoalId, history: [] }],
    }),

    addSubject: (name) => setState((s) => s && {
      ...s,
      subjects: [...s.subjects, { id: uid("sub"), name, color: "var(--academics)" }],
    }),

    // Overwrites current data with the fully-populated example dataset.
    // Deliberately a hard replace, not a merge — this is meant for someone
    // exploring the app, not for mixing demo data into real tracking.
    loadExampleTemplate: () => setState(() => buildExampleTemplate()),

    // Wipes everything — example template or real data, doesn't matter —
    // back to a blank slate. The confirmation step lives in the UI, not
    // here; this action itself doesn't ask twice.
    clearAllData: () => setState(() => buildEmptyState()),

    commitQuickAdd: (parsed) => setState((s) => {
      if (!s) return s;
      const { type, fields } = parsed;

      if (type === "task") {
        return { ...s, tasks: [{
          id: uid("t"), title: String(fields.title || "Untitled task"), project: String(fields.project || "Inbox"),
          priority: (fields.priority as Priority) || "med", due: (fields.due as string) || null, done: false,
          subtasks: [], recurring: null, linkedGoalId: null,
        }, ...s.tasks] };
      }
      if (type === "goal") {
        return { ...s, goals: [...s.goals, {
          id: uid("goal"), title: String(fields.title || "Untitled goal"), domain: "goals" as const,
          deadline: String(fields.deadline || isoOf(30)), createdAt: todayISO(), milestones: [],
          linkedHabitIds: [], linkedTaskIds: [],
        }] };
      }
      if (type === "assignment") {
        const subj = s.subjects.find((x) => x.name.toLowerCase() === String(fields.subject || "").toLowerCase())
          || s.subjects.find((x) => x.id === fields.subjectId) || s.subjects[0];
        return { ...s, assignments: [...s.assignments, {
          id: uid("as"), subjectId: subj?.id || "", title: String(fields.title || "Untitled assignment"),
          due: String(fields.due || isoOf(3)), done: false, grade: null, weight: "med" as const,
        }] };
      }
      if (type === "study") {
        const subj = s.subjects.find((x) => x.name.toLowerCase().includes(String(fields.subject || "").toLowerCase()))
          || s.subjects.find((x) => x.id === fields.subjectId) || s.subjects[0];
        return { ...s, studySessions: [{
          id: uid("ss"), subjectId: subj?.id || "", date: String(fields.date || todayISO()),
          duration: Number(fields.duration) || 30, topic: String(fields.topic || "Study session"),
        }, ...s.studySessions] };
      }
      if (type === "habit") {
        const h = s.habits.find((x) => x.id === fields.habitId)
          || s.habits.find((x) => x.name.toLowerCase().includes(String(fields.name || "").toLowerCase()))
          || s.habits[0];
        if (!h) return s;
        const date = String(fields.date || todayISO());
        const exists = h.history.find((x) => x.date === date);
        return { ...s, habits: s.habits.map((hh) => hh.id === h.id
          ? { ...hh, history: exists ? hh.history.map((x) => x.date === date ? { ...x, done: true } : x) : [...hh.history, { date, done: true }] }
          : hh) };
      }
      if (type === "health") {
        const date = String(fields.date || todayISO());
        const metric = fields.metric as string | undefined;
        const last = s.healthLogs[s.healthLogs.length - 1];
        const base = s.healthLogs.find((l) => l.date === date) || { ...last, date };
        const numeric = parseFloat(String(fields.value));
        const updated = metric && !isNaN(numeric) ? { ...base, [metric]: numeric } : base;
        const exists = s.healthLogs.find((l) => l.date === date);
        return { ...s, healthLogs: exists ? s.healthLogs.map((l) => l.date === date ? updated : l) : [...s.healthLogs, updated] };
      }
      return s;
    }),
  }), []);

  return { state, loading, saveError, actions };
}