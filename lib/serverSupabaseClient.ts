// ./lib/serverSupabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/types/database.types'

// Bypasses RLS with the service role key. Only for genuinely privileged
// server-only operations: the Sleeper player import cron, and the
// commissioner-invite API route (which calls supabase.auth.admin.*).
// Everything else should use lib/supabase/server.ts's per-request client
// so it runs as the calling user and RLS applies.
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
