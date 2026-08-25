'use client'
import { Button } from "@/components/ui/button";
import { FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LogOutButton() {
    const router = useRouter();
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    }
    return (
        <form onSubmit={handleSubmit}>
            <Button>Log out</Button>
        </form>
    )
}
