import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { LifeOSState } from "./types";

// Data lives in Supabase now — one row per user in `life_os_data`, secured
// by the Row Level Security policies in supabase/schema.sql. This file used
// to read/write localStorage directly; none of that remains.

export type LoadResult =
  | { ok: true; data: LifeOSState | null } // data: null means no row yet — a brand-new account, not an error
  | { ok: false; message: string };

export async function loadState(userId: string): Promise<LoadResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      ok: false,
      message: "Supabase isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
    };
  }

  const { data, error } = await supabase
    .from("life_os_data")
    .select("data")
    .eq("user_id", userId)
    // .maybeSingle() returns { data: null, error: null } when no row matches.
    // .single() would instead treat "no row" as an error — wrong here, since
    // "no row yet" is the expected, normal state for a brand-new account.
    .maybeSingle();

  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true, data: (data?.data as LifeOSState | undefined) ?? null };
}

export async function saveState(userId: string, state: LifeOSState): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { error } = await supabase
    .from("life_os_data")
    .upsert({ user_id: userId, data: state }, { onConflict: "user_id" });

  return !error;
}