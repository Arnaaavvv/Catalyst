"use client";
import { useMemo } from "react";
import { Clock } from "lucide-react";
import { buildTimeline } from "@/lib/derived";
import { fmtDay } from "@/lib/date";
import { SectionHeader, EmptyState } from "@/components/shared/Primitives";
import { DOMAINS } from "@/lib/domains";
import type { LifeOSState } from "@/lib/types";

export default function TimelineView({ state }: { state: LifeOSState }) {
  const events = useMemo(() => buildTimeline(state), [state]);
  const grouped = useMemo(() => {
    const map = new Map<string, typeof events>();
    events.forEach((e) => {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    });
    return [...map.entries()];
  }, [events]);

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="EVERYTHING, IN ORDER" title="Timeline" />
      {events.length === 0 ? (
        <EmptyState icon={Clock} title="Nothing logged yet"
          hint="Completed tasks, logged habits, health entries, and milestones will show up here in order." />
      ) : (
        <div className="relative pl-5">
          <div className="absolute left-[7px] top-2 bottom-2 w-px" style={{ background: "var(--line)" }} />
          {grouped.map(([date, evs]) => (
            <div key={date} className="mb-6 relative">
              <div className="absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full surface flex items-center justify-center" style={{ borderColor: "var(--line-strong)" }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              </div>
              <div className="font-mono text-[11px] text-faint mb-2 tracking-wide">{fmtDay(date).toUpperCase()}</div>
              <div className="space-y-1.5">
                {evs.map((e) => (
                  <div key={e.id} className="surface rounded-lg px-3 py-2.5 flex items-start gap-2.5">
                    <span className="dot mt-1.5" style={{ background: DOMAINS[e.domain].color }} />
                    <div className="min-w-0">
                      <div className="text-sm">{e.title}</div>
                      <div className="text-[10px] text-faint mt-0.5">{e.kind}{e.sub ? ` · ${e.sub}` : ""}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}