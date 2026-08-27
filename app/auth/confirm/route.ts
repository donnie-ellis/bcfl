// ./app/auth/confirm/route.ts
// Completes the Supabase Auth email flow (magic-link sign-in and
// commissioner invites both land here). With @supabase/ssr's default PKCE
// flow, GoTrue's own /verify endpoint completes the OTP check server-side
// and redirects back here with `?code=...` for us to exchange for a
// session; if the email template is ever customized to link directly here
// with `token_hash`/`type` instead, handle that too.
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'
  const upstreamError = searchParams.get('error_description') ?? searchParams.get('error')

  const supabase = await createClient()
  let failureReason = upstreamError

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    failureReason = error.message
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    failureReason = error.message
  }

  const params = new URLSearchParams({ error: failureReason ?? 'auth' })
  return NextResponse.redirect(`${origin}/?${params.toString()}`)
}
