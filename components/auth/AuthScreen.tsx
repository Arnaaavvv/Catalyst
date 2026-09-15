"use client";
import { useState } from "react";
import { Loader2, ArrowRight, ShieldCheck, Mail } from "lucide-react";
import { signUp, logIn, AuthError, type PublicUser } from "@/lib/auth";
import { inputCls, FieldLabel } from "@/components/shared/Primitives";

export default function AuthScreen({ onAuthed }: { onAuthed: (user: PublicUser) => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set once sign-up succeeds but Supabase requires email confirmation
  // before the account can actually log in — this is the default project
  // setting. Replaces the form with a "check your inbox" screen instead of
  // pretending the person is logged in when they aren't yet.
  const [confirmationSentTo, setConfirmationSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        const result = await signUp(name, email, password);
        if (result.needsEmailConfirmation) {
          setConfirmationSentTo(result.user.email);
        } else {
          onAuthed(result.user);
        }
      } else {
        const user = await logIn(email, password);
        onAuthed(user);
      }
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmationSentTo) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-[380px] text-center">
          <div className="surface rounded-2xl p-6">
            <Mail size={20} style={{ color: "var(--accent)" }} className="mx-auto mb-3" />
            <h2 className="font-display text-lg mb-2">Check your email</h2>
            <p className="text-sm text-dim leading-relaxed mb-5">
              We sent a confirmation link to <strong className="text-ink font-medium">{confirmationSentTo}</strong>.
              Click it to activate your account, then come back here and log in.
            </p>
            <button
              onClick={() => { setConfirmationSentTo(null); setMode("login"); setError(null); }}
              className="btn-primary w-full py-2.5 rounded-lg text-sm"
            >
              Back to log in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: "var(--accent)" }}>
            <span className="font-display text-sm" style={{ color: "var(--accent-ink)" }}>C</span>
          </div>
          <span className="font-display text-lg">Catalyst</span>
        </div>

        <div className="surface rounded-2xl p-6">
          <div className="flex gap-1 surface-2 p-1 rounded-lg mb-5">
            <button type="button" onClick={() => { setMode("signup"); setError(null); }}
              className="flex-1 text-xs py-1.5 rounded-md font-medium"
              style={{ background: mode === "signup" ? "var(--surface)" : "transparent", color: mode === "signup" ? "var(--ink)" : "var(--ink-dim)" }}>
              Sign up
            </button>
            <button type="button" onClick={() => { setMode("login"); setError(null); }}
              className="flex-1 text-xs py-1.5 rounded-md font-medium"
              style={{ background: mode === "login" ? "var(--surface)" : "transparent", color: mode === "login" ? "var(--ink)" : "var(--ink-dim)" }}>
              Log in
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <FieldLabel>Name</FieldLabel>
                <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
              </div>
            )}
            <div>
              <FieldLabel>Email</FieldLabel>
              <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <FieldLabel>Password</FieldLabel>
              <input type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
            </div>

            {error && <div className="text-xs" style={{ color: "var(--tasks)" }}>{error}</div>}

            <button type="submit" disabled={busy} className="btn-primary w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5 mt-2">
              {busy ? <Loader2 size={14} className="spin" /> : <ArrowRight size={14} />}
              {mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>
        </div>

        <div className="flex items-start gap-2 mt-4 px-1">
          <ShieldCheck size={13} className="text-faint mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-faint leading-relaxed">
            Your data is scoped to your account via
            database-level security rules, so only you can read or write it.
          </p>
        </div>
      </div>
    </div>
  );
}