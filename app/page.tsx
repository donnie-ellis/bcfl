// ./app/page.tsx
// The start page for the application. Logged in users should not see this.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LoginButton from "@/components/LoginButton";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl">Bent City Fantasy League</h1>
      <h2>Please Sign In</h2>
      <LoginButton />
    </main>
  );
}
