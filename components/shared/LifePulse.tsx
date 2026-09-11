"use client";
import { useMemo } from "react";
import { isoOf } from "@/lib/date";
import type { DomainId, LifeOSState } from "@/lib/types";
import { DOMAINS } from "@/lib/domains";

// The app's recurring visual signature: a multi-lane EKG-style strip, one
// lane per domain, where each logged/completed item produces a "beat".
export default function LifePulse({ state, compact = false }: { state: LifeOSState; compact?: boolean }) {
  const days = 14;
  const lanes = Object.keys(DOMAINS) as DomainId[];

  const beatDates = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    lanes.forEach((d) => (map[d] = new Set()));
    state.tasks.filter((t) => t.done && t.due).forEach((t) => map.tasks.add(t.due as string));
    state.habits.forEach((h) => h.history.forEach((x) => x.done && map.habits.add(x.date)));
    state.healthLogs.forEach((l) => map.health.add(l.date));
    state.goals.forEach((g) => g.milestones.forEach((m) => m.done && map.goals.add(m.date)));
    state.studySessions.forEach((s) => map.academics.add(s.date));
    state.assignments.filter((a) => a.done).forEach((a) => map.academics.add(a.due));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const w = 640;
  const laneH = compact ? 20 : 30;
  const gap = 4;
  const dayW = w / days;

  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <svg width="100%" height={lanes.length * (laneH + gap)} viewBox={`0 0 ${w} ${lanes.length * (laneH + gap)}`} preserveAspectRatio="none">
        {lanes.map((domainId, li) => {
          const color = DOMAINS[domainId].color;
          const y0 = li * (laneH + gap);
          const midY = y0 + laneH / 2;
          let path = `M 0 ${midY}`;
          for (let i = days - 1; i >= 0; i--) {
            const iso = isoOf(-i);
            const x = (days - 1 - i) * dayW;
            const beat = beatDates[domainId].has(iso);
            const nextX = x + dayW;
            if (beat) {
              path += ` L ${x + dayW * 0.25} ${midY} L ${x + dayW * 0.4} ${y0 + 3} L ${x + dayW * 0.5} ${y0 + laneH - 3} L ${x + dayW * 0.6} ${midY} L ${nextX} ${midY}`;
            } else {
              path += ` L ${nextX} ${midY}`;
            }
          }
          return (
            <g key={domainId}>
              <path d={path} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
              {!compact && (
                <text x="2" y={y0 + 9} className="font-mono" fontSize="8" fill="var(--ink-faint)" letterSpacing="0.5">
                  {DOMAINS[domainId].label.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
