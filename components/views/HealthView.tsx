"use client";
import { useState } from "react";
import { BedDouble, Footprints, Activity, Scale, Droplet, Smile, BatteryMedium, X } from "lucide-react";
import { domainMomentum } from "@/lib/derived";
import { todayISO, fmtShort } from "@/lib/date";
import Sparkline from "@/components/shared/Sparkline";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader, MiniStat, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import type { HealthLog, LifeOSState } from "@/lib/types";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";
import { Plus } from "lucide-react";

const HEALTH_METRICS = [
  { key: "sleep", label: "Sleep", unit: "h", icon: BedDouble },
  { key: "steps", label: "Steps", unit: "", icon: Footprints },
  { key: "exerciseMin", label: "Exercise", unit: "m", icon: Activity },
  { key: "weight", label: "Weight", unit: "kg", icon: Scale },
  { key: "waterL", label: "Water", unit: "L", icon: Droplet },
  { key: "mood", label: "Mood", unit: "/5", icon: Smile },
  { key: "energy", label: "Energy", unit: "/5", icon: BatteryMedium },
] as const;

export default function HealthView({ state, actions }: { state: LifeOSState; actions: LifeOSActions }) {
  const [metric, setMetric] = useState<keyof HealthLog>("sleep");
  const [logOpen, setLogOpen] = useState(false);
  const logs = state.healthLogs.slice(-30);
  const hasLogs = logs.length > 0;
  const activeMeta = HEALTH_METRICS.find((m) => m.key === metric)!;
  const values = logs.map((l) => Number(l[metric]));
  const avg = hasLogs ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "—";
  const mom = domainMomentum("health", state);

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="TRENDS & INPUTS" title="Health"
        action={<button onClick={() => setLogOpen(true)} className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><Plus size={13} /> Log today</button>} />

      {!hasLogs ? (
        <EmptyState icon={Activity} title="No health data yet"
          hint="Log today's sleep, steps, or exercise to start seeing trends here." />
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <div className="surface rounded-xl p-4">
            <div className="flex gap-1.5 mb-4 flex-wrap">
              {HEALTH_METRICS.map((m) => (
                <button key={m.key} onClick={() => setMetric(m.key)} className="chip"
                  style={{ background: metric === m.key ? "var(--health)" : "transparent", color: metric === m.key ? "var(--accent-ink)" : "var(--ink-dim)", borderColor: metric === m.key ? "var(--health)" : "var(--line-strong)" }}>
                  <m.icon size={11} /> {m.label}
                </button>
              ))}
            </div>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-display text-3xl">{avg}{activeMeta.unit}</span>
              <span className="text-xs text-dim">{logs.length}-day average · {activeMeta.label.toLowerCase()}</span>
            </div>
            <Sparkline values={values} color="var(--health)" height={90} filled />
            <div className="flex justify-between font-mono text-[10px] text-faint mt-1">
              <span>{fmtShort(logs[0].date)}</span>
              <span>{fmtShort(logs[logs.length - 1].date)}</span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="surface rounded-xl p-4 flex items-center gap-4">
              <MomentumDial state={mom.state} color="var(--health)" size={64} />
              <div>
                <div className="font-mono text-[10px] text-faint tracking-wide mb-1">HEALTH MOMENTUM</div>
                <div className="text-xs text-dim">Based on sleep + activity, last 7 vs prior 7 days.</div>
              </div>
            </div>
            <div className="surface rounded-xl p-4">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">LATEST ENTRY</div>
              <div className="grid grid-cols-2 gap-3">
                {HEALTH_METRICS.map((m) => (
                  <MiniStat key={m.key} icon={m.icon} label={m.label} value={`${logs[logs.length - 1][m.key]}${m.unit}`} color="var(--health)" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {logOpen && <LogHealthModal state={state} actions={actions} onClose={() => setLogOpen(false)} />}
    </div>
  );
}

function LogHealthModal({ state, actions, onClose }: { state: LifeOSState; actions: LifeOSActions; onClose: () => void }) {
  const existing = state.healthLogs.find((l) => l.date === todayISO());
  const last = state.healthLogs[state.healthLogs.length - 1];
  const [vals, setVals] = useState<Omit<HealthLog, "date">>(
    existing || { sleep: 7, steps: 6000, exerciseMin: 30, weight: last?.weight ?? 70, waterL: 1.5, mood: 3, energy: 3 }
  );
  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[420px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-lg">Log today</span>
            <button onClick={onClose} className="text-faint hover:text-ink"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {HEALTH_METRICS.map((m) => (
              <div key={m.key}>
                <FieldLabel>{m.label} ({m.unit || "count"})</FieldLabel>
                <input type="number" step="0.1" className={inputCls} value={vals[m.key]}
                  onChange={(e) => setVals((v) => ({ ...v, [m.key]: +e.target.value }))} />
              </div>
            ))}
          </div>
          <button onClick={() => { actions.logHealth(vals); onClose(); }} className="btn-primary w-full mt-4 py-2.5 rounded-lg text-sm">Save entry</button>
        </div>
      </div>
    </Portal>
  );
}