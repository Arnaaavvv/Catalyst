"use client";
import { useMemo, useRef, useState } from "react";
import { Loader2, X, Camera, Sparkles } from "lucide-react";
import { updateProfile, uploadAvatar, AuthError, BIO_MAX_LENGTH, type PublicUser, type Sex } from "@/lib/auth";
import { calculateAge, todayISO } from "@/lib/date";
import { computePersonalityTraits, personalityToSlices, computePeakImprovementEra } from "@/lib/personality";
import { inputCls, FieldLabel } from "@/components/shared/Primitives";
import Portal from "@/components/shared/Portal";
import PersonalityChart from "@/components/account/PersonalityChart";
import type { LifeOSState } from "@/lib/types";

export default function AccountPage({
  user, state, onClose, onUpdated,
}: { user: PublicUser; state: LifeOSState; onClose: () => void; onUpdated: (user: PublicUser) => void }) {
  const [username, setUsername] = useState(user.username ?? "");
  const [dob, setDob] = useState(user.dob ?? "");
  const [sex, setSex] = useState<Sex | "">(user.sex ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const age = dob ? calculateAge(dob) : null;
  const traits = useMemo(() => computePersonalityTraits(state), [state]);
  const slices = useMemo(() => personalityToSlices(traits), [traits]);
  const peakEra = useMemo(() => computePeakImprovementEra(state), [state]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateProfile(user.id, { username, dob, sex, bio });
      onUpdated(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Couldn't save — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      const avatarUrl = await uploadAvatar(user.id, file);
      onUpdated({ ...user, avatarUrl });
    } catch (err) {
      setAvatarError(err instanceof AuthError ? err.message : "Couldn't upload — try again.");
    } finally {
      setAvatarBusy(false);
      e.target.value = "";
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-50 overflow-y-auto scrollbar-thin" style={{ background: "var(--bg)" }}>
        <div className="max-w-[720px] mx-auto px-5 py-8 fade-in">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-2xl">Manage account</h1>
            <button onClick={onClose} className="p-2 rounded-lg row-hover" aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: "220px 1fr" }}>
              {/* Left: avatar, username, dob, sex */}
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarBusy}
                    className="relative w-24 h-24 rounded-full overflow-hidden surface-2 flex items-center justify-center group"
                    style={{ border: "1px solid var(--line-strong)" }}
                  >
                    {user.avatarUrl ? (
                      // Plain <img>, not next/image: this is a user-uploaded
                      // external Supabase Storage URL, not a build-time
                      // asset — next/image would need the Supabase domain
                      // added to next.config.js for little real benefit on
                      // a small circular avatar.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-3xl text-faint">
                        {(user.username || user.name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.45)" }}>
                      {avatarBusy ? <Loader2 size={18} className="spin" color="#fff" /> : <Camera size={18} color="#fff" />}
                    </div>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarSelect}
                  />
                  <span className="text-[10px] text-faint mt-2">Click to change</span>
                  {avatarError && <p className="text-[10px] mt-1 text-center" style={{ color: "var(--tasks)" }}>{avatarError}</p>}
                </div>

                <div>
                  <FieldLabel>Username</FieldLabel>
                  <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. arnav" />
                  <p className="text-[10px] text-faint mt-1">3–20 characters, must be unique.</p>
                </div>

                <div>
                  <FieldLabel>Date of birth</FieldLabel>
                  <input type="date" className={inputCls} value={dob} max={todayISO()} onChange={(e) => setDob(e.target.value)} />
                  {age !== null && <p className="font-mono text-[10px] text-faint mt-1">Age {age}, calculated</p>}
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

              {/* Right: about you */}
              <div>
                <FieldLabel>About you</FieldLabel>
                <textarea
                  className={inputCls}
                  value={bio}
                  maxLength={BIO_MAX_LENGTH}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A few lines about yourself — whatever feels relevant."
                  style={{ resize: "vertical", minHeight: 260 }}
                />
                <p className="text-[10px] text-faint mt-1 text-right">{bio.length}/{BIO_MAX_LENGTH}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 rounded-lg text-sm flex items-center gap-1.5">
                {busy && <Loader2 size={14} className="spin" />}
                Save changes
              </button>
              {saved && <span className="text-xs" style={{ color: "var(--academics)" }}>Saved</span>}
              {error && <span className="text-xs" style={{ color: "var(--tasks)" }}>{error}</span>}
            </div>
          </form>

          <div className="h-px my-8" style={{ background: "var(--line)" }} />

          <div className="grid gap-5" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
            <div className="surface rounded-xl p-5">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-4">PERSONALITY · FROM YOUR TRACKED DATA</div>
              <PersonalityChart slices={slices} />
            </div>

            <div className="surface rounded-xl p-5">
              <div className="font-mono text-[10px] text-faint tracking-wide mb-3">PEAK IMPROVEMENT ERA</div>
              {peakEra ? (
                <>
                  <Sparkles size={16} style={{ color: "var(--accent)" }} className="mb-2" />
                  <div className="font-display text-lg mb-1">{peakEra.label}</div>
                  <p className="text-xs text-dim leading-relaxed">
                    Your habit consistency rose {peakEra.improvementPct} percentage points that week compared to
                    the one before it, the sharpest turnaround in your tracked history.
                  </p>
                </>
              ) : (
                <p className="text-xs text-dim leading-relaxed">
                  Not enough habit history yet to identify a turning point, keep logging and check back in a
                  couple of weeks.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}