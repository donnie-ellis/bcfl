// ./app/page.tsx
// The start page for the application. Logged in users should not see this.

'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LoginButton from "@/components/LoginButton";

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <main className="flex min-h-screen flex-col items-center justify-center">
      <p>Loading...</p>
    </main>;
  }

  if (status === 'authenticated') {
    return null; // This will briefly show before redirecting
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl">Bent City Fantasy League</h1>
      <h2>Please Sign In</h2>
      <LoginButton />
    </main>
  );
}