"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [status, setStatus] = useState<string>("Checking session...");
    const [userId, setUserId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function refreshUser() {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
            setUserId(null);
            setStatus("Not logged in");
            return;
        }

        if (data.user) {
            setUserId(data.user.id);
            setStatus("Logged in");
            window.location.href = "/";
        } else {
            setUserId(null);
            setStatus("Not logged in");
        }

    }

    useEffect(() => {
        refreshUser();

        const { data: sub } = supabase.auth.onAuthStateChange(() => {
            refreshUser();
        });

        return () => {
            sub.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleSignUp() {
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            return;
        }

        setStatus("Signup success. Check email to confirm (if confirmations are ON).");
        await refreshUser();
    }

    async function handleLogIn() {
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            return;
        }

        setStatus("Logged in");
        await refreshUser();
    }

    async function handleLogOut() {
        setError(null);

        const { error } = await supabase.auth.signOut();
        if (error) {
            setError(error.message);
            return;
        }

        setStatus("Logged out");
        setUserId(null);
    }

    return (
        <div className="space-y-6 max-w-xl">
            <header className="space-y-2">
                <h1 className="text-3xl font-semibold">Auth</h1>
                <p className="text-white/70">
                    This page exists to prove email+password auth works before we touch tasks, quests, or Prisma.
                </p>
                <Link className="text-white/70 underline hover:text-white" href="/">
                    Back to home
                </Link>
            </header>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-2">
                <div className="text-sm text-white/70">Status: {status}</div>
                <div className="text-sm text-white/70">
                    User: {userId ? <span className="text-white">{userId}</span> : "None"}
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-red-300">
                    {error}
                </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                <div className="space-y-2">
                    <label className="block text-sm text-white/70">Email</label>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/25"
                            placeholder="you@example.com"
                        />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm text-white/70">Password</label>
                        <input
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            type="password"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-white/25"
                            placeholder="••••••••"
                        />
                </div>

                <div>
                    <button
                        type="button"
                        onClick={handleSignUp}
                        className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15 transition"
                    >
                        Sign up
                    </button>

                    <button
                        type="button"
                        onClick={handleLogIn}
                        className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15 transition"
                    >
                        Log in
                    </button>

                    <button
                        type="button"
                        onClick={handleLogOut}
                        className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 hover:bg-white/15 transition"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    );
}