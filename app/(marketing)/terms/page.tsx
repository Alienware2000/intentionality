// =============================================================================
// TERMS OF SERVICE PAGE
// Public terms of service for Intentionality.
// Required for Google OAuth verification.
// =============================================================================

import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - Intentionality",
  description: "Terms of service for Intentionality, a gamified productivity app for students.",
};

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-[var(--text-muted)] mb-8">
            Last updated: {lastUpdated}
          </p>

          <div className="space-y-8 text-[var(--text-secondary)]">
            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Agreement to Terms
              </h2>
              <p>
                By accessing or using Intentionality (&quot;the Service&quot;), you agree to be bound
                by these Terms of Service. If you do not agree to these terms, please do not
                use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Description of Service
              </h2>
              <p>
                Intentionality is a gamified productivity application designed for students.
                The Service includes task management, habit tracking, focus timers, AI-powered
                assistance, and optional integrations with third-party services like Google Calendar.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                User Accounts
              </h2>
              <p>To use Intentionality, you must:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Be at least 13 years of age</li>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
              <p className="mt-2">
                You are responsible for all activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Acceptable Use
              </h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Upload malicious code or content</li>
                <li>Impersonate others or misrepresent your affiliation</li>
                <li>Use automated systems to access the Service without permission</li>
                <li>Abuse the AI assistant or attempt to extract harmful content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Your Content
              </h2>
              <p>
                You retain ownership of content you create in Intentionality (tasks, quests,
                notes, etc.). By using the Service, you grant us a limited license to store,
                process, and display your content as necessary to provide the Service.
              </p>
              <p className="mt-2">
                You are responsible for ensuring your content does not violate any laws or
                third-party rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Third-Party Integrations
              </h2>
              <p>
                Intentionality may integrate with third-party services (e.g., Google Calendar).
                Your use of these integrations is subject to the respective third party&apos;s
                terms and privacy policies. We are not responsible for third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                AI Assistant
              </h2>
              <p>
                Our AI assistant (Kofi) provides productivity suggestions and assistance.
                AI responses are generated automatically and may not always be accurate or
                appropriate. You should not rely solely on AI advice for important decisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Gamification Features
              </h2>
              <p>
                XP, levels, streaks, and achievements are virtual rewards with no monetary value.
                We reserve the right to modify the gamification system, including adjusting XP
                values or resetting progress in cases of abuse.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Service Availability
              </h2>
              <p>
                We strive to maintain reliable service but do not guarantee uninterrupted access.
                The Service may be temporarily unavailable for maintenance, updates, or
                circumstances beyond our control.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Disclaimer of Warranties
              </h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
                IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, SECURE, OR
                AVAILABLE AT ALL TIMES.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Limitation of Liability
              </h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, INTENTIONALITY SHALL NOT BE LIABLE FOR
                ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING
                FROM YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Account Termination
              </h2>
              <p>
                We may suspend or terminate your account if you violate these Terms. You may
                delete your account at any time through the Settings page. Upon termination,
                your data will be deleted in accordance with our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Changes to Terms
              </h2>
              <p>
                We may update these Terms from time to time. Continued use of the Service after
                changes constitutes acceptance of the new Terms. We will notify you of
                significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Governing Law
              </h2>
              <p>
                These Terms are governed by the laws of the jurisdiction in which Intentionality
                operates, without regard to conflict of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3">
                Contact Us
              </h2>
              <p>
                If you have questions about these Terms, please contact us at:{" "}
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
