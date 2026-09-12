import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Real accounts now, via Supabase Auth — not local-only. Passwords never
// touch our code at all; they go straight to Supabase over HTTPS and we
// only ever see back a session + user object. This module used to manage
// its own localStorage-based user list and SHA-256 hashing (see git history
// if you need to compare) — all of that is gone now, replaced by the
// Supabase JS client below.

export type Sex = "female" | "male" | "other";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  username: string | null;
  dob: string | null; // ISO date (YYYY-MM-DD) — source of truth; age is derived from this, never stored
  sex: Sex | null;
}

export class AuthError extends Error {}

function assertConfigured(): void {
  if (!supabase) {
    throw new AuthError(
      "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server."
    );
  }
}

const VALID_SEX: Sex[] = ["female", "male", "other"];

function toPublicUser(user: SupabaseUser): PublicUser {
  const meta = user.user_metadata ?? {};
  const metaName = typeof meta.name === "string" ? meta.name : null;
  const metaSex = typeof meta.sex === "string" && (VALID_SEX as string[]).includes(meta.sex) ? (meta.sex as Sex) : null;
  return {
    id: user.id,
    name: metaName || user.email?.split("@")[0] || "there",
    email: user.email ?? "",
    username: typeof meta.username === "string" && meta.username.trim() ? meta.username : null,
    dob: typeof meta.dob === "string" && meta.dob ? meta.dob : null,
    sex: metaSex,
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

export interface ProfileUpdate {
  username: string; // "" clears it back to unset
  dob: string; // "" clears it back to unset
  sex: Sex | "";
}

// Profile fields live in Supabase Auth's own user_metadata — not a separate
// table. There's no dedicated "profiles" table for this app, so there's also
// no uniqueness constraint on username; two accounts could pick the same
// one. Fine for a personal-use app with no public/social surface, but worth
// knowing if that ever changes.
export async function updateProfile(fields: ProfileUpdate): Promise<PublicUser> {
  assertConfigured();
  const { data, error } = await supabase!.auth.updateUser({
    data: {
      username: fields.username.trim() || null,
      dob: fields.dob || null,
      sex: fields.sex || null,
    },
  });
  if (error) throw new AuthError(error.message);
  if (!data.user) throw new AuthError("Update didn't return a user — please try again.");
  return toPublicUser(data.user);
}