"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadState, saveState } from "@/lib/storage";
import { buildEmptyState, buildExampleTemplate } from "@/lib/seed";
import { defaultHealthLogValues } from "@/lib/health";
import { todayISO, uid, isoOf } from "@/lib/date";
import type { Assignment, HealthLog, LifeOSState, Priority, QuickAddResult } from "@/lib/types";

export interface LifeOSActions {
  toggleTask: (id: string) => void;
  toggleSubtask: (taskId: string, subId: string) => void;
  addTask: (title: string, due: string | null) => void;
  editTask: (id: string, title: string, project: string, priority: Priority, due: string | null) => void;
  deleteTask: (id: string) => void;

  toggleAssignment: (id: string) => void;
  editAssignment: (id: string, title: string, subjectId: string, due: string, weight: Assignment["weight"], grade: string | null) => void;
  deleteAssignment: (id: string) => void;

  addStudySession: (subjectId: string, duration: number, topic?: string) => void;
  editStudySession: (id: string, subjectId: string, topic: string, duration: number, date: string) => void;
  deleteStudySession: (id: string) => void;

  logHabit: (habitId: string, date: string) => void;
  addHabit: (name: string, target: number, unit: string, linkedGoalId: string | null) => void;
  editHabit: (id: string, name: string, target: number, unit: string, linkedGoalId: string | null) => void;
  deleteHabit: (id: string) => void;

  // Replaces the entry at `date` wholesale. When `originalDate` is given and
  // differs from `date`, the row at `originalDate` is dropped first — this
  // is what lets an edit "move" an entry to a different day without leaving
  // a stale duplicate behind at the day it used to be on.
  saveHealthLog: (date: string, vals: Omit<HealthLog, "date">, originalDate?: string) => void;
  deleteHealthLog: (date: string) => void;

  toggleMilestone: (goalId: string, msId: string) => void;
  addMilestone: (goalId: string, title: string, date: string) => void;
  deleteMilestone: (goalId: string, msId: string) => void;

  addGoal: (title: string, deadline: string) => void;
  editGoal: (id: string, title: string, deadline: string) => void;
  deleteGoal: (id: string) => void;

  addSubject: (name: string) => void;
  editSubject: (id: string, name: string) => void;
  deleteSubject: (id: string) => void;

  loadExampleTemplate: () => void;
  clearAllData: () => void;
  commitQuickAdd: (parsed: QuickAddResult) => void;
}

export type StoreStatus = "loading" | "error" | "ready";

