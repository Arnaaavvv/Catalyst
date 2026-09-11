import { CheckSquare, Repeat, Activity, Target, GraduationCap, BookOpen, type LucideIcon } from "lucide-react";
import { todayISO, isoOf } from "./date";
import type { DomainId, LifeOSState } from "./types";

export interface QuickType {
  id: "task" | "habit" | "health" | "goal" | "assignment" | "study";
  label: string;
  icon: LucideIcon;
  domain: DomainId;
}

export const QUICK_TYPES: QuickType[] = [
  { id: "task", label: "Task", icon: CheckSquare, domain: "tasks" },
  { id: "habit", label: "Log a habit", icon: Repeat, domain: "habits" },
  { id: "health", label: "Log health", icon: Activity, domain: "health" },
  { id: "goal", label: "New goal", icon: Target, domain: "goals" },
  { id: "assignment", label: "Assignment", icon: GraduationCap, domain: "academics" },
  { id: "study", label: "Study session", icon: BookOpen, domain: "academics" },
];

export function defaultFormFor(typeId: QuickType["id"], state: LifeOSState): Record<string, string | number> {
  switch (typeId) {
    case "task": return { title: "", due: todayISO(), priority: "med", project: "Personal" };
    case "habit": return { habitId: state.habits[0]?.id || "" };
    case "health": return { metric: "exerciseMin", value: "" };
    case "goal": return { title: "", deadline: isoOf(30) };
    case "assignment": return { title: "", subjectId: state.subjects[0]?.id || "", due: isoOf(3) };
    case "study": return { subjectId: state.subjects[0]?.id || "", topic: "", duration: 30, date: todayISO() };
    default: return {};
  }
}
