import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

// Real accounts now, via Supabase Auth — not local-only. Passwords never
// touch our code at all; they go straight to Supabase over HTTPS and we
// only ever see back a session + user object.
//
// Profile fields (username, dob, sex) live in a separate `profiles` table
// (see supabase/schema.sql), not in Supabase Auth's user_metadata — that's
// specifically so `username` can carry a real UNIQUE constraint, which a
// JSON metadata blob has no way to enforce. `name` and `email` still come
// straight from the auth user object, unchanged.

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
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

// The parts of PublicUser that come straight from the Supabase auth user
// object with no extra query — kept separate from the profile fields below
// so signUp/logIn/getSessionUser can return fast without always needing a
// round trip to the profiles table too.
function baseUser(user: SupabaseUser): Pick<PublicUser, "id" | "name" | "email"> {
  const metaName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null;
  return {
    id: user.id,
    name: metaName || user.email?.split("@")[0] || "there",
    email: user.email ?? "",
  };
}

async function fetchProfile(userId: string): Promise<Pick<PublicUser, "username" | "dob" | "sex">> {
  if (!supabase) return { username: null, dob: null, sex: null };
  const { data } = await supabase
    .from("profiles")
    .select("username, dob, sex")
    .eq("user_id", userId)
    .maybeSingle(); // no row yet is normal for an account that hasn't set a profile — not an error
  const sex = data?.sex && (VALID_SEX as string[]).includes(data.sex) ? (data.sex as Sex) : null;
  return { username: data?.username ?? null, dob: data?.dob ?? null, sex };
}

async function toPublicUser(user: SupabaseUser): Promise<PublicUser> {
  const [base, profile] = [baseUser(user), await fetchProfile(user.id)];
  return { ...base, ...profile };
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
    user: await toPublicUser(data.user),
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
    if (!session?.user) {
      callback(null);
      return;
    }
    toPublicUser(session.user).then(callback);
  });
  return () => data.subscription.unsubscribe();
}

export interface ProfileUpdate {
  username: string; // "" clears it back to unset
  dob: string; // "" clears it back to unset
  sex: Sex | "";
}

// Writes to the `profiles` table — see supabase/schema.sql for the UNIQUE
// index on username. We don't "check availability" first and then write;
// that has a race (two people could both check, both see it's free, both
// claim it). Instead we just attempt the write and let Postgres's unique
// constraint be the actual arbiter — error code 23505 means someone already
// has it, full stop, no race possible.
export async function updateProfile(userId: string, fields: ProfileUpdate): Promise<PublicUser> {
  assertConfigured();

  const username = fields.username.trim() || null;
  if (username && !USERNAME_PATTERN.test(username)) {
    throw new AuthError("Usernames are 3–20 characters: letters, numbers, and underscores only.");
  }
  const dob = fields.dob || null;
  const sex = fields.sex || null;

  const { error } = await supabase!
    .from("profiles")
    .upsert({ user_id: userId, username, dob, sex }, { onConflict: "user_id" });

  if (error) {
    if (error.code === "23505") {
      throw new AuthError("That username is already taken — try a different one.");
    }
    throw new AuthError(error.message);
  }

  const { data: authData, error: authError } = await supabase!.auth.getUser();
  if (authError || !authData.user) {
    throw new AuthError("Saved, but couldn't refresh your account — try reloading the page.");
  }
  return { ...baseUser(authData.user), username, dob, sex: sex as Sex | null };
}