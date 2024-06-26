import { Button } from "@/components/ui/button";
import { getServerAuthSession } from "@/auth";
import { signIn, signOut } from "next-auth/react";
import LoginButton from "@/components/LoginButton";
import LogOutButton from "@/components/LogOutButton";
import { fetchLeagues, fetchLeague, fetchTeams } from "@/lib/yahoo";

export default async function Home() {
  const session = await getServerAuthSession();

  if (session?.user) {
    const league = await fetchLeague();
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <h1 className="text-4xl">Bent City Fantasy League</h1>
        <h2>Welcome {session.user?.name}</h2>
        <p>{league.name}</p>
        <p>{league.season}</p>
        <LogOutButton />
      </main>
    )
  } else {
    return (
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <h1 className="text-4xl">Bent City Fantasy League</h1>
        <h2>Please Sign In</h2>
        <LoginButton />
      </main>
    );
  }
}