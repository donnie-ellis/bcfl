// ./lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database.types'

// Per-request Supabase client for Server Components and Route Handlers.
// Runs as the calling user (auth.uid() is set from their session cookie),
// so RLS policies apply. Must be created fresh per request, not cached at
// module scope, since it reads/writes the request's own cookies.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component that can't set cookies directly;
            // safe to ignore since the middleware refreshes the session.
          }
        },
      },
    }
  )
}
