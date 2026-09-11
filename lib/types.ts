export type DomainId = "health" | "habits" | "goals" | "tasks" | "academics";

export interface HabitLog {
  date: string;
  done: boolean;
}

export interface Habit {
  id: string;
  name: string;
  domain: "habits";
  target: number;
  unit: string;
  linkedGoalId: string | null;
  history: HabitLog[];
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  date: string;
}

export interface Goal {
  id: string;
  title: string;
  domain: "goals";
  deadline: string;
  createdAt: string;
  milestones: Milestone[];
  linkedHabitIds: string[];
  linkedTaskIds: string[];
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export type Priority = "low" | "med" | "high";

export interface Task {
  id: string;
  title: string;
  project: string;
  priority: Priority;
  due: string | null;
  done: boolean;
  subtasks: Subtask[];
  recurring: "daily" | "weekly" | null;
  linkedGoalId: string | null;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  due: string;
  done: boolean;
  grade: string | null;
  weight: "low" | "med" | "high" | "exam";
}

export interface StudySession {
  id: string;
  subjectId: string;
  date: string;
  duration: number;
  topic: string;
}

export interface HealthLog {
  date: string;
  sleep: number;
  steps: number;
  exerciseMin: number;
  weight: number;
  waterL: number;
  mood: number;
  energy: number;
}

export interface LifeOSState {
  subjects: Subject[];
  assignments: Assignment[];
  studySessions: StudySession[];
  goals: Goal[];
  habits: Habit[];
  tasks: Task[];
  healthLogs: HealthLog[];
}

export type MomentumState = "accelerating" | "steady" | "recovering" | "stalled";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface QuickAddResult {
  type: "task" | "habit" | "health" | "goal" | "assignment" | "study";
  fields: Record<string, string | number | null>;
}
