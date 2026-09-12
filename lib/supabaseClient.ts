import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// True once both env vars are present. Checked before any auth/storage call
// so we can show one clear "not configured" message instead of an opaque
// crash the first time something tries to reach Supabase.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Only ever null when the env vars are missing — callers must check
// isSupabaseConfigured (or handle null) before using this.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;