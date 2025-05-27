'use client'
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { FormEvent } from "react";

export default function LoginButton() {
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        await signIn('yahoo');
    }
    return (
        <form onSubmit={handleSubmit}>
            <Button>Yahoo! Login</Button>
        </form>
    )
}