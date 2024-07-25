// ./lib/useSupabaseClient.ts
import { useState, useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useSession } from 'next-auth/react';

let supabase: SupabaseClient | null = null;

export function useSupabaseClient() {
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const { data: session } = useSession();

  useEffect(() => {
    if (!supabase) {
      supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }

    if (session?.accessToken) {
      supabase.auth.setSession({
        access_token: session.accessToken,
        refresh_token: session.refreshToken!,
      });
    }

    setClient(supabase);
  }, [session]);

  return client;
}