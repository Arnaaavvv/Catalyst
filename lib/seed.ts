import { isoOf, uid } from "./date";
import type { Assignment, Goal, Habit, HealthLog, LifeOSState, StudySession, Subject, Task } from "./types";

function genHistory(days: number, prob: number) {
  const out: { date: string; done: boolean }[] = [];
  for (let i = days; i >= 0; i--) {
    const iso = isoOf(-i);
    const recentBoost = i < 14 ? 0.12 : 0;
    out.push({ date: iso, done: Math.random() < prob + recentBoost });
  }
  return out;
}

function genHealthHistory(days: number): HealthLog[] {
  const out: HealthLog[] = [];
  let weight = 71.5;
  for (let i = days; i >= 0; i--) {
    const iso = isoOf(-i);
    weight += (Math.random() - 0.52) * 0.15;
    out.push({
      date: iso,
      sleep: +(6 + Math.random() * 2.6).toFixed(1),
      steps: Math.round(3500 + Math.random() * 8000),
      exerciseMin: Math.random() < 0.65 ? Math.round(20 + Math.random() * 50) : 0,
      weight: +weight.toFixed(1),
      waterL: +(1 + Math.random() * 2.2).toFixed(1),
      mood: Math.ceil(Math.random() * 5),
      energy: Math.ceil(Math.random() * 5),
    });
  }
  return out;
}

