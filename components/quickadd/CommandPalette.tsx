"use client";
import { useEffect, useRef, useState } from "react";
import { Command, X, ChevronRight, Loader2, ArrowRight, AlertCircle, Sparkles, Check, Flame } from "lucide-react";
import type { LifeOSState, QuickAddResult } from "@/lib/types";
import { heuristicParse, parseWithAI } from "@/lib/quickadd";
import { QUICK_TYPES, defaultFormFor, type QuickType } from "@/lib/quickAddTypes";
import { DOMAINS } from "@/lib/domains";
import { inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import type { LifeOSActions } from "@/hooks/useLifeOSStore";

type Mode = "menu" | "form" | "confirm";

export default function CommandPalette({
  open, onClose, state, actions,
}: { open: boolean; onClose: () => void; state: LifeOSState; actions: LifeOSActions }) {
  const [mode, setMode] = useState<Mode>("menu");
  const [activeType, setActiveType] = useState<QuickType | null>(null);
  const [nlText, setNlText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<QuickAddResult | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string | number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMode("menu"); setActiveType(null); setNlText(""); setParsed(null); setParseError(null);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleNLSubmit() {
    if (!nlText.trim()) return;
    setParsing(true); setParseError(null);
    try {
      const result = await parseWithAI(nlText, state);
      setParsed(result);
      setMode("confirm");
    } catch {
      try {
        const fallback = heuristicParse(nlText, state);
        setParsed(fallback);
        setParseError("AI parsing unavailable — used a quick local guess. Please check the fields.");
        setMode("confirm");
      } catch {
        setParseError("Couldn't parse that. Try a quick-add type instead.");
      }
    } finally {
      setParsing(false);
    }
  }

  function commitParsed() {
    if (!parsed) return;
    actions.commitQuickAdd(parsed);
    onClose();
  }

  function selectType(t: QuickType) {
    setActiveType(t);
    setFormValues(defaultFormFor(t.id, state));
    setMode("form");
  }

  function submitForm() {
    if (!activeType) return;
    actions.commitQuickAdd({ type: activeType.id, fields: formValues });
    onClose();
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 modal-backdrop"
        style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel w-full max-w-[560px] surface rounded-2xl overflow-hidden" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}
          onMouseDown={(e) => e.stopPropagation()}>

          {mode === "menu" && (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b hairline">
              <Command size={15} className="text-faint" />
              <input
                ref={inputRef}
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNLSubmit()}
                placeholder='Try "Study physics for 45 minutes tomorrow"'
                className="flex-1 bg-transparent text-sm py-1"
                style={{ border: "none" }}
              />
              {nlText.trim() && (
                <button onClick={handleNLSubmit} disabled={parsing}
                  className="btn-primary text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                  {parsing ? <Loader2 size={12} className="spin" /> : <ArrowRight size={12} />}
                  Parse
                </button>
              )}
              <button onClick={onClose} className="p-1 text-faint hover:text-ink"><X size={16} /></button>
            </div>
            {parseError && (
              <div className="px-4 py-2 text-xs flex items-center gap-1.5" style={{ color: "var(--tasks)" }}>
                <AlertCircle size={12} /> {parseError}
              </div>
            )}
            <div className="p-2">
              <div className="font-mono text-[10px] text-faint px-2 py-1.5 tracking-wide">QUICK ADD</div>
              {QUICK_TYPES.map((t) => (
                <button key={t.id} onClick={() => selectType(t)}
                  className="row-hover w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-left">
                  <span className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--surface-2)", color: DOMAINS[t.domain].color }}>
                    <t.icon size={14} />
                  </span>
                  <span className="text-sm">{t.label}</span>
                  <ChevronRight size={13} className="ml-auto text-faint" />
                </button>
              ))}
            </div>
          </>
        )}

        {mode === "form" && activeType && (
          <QuickForm type={activeType} state={state} values={formValues} setValues={setFormValues}
            onBack={() => setMode("menu")} onSubmit={submitForm} />
        )}

        {mode === "confirm" && parsed && (
          <ConfirmParsed parsed={parsed} onBack={() => setMode("menu")}
            onEdit={setParsed} onConfirm={commitParsed} />
        )}
        </div>
      </div>
    </Portal>
  );
}

