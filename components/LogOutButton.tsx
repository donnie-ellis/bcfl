'use client'
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { FormEvent } from "react";

export default function LogOutButton() {
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await signOut();
    }
    return (
        <form onSubmit={handleSubmit}>
            <Button>Log out</Button>
        </form>
    )
}