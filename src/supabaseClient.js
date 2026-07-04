import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT ─────────────────────────────────────────────────────────
// URL + publishable (anon) key come from Vite env vars so secrets aren't baked
// into source. See .env / .env.example. The anon key is safe to ship to the
// browser — Row Level Security on the `game_data` table is what actually keeps
// each user's queue private.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Don't crash the whole bundle — just make the misconfiguration loud.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Copy .env.example to .env and fill in your project values."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