function QuickForm({
  type, state, values, setValues, onBack, onSubmit,
}: {
  type: QuickType; state: LifeOSState; values: Record<string, string | number>;
  setValues: (fn: (s: Record<string, string | number>) => Record<string, string | number>) => void;
  onBack: () => void; onSubmit: () => void;
}) {
  const set = (k: string, v: string | number) => setValues((s) => ({ ...s, [k]: v }));
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="text-faint hover:text-ink"><ChevronRight size={14} className="rotate-180" /></button>
        <type.icon size={14} style={{ color: DOMAINS[type.domain].color }} />
        <span className="text-sm font-medium">{type.label}</span>
      </div>

      {type.id === "task" && (
        <div className="space-y-3">
          <div><FieldLabel>Title</FieldLabel><input autoFocus className={inputCls} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="What needs doing?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Due</FieldLabel><input type="date" className={inputCls} value={values.due} onChange={(e) => set("due", e.target.value)} /></div>
            <div><FieldLabel>Priority</FieldLabel>
              <select className={inputCls} value={values.priority} onChange={(e) => set("priority", e.target.value)}>
                <option value="low">Low</option><option value="med">Medium</option><option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      )}
      {type.id === "habit" && (
        <div className="space-y-3">
          <FieldLabel>Which habit?</FieldLabel>
          {state.habits.length === 0 ? (
            <p className="text-xs text-dim">No habits yet — add one from the Habits page first.</p>
          ) : (
            <div className="space-y-1.5">
              {state.habits.map((h) => (
                <button key={h.id} onClick={() => set("habitId", h.id)}
                  className="row-hover w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-sm"
                  style={{ background: values.habitId === h.id ? "var(--surface-2)" : "transparent" }}>
                  <Flame size={13} style={{ color: DOMAINS.habits.color }} /> {h.name}
                  {values.habitId === h.id && <Check size={13} className="ml-auto" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {type.id === "health" && (
        <div className="space-y-3">
          <div><FieldLabel>Metric</FieldLabel>
            <select className={inputCls} value={values.metric} onChange={(e) => set("metric", e.target.value)}>
              <option value="exerciseMin">Exercise (min)</option>
              <option value="sleep">Sleep (hrs)</option>
              <option value="steps">Steps</option>
              <option value="weight">Weight (kg)</option>
              <option value="waterL">Water (L)</option>
              <option value="mood">Mood (1–5)</option>
              <option value="energy">Energy (1–5)</option>
            </select>
          </div>
          <div><FieldLabel>Value</FieldLabel><input autoFocus className={inputCls} value={values.value} onChange={(e) => set("value", e.target.value)} placeholder="e.g. 45" /></div>
        </div>
      )}
      {type.id === "goal" && (
        <div className="space-y-3">
          <div><FieldLabel>Title</FieldLabel><input autoFocus className={inputCls} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="What are you working toward?" /></div>
          <div><FieldLabel>Deadline</FieldLabel><input type="date" className={inputCls} value={values.deadline} onChange={(e) => set("deadline", e.target.value)} /></div>
        </div>
      )}
      {type.id === "assignment" && (
        <div className="space-y-3">
          {state.subjects.length === 0 ? (
            <p className="text-xs text-dim">No subjects yet — add one from the Academics page first.</p>
          ) : (
            <>
              <div><FieldLabel>Title</FieldLabel><input autoFocus className={inputCls} value={values.title} onChange={(e) => set("title", e.target.value)} placeholder="Assignment name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Subject</FieldLabel>
                  <select className={inputCls} value={values.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
                    {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div><FieldLabel>Due</FieldLabel><input type="date" className={inputCls} value={values.due} onChange={(e) => set("due", e.target.value)} /></div>
              </div>
            </>
          )}
        </div>
      )}
      {type.id === "study" && (
        <div className="space-y-3">
          {state.subjects.length === 0 ? (
            <p className="text-xs text-dim">No subjects yet — add one from the Academics page first.</p>
          ) : (
            <>
              <div><FieldLabel>Subject</FieldLabel>
                <select className={inputCls} value={values.subjectId} onChange={(e) => set("subjectId", e.target.value)}>
                  {state.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><FieldLabel>Topic</FieldLabel><input autoFocus className={inputCls} value={values.topic} onChange={(e) => set("topic", e.target.value)} placeholder="What are you studying?" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><FieldLabel>Minutes</FieldLabel><input type="number" className={inputCls} value={values.duration} onChange={(e) => set("duration", +e.target.value)} /></div>
                <div><FieldLabel>Date</FieldLabel><input type="date" className={inputCls} value={values.date} onChange={(e) => set("date", e.target.value)} /></div>
              </div>
            </>
          )}
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={
          (type.id === "habit" && state.habits.length === 0) ||
          ((type.id === "assignment" || type.id === "study") && state.subjects.length === 0)
        }
        className="btn-primary w-full mt-4 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5"
      >
        Add
      </button>
    </div>
  );
}

function ConfirmParsed({
  parsed, onBack, onEdit, onConfirm,
}: { parsed: QuickAddResult; onBack: () => void; onEdit: (p: QuickAddResult) => void; onConfirm: () => void }) {
  const { type, fields } = parsed;
  const meta = QUICK_TYPES.find((t) => t.id === type) || QUICK_TYPES[0];
  const set = (k: string, v: string) => onEdit({ ...parsed, fields: { ...fields, [k]: v } });
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={13} style={{ color: "var(--accent)" }} />
        <span className="font-mono text-[10px] text-faint tracking-wide">PARSED AS {meta.label.toUpperCase()} — CONFIRM BELOW</span>
      </div>
      <div className="mt-3 space-y-2.5 surface-2 rounded-lg p-3">
        {Object.entries(fields).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-faint w-20 flex-shrink-0 uppercase">{k}</span>
            <input className="flex-1 bg-transparent text-sm pb-0.5" style={{ border: "none", borderBottom: "1px solid var(--line)" }}
              value={v ?? ""} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-lg text-sm hairline border">Cancel</button>
        <button onClick={onConfirm} className="btn-primary flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5">
          <Check size={14} /> Confirm & Add
        </button>
      </div>
    </div>
  );
}