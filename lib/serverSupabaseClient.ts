// ./lib/serverSupabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types'

let supabase: ReturnType<typeof createClient<Database>> | null = null;
export function getServerSupabaseClient() {
  if (!supabase) {
    supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }
  return supabase;
}