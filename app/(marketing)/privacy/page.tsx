// =============================================================================
// PRIVACY POLICY PAGE
// Public privacy policy for Intentionality.
// Required for Google OAuth verification.
// =============================================================================

import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - Intentionality",
  description: "Privacy policy for Intentionality, a gamified productivity app for students.",
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "February 3, 2025";

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center font-bold text-white text-sm transition-transform group-hover:scale-105">
              I
            </div>
            <span className="font-semibold text-[var(--text-primary)] hidden sm:block">
              Intentionality
            </span>
          </Link>
          <Link
            href="/auth"
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign in
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-16 px-6">
        <article className="mx-auto max-w-4xl prose prose-invert prose-sm sm:prose-base">
          <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-2">
            Privacy Policy
          </h1>
          <p className="text-[var(--text-muted)] mb-8">
            Last updated: {lastUpdated}
          </p>

          <div className="space-y-8 text-[var(--text-secondary)]">
            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Introduction
              </h2>
              <p>
                Intentionality (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your
                information when you use our gamified productivity application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Information We Collect
              </h2>

              <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                Account Information
              </h3>
              <p>When you create an account, we collect:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Email address</li>
                <li>Display name (optional)</li>
                <li>Profile picture (optional)</li>
              </ul>

              <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                Usage Data
              </h3>
              <p>We collect data about how you use Intentionality:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Tasks, quests, and habits you create</li>
                <li>Focus session duration and patterns</li>
                <li>XP earned and achievement progress</li>
                <li>Conversations with our AI assistant (Kofi)</li>
              </ul>

              <h3 className="text-lg font-medium text-[var(--text-primary)] mt-4 mb-2">
                Third-Party Integrations
              </h3>
              <p>If you connect external services:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>
                  <strong>Google Calendar:</strong> We access your calendar events in read-only mode
                  to display them in your dashboard. We store OAuth tokens securely and only access
                  the calendars you explicitly select.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                How We Use Your Information
              </h2>
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Provide and maintain the Intentionality service</li>
                <li>Track your productivity progress and gamification stats</li>
                <li>Personalize AI assistant responses based on your goals and patterns</li>
                <li>Send important service updates (you can opt out of non-essential emails)</li>
                <li>Improve our service through aggregated, anonymized analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Data Storage and Security
              </h2>
              <p>
                Your data is stored securely using Supabase, which provides enterprise-grade
                security including encryption at rest and in transit. We implement Row Level
                Security (RLS) to ensure you can only access your own data.
              </p>
              <p className="mt-2">
                OAuth tokens for third-party services (like Google Calendar) are encrypted
                and stored separately from your main data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Data Sharing
              </h2>
              <p>We do not sell your personal information. We may share data only:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>With service providers who help operate our platform (e.g., hosting, AI providers)</li>
                <li>If required by law or to protect our rights</li>
                <li>With your explicit consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                AI Assistant (Kofi)
              </h2>
              <p>
                Our AI assistant uses your task data, habits, and conversation history to provide
                personalized productivity advice. Conversations are processed by third-party AI
                providers (Google Gemini, Groq) under their respective privacy policies. We do not
                use your conversations to train AI models.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Your Rights
              </h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Access your personal data</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data in a portable format</li>
                <li>Disconnect third-party integrations at any time</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, visit Settings in the app or contact us at the
                email below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Cookies and Tracking
              </h2>
              <p>
                We use essential cookies for authentication and session management. We do not
                use third-party advertising trackers. Analytics, if used, are privacy-focused
                and anonymized.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Children&apos;s Privacy
              </h2>
              <p>
                Intentionality is intended for users 13 years of age and older. We do not
                knowingly collect personal information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of
                significant changes by posting a notice in the app or sending an email.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Contact Us
              </h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at:{" "}
                <a
                  href="mailto:antwidavid389@gmail.com"
                  className="text-[var(--accent-primary)] hover:underline"
                >
                  antwidavid389@gmail.com
                </a>
              </p>
            </section>
          </div>
        </article>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Terms of Service
            </Link>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Intentionality
          </p>
        </div>
      </footer>
    </>
  );
}
