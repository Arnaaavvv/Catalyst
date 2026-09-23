"use client";
import { useState } from "react";
import { BedDouble, Footprints, Activity, Scale, Droplet, Smile, BatteryMedium, X, Pencil, Trash2 } from "lucide-react";
import { domainMomentum } from "@/lib/derived";
import { defaultHealthLogValues } from "@/lib/health";
import { todayISO, fmtShort } from "@/lib/date";
import Sparkline from "@/components/shared/Sparkline";
import MomentumDial from "@/components/shared/MomentumDial";
import { SectionHeader, MiniStat, EmptyState, inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import ConfirmModal from "@/components/shared/ConfirmModal";
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
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const logs = state.healthLogs.slice(-30);
  const hasLogs = logs.length > 0;
  const activeMeta = HEALTH_METRICS.find((m) => m.key === metric)!;
  const values = logs.map((l) => Number(l[metric]));
  const avg = hasLogs ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "—";
  const mom = domainMomentum("health", state);

  return (
    <div className="fade-in">
      <SectionHeader eyebrow="TRENDS & INPUTS" title="Health"
        action={<button onClick={() => setLogOpen(true)} className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"><Plus size={13} /> Log entry</button>} />

      {!hasLogs ? (
        <EmptyState icon={Activity} title="No health data yet"
          hint="Log today's sleep, steps, or exercise to start seeing trends here." />
      ) : (
        <>
          <div className="grid gap-5 grid-cols-1 md:grid-cols-[2fr_1fr]">
            <div className="surface rounded-xl p-4 min-w-0">
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

            <div className="space-y-5 min-w-0">
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

          <div className="surface rounded-xl p-4 mt-5">
            <div className="font-mono text-[10px] text-faint tracking-wide mb-3">RECENT ENTRIES</div>
            <div className="space-y-0.5">
              {[...state.healthLogs].slice(-10).reverse().map((l) => (
                <div key={l.date} className="row-hover flex items-center gap-2.5 px-2 py-2 rounded-lg">
                  <span className="font-mono text-[11px] text-faint w-20 flex-shrink-0">{fmtShort(l.date)}</span>
                  <span className="text-xs text-dim flex-1 min-w-0 truncate">
                    {l.sleep ?? 0}h sleep · {l.exerciseMin ?? 0}m active · {(l.steps ?? 0).toLocaleString()} steps
                  </span>
                  <button onClick={() => setEditingDate(l.date)} className="text-faint hover:text-ink p-1 flex-shrink-0" aria-label="Edit entry">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(l.date)} className="text-faint hover:text-ink p-1 flex-shrink-0" aria-label="Delete entry">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {logOpen && <LogHealthModal state={state} actions={actions} onClose={() => setLogOpen(false)} />}
      {editingDate && <LogHealthModal state={state} actions={actions} editingDate={editingDate} onClose={() => setEditingDate(null)} />}
      {deleteTarget && (
        <ConfirmModal
          title="Delete health entry?"
          message={`This permanently deletes your health log for ${fmtShort(deleteTarget)}. This can't be undone.`}
          confirmLabel="Delete"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => { actions.deleteHealthLog(deleteTarget); setDeleteTarget(null); }}
        />
      )}
    </div>
  );
}

function LogHealthModal({
  state, actions, onClose, editingDate,
}: { state: LifeOSState; actions: LifeOSActions; onClose: () => void; editingDate?: string }) {
  const targetDate = editingDate ?? todayISO();
  const existing = state.healthLogs.find((l) => l.date === targetDate);
  const last = state.healthLogs[state.healthLogs.length - 1];
  const [date, setDate] = useState(targetDate);
  const [vals, setVals] = useState<Omit<HealthLog, "date">>(existing || defaultHealthLogValues(last));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[420px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="font-display text-lg">{editingDate ? "Edit entry" : "Log entry"}</span>
            <button onClick={onClose} className="text-faint hover:text-ink"><X size={16} /></button>
          </div>
          <div className="mb-3">
            <FieldLabel>Date</FieldLabel>
            <input type="date" className={inputCls} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
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
          <div className="flex gap-2 mt-4">
            {editingDate && (
              <button onClick={() => setConfirmDeleteOpen(true)} className="py-2.5 px-4 rounded-lg text-sm hairline border" style={{ color: "var(--tasks)" }}>
                Delete
              </button>
            )}
            <button
              onClick={() => { actions.saveHealthLog(date, vals, editingDate); onClose(); }}
              className="btn-primary flex-1 py-2.5 rounded-lg text-sm"
            >
              Save entry
            </button>
          </div>
        </div>
      </div>
      {editingDate && confirmDeleteOpen && (
        <ConfirmModal
          title="Delete health entry?"
          message={`This permanently deletes your health log for ${fmtShort(editingDate)}. This can't be undone.`}
          confirmLabel="Delete"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={() => { actions.deleteHealthLog(editingDate); onClose(); }}
        />
      )}
    </Portal>
  );
}