// Builds a realistic seeded dataset so a brand-new account feels alive immediately.
export function buildSeed(): LifeOSState {
  const subjects: Subject[] = [
    { id: "sub_ml", name: "Machine Learning", color: "var(--academics)" },
    { id: "sub_os", name: "Operating Systems", color: "var(--academics)" },
    { id: "sub_stat", name: "Applied Statistics", color: "var(--academics)" },
    { id: "sub_dsa", name: "Algorithms & Complexity", color: "var(--academics)" },
  ];

  const assignments: Assignment[] = [
    { id: uid("as"), subjectId: "sub_ml", title: "Assignment 3 — Gradient Boosting", due: isoOf(2), done: false, grade: null, weight: "high" },
    { id: uid("as"), subjectId: "sub_os", title: "Lab 5 — Scheduler Simulation", due: isoOf(4), done: false, grade: null, weight: "med" },
    { id: uid("as"), subjectId: "sub_stat", title: "Problem Set 6", due: isoOf(-2), done: true, grade: "A-", weight: "med" },
    { id: uid("as"), subjectId: "sub_dsa", title: "Midterm Exam", due: isoOf(9), done: false, grade: null, weight: "exam" },
    { id: uid("as"), subjectId: "sub_ml", title: "Reading Response — Ch. 7", due: isoOf(-5), done: true, grade: "B+", weight: "low" },
    { id: uid("as"), subjectId: "sub_os", title: "Quiz — Deadlock & Sync", due: isoOf(1), done: false, grade: null, weight: "med" },
  ];

  const studySessions: StudySession[] = [
    { id: uid("ss"), subjectId: "sub_ml", date: isoOf(-1), duration: 55, topic: "Boosting vs. bagging" },
    { id: uid("ss"), subjectId: "sub_dsa", date: isoOf(-1), duration: 40, topic: "Graph cuts" },
    { id: uid("ss"), subjectId: "sub_os", date: isoOf(-2), duration: 30, topic: "Scheduler edge cases" },
    { id: uid("ss"), subjectId: "sub_ml", date: isoOf(-3), duration: 45, topic: "Feature importance" },
    { id: uid("ss"), subjectId: "sub_stat", date: isoOf(-4), duration: 50, topic: "Hypothesis testing" },
    { id: uid("ss"), subjectId: "sub_dsa", date: isoOf(-6), duration: 60, topic: "DP on trees" },
  ];

  const goals: Goal[] = [
    {
      id: "goal_thesis", title: "Ship capstone project to a portfolio-ready state", domain: "goals",
      deadline: isoOf(45), createdAt: isoOf(-60),
      milestones: [
        { id: uid("ms"), title: "Finalize data pipeline", done: true, date: isoOf(-30) },
        { id: uid("ms"), title: "Working prototype", done: true, date: isoOf(-10) },
        { id: uid("ms"), title: "Polish UI + write-up", done: false, date: isoOf(20) },
        { id: uid("ms"), title: "Present + deploy", done: false, date: isoOf(44) },
      ],
      linkedHabitIds: ["hab_code"], linkedTaskIds: [],
    },
    {
      id: "goal_fitness", title: "Build a sustainable strength + cardio routine", domain: "goals",
      deadline: isoOf(75), createdAt: isoOf(-40),
      milestones: [
        { id: uid("ms"), title: "3 sessions/week for a month", done: true, date: isoOf(-8) },
        { id: uid("ms"), title: "Run 5k under 27 minutes", done: false, date: isoOf(30) },
        { id: uid("ms"), title: "Bench bodyweight", done: false, date: isoOf(70) },
      ],
      linkedHabitIds: ["hab_workout", "hab_steps"], linkedTaskIds: [],
    },
    {
      id: "goal_gpa", title: "Finish semester with a 8.5+ SGPA", domain: "goals",
      deadline: isoOf(60), createdAt: isoOf(-20),
      milestones: [
        { id: uid("ms"), title: "Clear all PSets on time", done: false, date: isoOf(5) },
        { id: uid("ms"), title: "Score 80+ on midterms", done: false, date: isoOf(9) },
      ],
      linkedHabitIds: ["hab_study"], linkedTaskIds: [],
    },
    {
      id: "goal_reading", title: "Read 12 books this year", domain: "goals",
      deadline: isoOf(120), createdAt: isoOf(-200),
      milestones: [
        { id: uid("ms"), title: "Book 6 — halfway", done: true, date: isoOf(-15) },
        { id: uid("ms"), title: "Book 9", done: false, date: isoOf(40) },
      ],
      linkedHabitIds: ["hab_read"], linkedTaskIds: [],
    },
  ];

  const habits: Habit[] = [
    { id: "hab_code", name: "Deep work on capstone", domain: "habits", target: 5, unit: "sessions/wk", linkedGoalId: "goal_thesis", history: genHistory(60, 0.72) },
    { id: "hab_workout", name: "Strength training", domain: "habits", target: 4, unit: "sessions/wk", linkedGoalId: "goal_fitness", history: genHistory(60, 0.6) },
    { id: "hab_steps", name: "8k+ steps", domain: "habits", target: 6, unit: "days/wk", linkedGoalId: "goal_fitness", history: genHistory(60, 0.68) },
    { id: "hab_study", name: "Focused study block", domain: "habits", target: 6, unit: "sessions/wk", linkedGoalId: "goal_gpa", history: genHistory(60, 0.8) },
    { id: "hab_read", name: "Read 20 minutes", domain: "habits", target: 5, unit: "days/wk", linkedGoalId: "goal_reading", history: genHistory(60, 0.55) },
    { id: "hab_sleep", name: "Lights out before 12:30", domain: "habits", target: 5, unit: "nights/wk", linkedGoalId: null, history: genHistory(60, 0.45) },
  ];

  const tasks: Task[] = [
    { id: uid("t"), title: "Finish onboarding flow wireframes", project: "Capstone", priority: "high", due: isoOf(0), done: false, subtasks: [
      { id: uid("sub"), title: "Sketch empty states", done: true },
      { id: uid("sub"), title: "Review with mentor", done: false },
    ], recurring: null, linkedGoalId: "goal_thesis" },
    { id: uid("t"), title: "Push weekly progress commit", project: "Capstone", priority: "med", due: isoOf(0), done: false, subtasks: [], recurring: "weekly", linkedGoalId: "goal_thesis" },
    { id: uid("t"), title: "Buy new running shoes", project: "Personal", priority: "low", due: isoOf(3), done: false, subtasks: [], recurring: null, linkedGoalId: "goal_fitness" },
    { id: uid("t"), title: "Email TA about extension", project: "Academics", priority: "high", due: isoOf(0), done: false, subtasks: [], recurring: null, linkedGoalId: "goal_gpa" },
    { id: uid("t"), title: "Refill water bottle before gym", project: "Personal", priority: "low", due: isoOf(0), done: true, subtasks: [], recurring: "daily", linkedGoalId: null },
    { id: uid("t"), title: "Draft README for capstone repo", project: "Capstone", priority: "med", due: isoOf(2), done: false, subtasks: [], recurring: null, linkedGoalId: "goal_thesis" },
    { id: uid("t"), title: "Book dentist appointment", project: "Personal", priority: "low", due: isoOf(6), done: false, subtasks: [], recurring: null, linkedGoalId: null },
    { id: uid("t"), title: "Review OS lab feedback", project: "Academics", priority: "med", due: isoOf(-1), done: false, subtasks: [], recurring: null, linkedGoalId: "goal_gpa" },
    { id: uid("t"), title: "Plan next chapter — reading list", project: "Personal", priority: "low", due: null, done: false, subtasks: [], recurring: null, linkedGoalId: "goal_reading" },
    { id: uid("t"), title: "Sync with capstone mentor", project: "Capstone", priority: "high", due: isoOf(1), done: false, subtasks: [], recurring: null, linkedGoalId: "goal_thesis" },
  ];

  const healthLogs = genHealthHistory(30);

  return { subjects, assignments, studySessions, goals, habits, tasks, healthLogs };
}
