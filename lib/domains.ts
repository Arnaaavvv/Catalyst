import { Activity, Repeat, Target, CheckSquare, GraduationCap, Home, Sparkles, Clock, type LucideIcon } from "lucide-react";
import type { DomainId } from "./types";

export const DOMAINS: Record<DomainId, { label: string; color: string; icon: LucideIcon }> = {
  health:    { label: "Health",    color: "var(--health)",    icon: Activity },
  habits:    { label: "Habits",    color: "var(--habits)",    icon: Repeat },
  goals:     { label: "Goals",     color: "var(--goals)",     icon: Target },
  tasks:     { label: "Tasks",     color: "var(--tasks)",     icon: CheckSquare },
  academics: { label: "Academics", color: "var(--academics)", icon: GraduationCap },
};

export const NAV_ITEMS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "today",     label: "Today",     icon: Home },
  { id: "health",    label: "Health",    icon: Activity },
  { id: "habits",    label: "Habits",    icon: Repeat },
  { id: "goals",     label: "Goals",     icon: Target },
  { id: "tasks",     label: "Tasks",     icon: CheckSquare },
  { id: "academics", label: "Academics", icon: GraduationCap },
  { id: "insights",  label: "Insights",  icon: Sparkles },
  { id: "timeline",  label: "Timeline",  icon: Clock },
];