export function useLifeOSStore(userId: string) {
  const [state, setState] = useState<LifeOSState | null>(null);
  const [status, setStatus] = useState<StoreStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against immediately re-saving the exact data we just loaded —
  // without this, every load (including a plain page refresh) would fire an
  // unnecessary upsert back to Supabase before the person has changed anything.
  const skipNextSaveRef = useRef(true);

  // Load this user's data from Supabase. A load *failure* is deliberately
  // kept distinct from "no data yet" (a brand-new account, data === null).
  // Treating a failed fetch as an empty account would be actively dangerous:
  // the save effect below would then upsert that "empty" state and overwrite
  // whatever real data exists server-side the moment it fires.
  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setLoadError(null);
    skipNextSaveRef.current = true;

    loadState(userId).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setStatus("error");
        setLoadError(result.message);
        return;
      }
      setState(result.data ?? buildEmptyState());
      setStatus("ready");
    });

    return () => {
      cancelled = true;
    };
  }, [userId, retryToken]);

  // Debounced persistence back to Supabase on every change to `state` — but
  // skips its own first run right after a (re)load, per skipNextSaveRef above.
  // Only ever runs once status is "ready": while loading or errored, there's
  // either no confirmed-safe state yet, or (in the error case) writing could
  // clobber real remote data with whatever placeholder state exists locally.
  useEffect(() => {
    if (status !== "ready" || !state) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ok = await saveState(userId, state);
      setSaveError(!ok);
    }, 600);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [state, status, userId]);

  const actions: LifeOSActions = useMemo(() => ({
    toggleTask: (id) => setState((s) => s && {
      ...s,
      tasks: s.tasks.map((t) => t.id === id ? { ...t, done: !t.done, completedAt: !t.done ? todayISO() : null } : t),
    }),

    toggleSubtask: (taskId, subId) => setState((s) => s && {
      ...s,
      tasks: s.tasks.map((t) => t.id === taskId ? { ...t, subtasks: t.subtasks.map((st) => st.id === subId ? { ...st, done: !st.done } : st) } : t),
    }),

    addTask: (title, due) => setState((s) => s && {
      ...s,
      tasks: [{ id: uid("t"), title, project: "Inbox", priority: "med" as Priority, due, done: false, completedAt: null, subtasks: [], recurring: null, linkedGoalId: null }, ...s.tasks],
    }),

    // Doesn't touch subtasks, recurring, done, or linkedGoalId — none of
    // those are exposed as editable fields, so they pass through untouched.
    editTask: (id, title, project, priority, due) => setState((s) => s && {
      ...s,
      tasks: s.tasks.map((t) => t.id === id ? { ...t, title, project, priority, due } : t),
    }),

    deleteTask: (id) => setState((s) => s && { ...s, tasks: s.tasks.filter((t) => t.id !== id) }),

    toggleAssignment: (id) => setState((s) => s && {
      ...s,
      assignments: s.assignments.map((a) => a.id === id ? { ...a, done: !a.done, completedAt: !a.done ? todayISO() : null } : a),
    }),

    editAssignment: (id, title, subjectId, due, weight, grade) => setState((s) => s && {
      ...s,
      assignments: s.assignments.map((a) => a.id === id ? { ...a, title, subjectId, due, weight, grade } : a),
    }),

    deleteAssignment: (id) => setState((s) => s && { ...s, assignments: s.assignments.filter((a) => a.id !== id) }),

    addStudySession: (subjectId, duration, topic) => setState((s) => s && {
      ...s,
      studySessions: [{ id: uid("ss"), subjectId, date: todayISO(), duration, topic: topic || "Focused session" }, ...s.studySessions],
    }),

    editStudySession: (id, subjectId, topic, duration, date) => setState((s) => s && {
      ...s,
      studySessions: s.studySessions.map((ss) => ss.id === id ? { ...ss, subjectId, topic, duration, date } : ss),
    }),

    deleteStudySession: (id) => setState((s) => s && { ...s, studySessions: s.studySessions.filter((ss) => ss.id !== id) }),

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

    addHabit: (name, target, unit, linkedGoalId) => setState((s) => s && {
      ...s,
      habits: [...s.habits, { id: uid("hab"), name, domain: "habits" as const, target, unit, linkedGoalId, history: [] }],
    }),

    editHabit: (id, name, target, unit, linkedGoalId) => setState((s) => s && {
      ...s,
      habits: s.habits.map((h) => h.id === id ? { ...h, name, target, unit, linkedGoalId } : h),
    }),

    deleteHabit: (id) => setState((s) => s && { ...s, habits: s.habits.filter((h) => h.id !== id) }),

    saveHealthLog: (date, vals, originalDate) => setState((s) => {
      if (!s) return s;
      const entry: LifeOSState["healthLogs"][number] = { date, ...vals };
      const logs = originalDate && originalDate !== date
        ? s.healthLogs.filter((l) => l.date !== originalDate)
        : s.healthLogs;
      const exists = logs.find((l) => l.date === date);
      return { ...s, healthLogs: exists ? logs.map((l) => l.date === date ? entry : l) : [...logs, entry] };
    }),

    deleteHealthLog: (date) => setState((s) => s && { ...s, healthLogs: s.healthLogs.filter((l) => l.date !== date) }),

    toggleMilestone: (goalId, msId) => setState((s) => s && {
      ...s,
      goals: s.goals.map((g) => g.id === goalId
        ? { ...g, milestones: g.milestones.map((m) => m.id === msId ? { ...m, done: !m.done, date: !m.done ? todayISO() : m.date } : m) }
        : g),
    }),

    addMilestone: (goalId, title, date) => setState((s) => s && {
      ...s,
      goals: s.goals.map((g) => g.id === goalId
        ? { ...g, milestones: [...g.milestones, { id: uid("ms"), title, done: false, date }] }
        : g),
    }),

    deleteMilestone: (goalId, msId) => setState((s) => s && {
      ...s,
      goals: s.goals.map((g) => g.id === goalId ? { ...g, milestones: g.milestones.filter((m) => m.id !== msId) } : g),
    }),

    addGoal: (title, deadline) => setState((s) => s && {
      ...s,
      goals: [...s.goals, {
        id: uid("goal"), title, domain: "goals" as const, deadline, createdAt: todayISO(),
        milestones: [{ id: uid("ms"), title: "Define first milestone", done: false, date: deadline }],
        linkedHabitIds: [], linkedTaskIds: [],
      }],
    }),

    editGoal: (id, title, deadline) => setState((s) => s && {
      ...s,
      goals: s.goals.map((g) => g.id === id ? { ...g, title, deadline } : g),
    }),

    // Deleting a goal shouldn't leave habits/tasks pointing at a goal that
    // no longer exists — clear the reference on anything linked to it
    // rather than leaving a dangling id nothing filters out consistently.
    deleteGoal: (id) => setState((s) => s && {
      ...s,
      goals: s.goals.filter((g) => g.id !== id),
      habits: s.habits.map((h) => h.linkedGoalId === id ? { ...h, linkedGoalId: null } : h),
      tasks: s.tasks.map((t) => t.linkedGoalId === id ? { ...t, linkedGoalId: null } : t),
    }),

    addSubject: (name) => setState((s) => s && {
      ...s,
      subjects: [...s.subjects, { id: uid("sub"), name, color: "var(--academics)" }],
    }),

    editSubject: (id, name) => setState((s) => s && {
      ...s,
      subjects: s.subjects.map((sub) => sub.id === id ? { ...sub, name } : sub),
    }),

    // A subject's assignments and study sessions only make sense in the
    // context of that subject — cascade-delete them too, rather than
    // leaving orphaned rows with a subjectId nothing can resolve to a name.
    deleteSubject: (id) => setState((s) => s && {
      ...s,
      subjects: s.subjects.filter((sub) => sub.id !== id),
      assignments: s.assignments.filter((a) => a.subjectId !== id),
      studySessions: s.studySessions.filter((ss) => ss.subjectId !== id),
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
          priority: (fields.priority as Priority) || "med", due: (fields.due as string) || null, done: false, completedAt: null,
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
          due: String(fields.due || isoOf(3)), done: false, completedAt: null, grade: null, weight: "med" as const,
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
        const base = s.healthLogs.find((l) => l.date === date) || { ...defaultHealthLogValues(last), date };
        const numeric = parseFloat(String(fields.value));
        const updated = metric && !isNaN(numeric) ? { ...base, [metric]: numeric } : base;
        const exists = s.healthLogs.find((l) => l.date === date);
        return { ...s, healthLogs: exists ? s.healthLogs.map((l) => l.date === date ? updated : l) : [...s.healthLogs, updated] };
      }
      return s;
    }),
  }), []);

  return { state, status, loadError, saveError, actions, retry: () => setRetryToken((n) => n + 1) };
}