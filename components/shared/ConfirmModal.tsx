"use client";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmModal({
  title, message, confirmLabel, onConfirm, onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onCancel}>
      <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[380px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} style={{ color: "var(--tasks)" }} />
            <span className="font-display text-lg">{title}</span>
          </div>
          <button onClick={onCancel}><X size={16} className="text-faint" /></button>
        </div>
        <p className="text-sm text-dim leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm hairline border">Cancel</button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
            style={{ background: "var(--tasks)", color: "var(--accent-ink)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}