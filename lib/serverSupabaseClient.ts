// ./lib/serverSupabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types'

let supabase: ReturnType<typeof createClient<Database>> | null = null;
export function getServerSupabaseClient() {
  if (!supabase) {
    supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}

// Bypasses RLS with the service role key. Only for trusted server-side code
// that manages the NextAuth `users`/`sessions` tables outside any user's own
// Supabase auth context (e.g. auth.ts, lib/yahoo.ts).
let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;
export function getServerSupabaseAdminClient() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return supabaseAdmin;
}