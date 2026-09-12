"use client";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { updateProfile, AuthError, type PublicUser, type Sex } from "@/lib/auth";
import { calculateAge, todayISO } from "@/lib/date";
import { inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";

export default function ManageAccountModal({
  user, onClose, onUpdated,
}: { user: PublicUser; onClose: () => void; onUpdated: (user: PublicUser) => void }) {
  const [username, setUsername] = useState(user.username ?? "");
  const [dob, setDob] = useState(user.dob ?? "");
  const [sex, setSex] = useState<Sex | "">(user.sex ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const age = dob ? calculateAge(dob) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await updateProfile({ username, dob, sex });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop" style={{ background: "rgba(20,18,12,0.5)" }} onMouseDown={onClose}>
        <div className="modal-panel surface rounded-2xl p-5 w-full max-w-[400px]" onMouseDown={(e) => e.stopPropagation()} style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-display text-lg">Manage account</span>
            <button onClick={onClose}><X size={16} className="text-faint" /></button>
          </div>
          <p className="text-xs text-faint mb-4">{user.email}</p>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <FieldLabel>Username</FieldLabel>
              <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. arnav" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Date of birth</FieldLabel>
                <input type="date" className={inputCls} value={dob} max={todayISO()} onChange={(e) => setDob(e.target.value)} />
              </div>
              <div>
                <FieldLabel>Sex</FieldLabel>
                <select className={inputCls} value={sex} onChange={(e) => setSex(e.target.value as Sex | "")}>
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {age !== null && <div className="font-mono text-[11px] text-faint">Age {age} — calculated from date of birth, not stored separately.</div>}
            {error && <div className="text-xs" style={{ color: "var(--tasks)" }}>{error}</div>}

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5 mt-2">
              {busy && <Loader2 size={14} className="spin" />}
              Save changes
            </button>
          </form>
        </div>
      </div>
    </Portal>
  );
}