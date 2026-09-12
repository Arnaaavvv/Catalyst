import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Real accounts now, via Supabase Auth — not local-only. Passwords never
// touch our code at all; they go straight to Supabase over HTTPS and we
// only ever see back a session + user object. This module used to manage
// its own localStorage-based user list and SHA-256 hashing (see git history
// if you need to compare) — all of that is gone now, replaced by the
// Supabase JS client below.

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export class AuthError extends Error {}

function assertConfigured(): void {
  if (!supabase) {
    throw new AuthError(
      "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server."
    );
  }
}

function toPublicUser(user: SupabaseUser): PublicUser {
  const metaName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  return {
    id: user.id,
    name: metaName || user.email?.split("@")[0] || "there",
    email: user.email ?? "",
  };
}

export interface SignUpResult {
  user: PublicUser;
  // True when Supabase requires clicking a confirmation link before the
  // account can actually sign in (this is the default project setting).
  // When true, `user` exists but there is NOT yet a usable session — the
  // caller must not treat this as "logged in".
  needsEmailConfirmation: boolean;
}

export async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
  assertConfigured();
  const cleanEmail = email.trim().toLowerCase();
  if (!name.trim()) throw new AuthError("Enter your name.");
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new AuthError("Enter a valid email.");
  if (password.length < 6) throw new AuthError("Password must be at least 6 characters.");

  const { data, error } = await supabase!.auth.signUp({
    email: cleanEmail,
    password,
    options: { data: { name: name.trim() } },
  });

  if (error) throw new AuthError(error.message);
  if (!data.user) throw new AuthError("Sign-up didn't return a user — please try again.");

  // Supabase's documented (if slightly surprising) way of signaling "this
  // email is already registered" without leaking which emails exist: it
  // returns a 200 with a user object whose `identities` array is empty,
  // instead of an error. Surface it as a normal error to the person instead.
  if (data.user.identities && data.user.identities.length === 0) {
    throw new AuthError("An account with this email already exists — try logging in instead.");
  }

  return {
    user: toPublicUser(data.user),
    needsEmailConfirmation: !data.session,
  };
}

export async function logIn(email: string, password: string): Promise<PublicUser> {
  assertConfigured();
  const { data, error } = await supabase!.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error) throw new AuthError(error.message);
  if (!data.user) throw new AuthError("Login didn't return a user — please try again.");
  return toPublicUser(data.user);
}

export async function logOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSessionUser(): Promise<PublicUser | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;
  return toPublicUser(data.session.user);
}

// Subscribes to Supabase's own auth events (sign-in, sign-out, token
// refresh, and — importantly — sign-out from *another tab*, since Supabase
// broadcasts that across tabs). Returns an unsubscribe function for cleanup.
export function onAuthChange(callback: (user: PublicUser | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? toPublicUser(session.user) : null);
  });
  return () => data.subscription.unsubscribe();
}