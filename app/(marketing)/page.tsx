// =============================================================================
// LANDING PAGE
// Public landing page for Intentionality.
// Philosophy-driven, direct messaging with interactive demos.
// =============================================================================

import LandingNav from "../components/landing/LandingNav";
import HeroSection from "../components/landing/HeroSection";
import PhilosophySection from "../components/landing/PhilosophySection";
import FeaturesShowcase from "../components/landing/FeaturesShowcase";
import SocialProof from "../components/landing/SocialProof";
import CTASection from "../components/landing/CTASection";

export const metadata = {
  title: "Intentionality - For Students Who Mean It",
  description:
    "A gamified productivity dashboard for students ready to put in the work. XP, streaks, focus timers, and AI assistance—built to support your discipline, not replace it.",
};

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <HeroSection />
      <PhilosophySection />
      <FeaturesShowcase />
      <SocialProof />
      <CTASection />

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[var(--border-subtle)]">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--accent-primary)] flex items-center justify-center font-bold text-white text-xs">
              I
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              Intentionality
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            © {new Date().getFullYear()} Intentionality. Made for students, by
            students.
          </p>
        </div>
      </footer>
    </>
  );
}
