"use client";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { domainMomentum } from "@/lib/derived";
import { computeInsights } from "@/lib/insights";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader, EmptyState } from "@/components/shared/Primitives";
import { DOMAINS } from "@/lib/domains";
import type { DomainId, LifeOSState } from "@/lib/types";

export default function InsightsView({ state }: { state: LifeOSState }) {
  const doms = Object.keys(DOMAINS) as DomainId[];
  const momentums = doms.map((d) => ({ id: d, ...domainMomentum(d, state) }));
  const insights = useMemo(() => computeInsights(state), [state]);

  const hasAnyData = state.tasks.length > 0 || state.habits.length > 0 || state.goals.length > 0
    || state.healthLogs.length > 0 || state.studySessions.length > 0;

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="PATTERNS IN YOUR OWN DATA" title="Insights" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {momentums.map((m) => {
          const Icon = DOMAINS[m.id].icon;
          return (
            <div key={m.id} className="surface rounded-xl p-3.5 flex flex-col items-center">
              <Icon size={13} style={{ color: DOMAINS[m.id].color }} className="mb-1.5" />
              <MomentumDial state={m.state} color={DOMAINS[m.id].color} size={50} />
              <div className="text-[10px] text-faint mt-1">{DOMAINS[m.id].label}</div>
            </div>
          );
        })}
      </div>

      {!hasAnyData ? (
        <EmptyState icon={Sparkles} title="Nothing to learn from yet"
          hint="Insights are patterns pulled from your own data — log a few tasks, habits, or health entries and they'll start showing up here." />
      ) : insights.length === 0 ? (
        <div className="text-xs text-dim">No standout patterns yet — check back as more data comes in.</div>
      ) : (
        <div className="space-y-2.5">
          {insights.map((ins, i) => (
            <div key={i} className="surface rounded-xl p-4 flex items-start gap-3">
              <span className="dot mt-1.5" style={{ background: DOMAINS[ins.domain].color }} />
              <p className="text-sm leading-relaxed">{ins.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}