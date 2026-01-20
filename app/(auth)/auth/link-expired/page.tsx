"use client";

// =============================================================================
// LINK EXPIRED PAGE
// Displayed when a user clicks an expired or invalid email confirmation link.
// Provides option to resend the confirmation email.
// =============================================================================

import { useState, useMemo } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { cn } from "@/app/lib/cn";
import { AlertCircle, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export default function LinkExpiredPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleResendEmail() {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
  }

  // Success state - show confirmation message
  if (success) {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <header className="space-y-2 text-center">
          <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
            Email Sent
          </h1>
          <div className="mx-auto h-[2px] w-16 bg-gradient-to-r from-transparent via-[var(--accent-success)] to-transparent" />
        </header>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 space-y-6 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--accent-success)]/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[var(--accent-success)]" />
          </div>

          <div className="space-y-2">
            <p className="text-[var(--text-primary)]">
              A new confirmation email has been sent to:
            </p>
            <p className="font-mono text-[var(--accent-primary)] break-all">
              {email}
            </p>
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            Check your inbox and click the link to verify your account. The new
            link will expire in 24 hours.
          </p>

          <Link
            href="/auth"
            className={cn(
              "flex items-center justify-center gap-2",
              "w-full rounded-lg border border-[var(--accent-primary)]",
              "bg-[var(--accent-primary)]/10 px-4 py-3 text-[var(--accent-primary)]",
              "hover:bg-[var(--accent-primary)]/20 transition"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Default state - show resend form
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <header className="space-y-2 text-center">
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Link Expired
        </h1>
        <div className="mx-auto h-[2px] w-16 bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent" />
      </header>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 space-y-6 text-center">
        {/* Warning Icon */}
        <div className="mx-auto w-16 h-16 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-[var(--accent-primary)]" />
        </div>

        <div className="space-y-2">
          <p className="text-[var(--text-primary)]">
            This confirmation link has expired or is invalid.
          </p>
          <p className="text-sm text-[var(--text-secondary)]">
            Enter your email address below to receive a new confirmation link.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 p-4 text-[var(--accent-primary)] text-sm text-left">
            {error}
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-2 text-left">
          <label className="block text-sm text-[var(--text-secondary)]">
            Email address
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            disabled={loading}
            className={cn(
              "w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]",
              "px-4 py-3 text-[var(--text-primary)]",
              "outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
            )}
            placeholder="you@example.com"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleResendEmail();
              }
            }}
          />
        </div>

        {/* Resend Button */}
        <button
          type="button"
          onClick={handleResendEmail}
          disabled={loading}
          className={cn(
            "w-full rounded-lg border border-[var(--accent-primary)]",
            "bg-[var(--accent-primary)]/10 px-4 py-3 text-[var(--accent-primary)]",
            "hover:bg-[var(--accent-primary)]/20 transition disabled:opacity-50",
            "flex items-center justify-center gap-2"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Resend Confirmation Email"
          )}
        </button>

        {/* Back to Sign In */}
        <Link
          href="/auth"
          className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
