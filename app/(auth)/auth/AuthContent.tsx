"use client";

// =============================================================================
// AUTH CONTENT
// Provides email/password and Google OAuth authentication.
// Features:
// - Loading states with spinners on buttons
// - "Check your email" view after sign-up
// - Resend confirmation email with cooldown
// - Toast notifications for success/error states
// =============================================================================

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/app/lib/supabase/client";
import { cn } from "@/app/lib/cn";
import { useToast } from "@/app/components/Toast";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

type AuthView = "form" | "check-email";

export default function AuthContent() {
  // Create Supabase client once per component lifecycle
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // View state
  const [view, setView] = useState<AuthView>("form");
  const [pendingEmail, setPendingEmail] = useState("");

  // Loading states (button-specific)
  const [signingUp, setSigningUp] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Resend cooldown (seconds remaining)
  const [resendCooldown, setResendCooldown] = useState(0);

  // UI state
  const [status, setStatus] = useState<string>("Checking session...");
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Combined loading state for disabling inputs
  const isLoading = signingUp || loggingIn || googleLoading;

  /**
   * Check if user is already authenticated.
   * Uses getUser() for server-validated auth check.
   */
  const checkUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      setUserId(null);
      setStatus("Not logged in");
      return;
    }

    // User is authenticated - redirect to home
    setUserId(data.user.id);
    setStatus("Logged in - redirecting...");
    router.push("/dashboard");
  }, [supabase, router]);

  // Handle URL params (confirmed, error) and auth state
  useEffect(() => {
    // Check for email confirmation success
    const confirmed = searchParams.get("confirmed");
    if (confirmed === "true") {
      showToast({ message: "Email confirmed! You can now sign in.", type: "success" });
      // Clean up URL
      router.replace("/auth");
    }

    // Check for callback errors
    const errorParam = searchParams.get("error");
    const errorMessage = searchParams.get("message");
    if (errorParam) {
      if (errorParam === "verification_failed" && errorMessage) {
        setError(`Verification failed: ${errorMessage}`);
      } else if (errorParam === "callback_failed") {
        setError("Authentication failed. Please try again.");
      } else if (errorParam === "invalid_callback") {
        setError("Invalid authentication link. Please try again.");
      } else {
        setError("Authentication failed. Please try again.");
      }
    }

    // Check initial auth state
    checkUser();

    // Subscribe to auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          setUserId(session.user.id);
          setStatus("Logged in - redirecting...");
          router.push("/dashboard");
        } else if (event === "SIGNED_OUT") {
          setUserId(null);
          setStatus("Not logged in");
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [resendCooldown]);

  /**
   * Sign up with email and password.
   * Creates a new account and sends confirmation email if enabled.
   */
  async function handleSignUp() {
    setError(null);
    setSigningUp(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setSigningUp(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Transition to check-email view
    setPendingEmail(email);
    setView("check-email");
    setResendCooldown(60);
  }

  /**
   * Sign in with email and password.
   */
  async function handleLogIn() {
    setError(null);
    setLoggingIn(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoggingIn(false);

    if (error) {
      setError(error.message);
      return;
    }

    // onAuthStateChange will handle the redirect
  }

  /**
   * Sign in with Google OAuth.
   * Redirects to Google consent screen, then back to /auth/callback.
   */
  async function handleGoogleLogin() {
    setError(null);
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Redirect back to our callback handler after Google consent
        redirectTo: `${window.location.origin}/auth/callback`,
        // Force account picker even when user has an active Google session
        queryParams: {
          prompt: "select_account",
        },
      },
    });

    // Note: If successful, the browser redirects to Google.
    // If it fails, we handle the error here.
    if (error) {
      setGoogleLoading(false);
      setError(error.message);
    }
  }

  /**
   * Sign out the current user.
   */
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

  /**
   * Resend confirmation email.
   */
  async function handleResendEmail() {
    if (resendCooldown > 0 || !pendingEmail) return;

    setResendingEmail(true);
    setError(null);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setResendingEmail(false);

    if (error) {
      setError(error.message);
      return;
    }

    showToast({ message: "Confirmation email sent!", type: "success" });
    setResendCooldown(60);
  }

  /**
   * Go back to sign-in form from check-email view.
   */
  function handleBackToForm() {
    setView("form");
    setPendingEmail("");
    setError(null);
  }

  // =============================================================================
  // CHECK EMAIL VIEW
  // =============================================================================
  if (view === "check-email") {
    return (
      <div className="space-y-6 max-w-md mx-auto">
        <header className="space-y-2 text-center">
          <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
            Check Your Inbox
          </h1>
          <div className="mx-auto h-[2px] w-16 bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent" />
        </header>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 space-y-6 text-center">
          {/* Mail Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--accent-primary)]/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-[var(--accent-primary)]" />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <p className="text-[var(--text-primary)]">
              We&apos;ve sent a confirmation email to:
            </p>
            <p className="font-mono text-[var(--accent-primary)] break-all">
              {pendingEmail}
            </p>
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            Click the link in the email to verify your account. The link will
            expire in 24 hours.
          </p>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 p-4 text-[var(--accent-primary)] text-sm">
              {error}
            </div>
          )}

          {/* Resend Button */}
          <button
            type="button"
            onClick={handleResendEmail}
            disabled={resendCooldown > 0 || resendingEmail}
            className={cn(
              "w-full rounded-lg border border-[var(--border-default)]",
              "bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-secondary)]",
              "hover:bg-[var(--bg-hover)] transition disabled:opacity-50",
              "flex items-center justify-center gap-2"
            )}
          >
            {resendingEmail ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              `Resend email (${resendCooldown}s)`
            ) : (
              "Resend confirmation email"
            )}
          </button>

          {/* Back to Sign In */}
          <button
            type="button"
            onClick={handleBackToForm}
            className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm hover:text-[var(--text-primary)] transition mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </button>
        </div>

        <div className="text-center">
          <Link
            className="text-[var(--text-muted)] text-sm underline hover:text-[var(--text-primary)]"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // =============================================================================
  // SIGN IN / SIGN UP FORM VIEW
  // =============================================================================
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <header className="space-y-2 text-center">
        <h1 className="text-sm font-bold tracking-widest uppercase text-[var(--text-primary)]">
          Welcome
        </h1>
        <div className="mx-auto h-[2px] w-16 bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent" />
        <p className="text-[var(--text-secondary)] mt-4">
          Sign in to access your quests and tasks.
        </p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 p-4 text-[var(--accent-primary)] text-sm">
          {error}
        </div>
      )}

      {/* Auth Forms */}
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-6">
        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className={cn(
            "w-full flex items-center justify-center gap-3",
            "rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)]",
            "px-4 py-3 text-[var(--text-primary)]",
            "hover:bg-[var(--bg-hover)] transition disabled:opacity-50"
          )}
        >
          {googleLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              {/* Google Icon */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 border-t border-[var(--border-subtle)]" />
          <span className="text-[var(--text-muted)] text-sm">or</span>
          <div className="flex-1 border-t border-[var(--border-subtle)]" />
        </div>

        {/* Email/Password Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)]">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              disabled={isLoading}
              className={cn(
                "w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]",
                "px-4 py-3 text-[var(--text-primary)]",
                "outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
              )}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)]">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              disabled={isLoading}
              className={cn(
                "w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]",
                "px-4 py-3 text-[var(--text-primary)]",
                "outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
              )}
              placeholder="********"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleLogIn}
              disabled={isLoading}
              className={cn(
                "flex-1 rounded-lg border border-[var(--accent-primary)]",
                "bg-[var(--accent-primary)]/10 px-4 py-3 text-[var(--accent-primary)]",
                "hover:bg-[var(--accent-primary)]/20 transition disabled:opacity-50",
                "flex items-center justify-center gap-2"
              )}
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </button>

            <button
              type="button"
              onClick={handleSignUp}
              disabled={isLoading}
              className={cn(
                "flex-1 rounded-lg border border-[var(--border-default)]",
                "bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-secondary)]",
                "hover:bg-[var(--bg-hover)] transition disabled:opacity-50",
                "flex items-center justify-center gap-2"
              )}
            >
              {signingUp ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing up...
                </>
              ) : (
                "Sign up"
              )}
            </button>
          </div>
        </div>

        {/* Log Out (only show if logged in) */}
        {userId && (
          <button
            type="button"
            onClick={handleLogOut}
            disabled={isLoading}
            className={cn(
              "w-full rounded-lg border border-[var(--accent-primary)]/20",
              "bg-[var(--accent-primary)]/10 px-4 py-3 text-[var(--accent-primary)]",
              "hover:bg-[var(--accent-primary)]/20 transition disabled:opacity-50"
            )}
          >
            Log out
          </button>
        )}
      </div>

      {/* Status Display (smaller, at bottom) */}
      <div className="text-center text-sm text-[var(--text-muted)]">
        {status}
        {userId && (
          <span className="block text-xs mt-1 font-mono">{userId}</span>
        )}
      </div>

      <div className="text-center">
        <Link
          className="text-[var(--text-muted)] text-sm underline hover:text-[var(--text-primary)]"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
