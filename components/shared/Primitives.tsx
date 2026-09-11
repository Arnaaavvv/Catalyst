"use client";
import { Loader2, Check, type LucideIcon } from "lucide-react";
import { DOMAINS } from "@/lib/domains";
import type { DomainId } from "@/lib/types";

export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
      <div>
        {eyebrow && <div className="font-mono text-[11px] text-faint mb-1 tracking-wide">{eyebrow}</div>}
        <h1 className="font-display text-[28px] leading-none" style={{ fontWeight: 500 }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed hairline rounded-xl">
      <Icon size={22} className="text-faint mb-3" />
      <div className="font-medium text-sm mb-1">{title}</div>
      {hint && <div className="text-xs text-dim max-w-xs">{hint}</div>}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-dim text-sm py-10 justify-center">
      <Loader2 size={15} className="spin" />
      <span className="font-mono text-xs">{label}</span>
    </div>
  );
}

export function TaskCheck({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // prevent double-firing when nested inside a clickable row
        onClick();
      }}
      className={`task-check ${done ? "done" : ""}`}
      aria-label="toggle task"
    >
      {done && <Check size={12} color="var(--accent-ink)" strokeWidth={3} />}
    </button>
  );
}

export function DomainDot({ domain }: { domain: DomainId }) {
  return <span className="dot" style={{ background: DOMAINS[domain]?.color }} />;
}

export function MiniStat({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={14} style={{ color }} />
      <div>
        <div className="font-mono text-sm leading-none">{value}</div>
        <div className="text-[10px] text-faint mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export const inputCls = "w-full rounded-lg px-2.5 py-2 text-sm";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block font-mono text-[10px] text-faint mb-1.5 tracking-wide">{children}</label>;
}