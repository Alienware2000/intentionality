"use client";

// =============================================================================
// HERO SECTION
// Minimalist, high-end aesthetic that stays true to the Intentionality brand.
// Focuses on the core message: "If you're not ready to be intentional..."
// =============================================================================

import { useEffect, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import anime from "animejs";
import { ArrowRight, Check, Clock, Calendar, Target, Inbox, LayoutDashboard, Sparkles, Trophy, Settings, Flame, Search, Plus, TrendingUp, Zap } from "lucide-react";
import { prefersReducedMotion } from "@/app/lib/anime-utils";

export default function HeroSection() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);
  const { scrollY } = useScroll();

  // Parallax for the dashboard mockup
  // Keep opacity very high (0.98) so it stays crisp and doesn't look like a background image
  const yMockup = useTransform(scrollY, [0, 500], [0, -20]);
  const opacityMockup = useTransform(scrollY, [0, 400], [1, 0.98]);

  useEffect(() => {
    if (hasAnimated.current || prefersReducedMotion()) return;
    hasAnimated.current = true;

    // Fast, sharp reveal for the headline
    if (headlineRef.current) {
      const words = headlineRef.current.querySelectorAll(".hero-word");
      anime({
        targets: words,
        opacity: [0, 1],
        translateY: [15, 0],
        delay: anime.stagger(40, { start: 100 }),
        duration: 600,
        easing: "easeOutCubic",
      });
    }
  }, []);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-start pt-40 pb-20 px-6 overflow-hidden"
    >
      {/* Background Atmosphere Glow - Subtle Crimson */}
      <div className="landing-hero-atmosphere" />

      <div className="relative z-10 max-w-4xl w-full text-center mb-24">
        
        {/* Clean Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] mb-8 shadow-sm"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
          <span className="text-[11px] text-[var(--text-secondary)] tracking-wide font-medium uppercase">
            Built for focus
          </span>
        </motion.div>

        {/* Stark Headline - CRITICAL: DO NOT REMOVE OR CHANGE THIS TEXT */}
        <h1
          ref={headlineRef}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-[var(--text-primary)] mb-8"
        >
          <span className="hero-word inline-block opacity-0">If</span>{" "}
          <span className="hero-word inline-block opacity-0">you&apos;re</span>{" "}
          <span className="hero-word inline-block opacity-0">not</span>{" "}
          <span className="hero-word inline-block opacity-0">ready</span>{" "}
          <span className="hero-word inline-block opacity-0">to</span>{" "}
          <span className="hero-word inline-block opacity-0">be</span>{" "}
          <span className="hero-word inline-block opacity-0 text-[var(--accent-primary)]">
            intentional,
          </span>{" "}
          <br className="hidden md:block" />
          <span className="hero-word inline-block opacity-0">this</span>{" "}
          <span className="hero-word inline-block opacity-0">is</span>{" "}
          <span className="hero-word inline-block opacity-0">not</span>{" "}
          <span className="hero-word inline-block opacity-0">for</span>{" "}
          <span className="hero-word inline-block opacity-0">you.</span>
        </h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
        >
          No app will make you productive. That part is on you. 
          Intentionality just makes it easier to see what actually needs doing, 
          so you spend less time planning and more time working.
        </motion.p>

        {/* Ultra-clean CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/auth?mode=signup"
            className="group inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-base)] font-medium rounded-md transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-white/10"
          >
            Get Started
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-[var(--text-secondary)] font-medium rounded-md border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            How it works
          </Link>
        </motion.div>
      </div>

      {/* Refined Dashboard Mockup - Clean, high-fidelity, app-accurate */}
      <motion.div
        style={{ y: yMockup, opacity: opacityMockup }}
        className="relative w-full max-w-[1100px] mx-auto z-0"
      >
        <div className="relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] shadow-2xl overflow-hidden ring-1 ring-white/5 flex flex-col">
          
          {/* Subtle Window Chrome */}
          <div className="h-10 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] flex items-center px-4">
             <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-hover)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-hover)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--bg-hover)]" />
             </div>
             <div className="mx-auto flex items-center justify-center">
                <div className="px-4 py-1 rounded-md bg-[var(--bg-base)] border border-[var(--border-subtle)] flex items-center gap-2 text-[11px] font-geist-mono text-[var(--text-muted)]">
                   <span>app.intentionality.com</span>
                </div>
             </div>
             <div className="w-[50px]"></div> {/* Spacer */}
          </div>

          {/* Application Layout */}
          <div className="flex h-[600px] bg-[var(--bg-base)] font-sans text-sm">
             
             {/* Left Sidebar */}
             <div className="w-64 border-r border-[var(--border-subtle)] bg-[var(--bg-elevated)] hidden md:flex flex-col">
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-[var(--accent-primary)] flex items-center justify-center font-bold text-white text-[10px] shadow-lg shadow-red-500/20">I</div>
                    <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--text-primary)]">
                      Command Center
                    </span>
                  </div>
                </div>

                {/* Kofi Assistant Button */}
                <div className="px-4 pb-4">
                  <div className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl glass-red transition-all hover:bg-[rgba(220,38,38,0.12)] cursor-pointer">
                    <Sparkles size={16} className="text-[var(--accent-primary)]" />
                    <span className="font-bold text-[12px] tracking-tight">Chat with Kofi</span>
                  </div>
                </div>

                {/* Progress / XP */}
                <div className="px-6 pb-6">
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        Rank // Initiate
                      </span>
                      <span className="text-[10px] font-bold text-[var(--accent-highlight)]">
                        LVL 12
                      </span>
                    </div>
                    {/* XP Bar */}
                    <div className="h-1.5 w-full bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-subtle)]">
                       <div className="h-full bg-[var(--accent-primary)] w-[65%] shadow-[0_0_10px_rgba(220,38,38,0.5)]" />
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 space-y-1">
                   <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-subtle)] shadow-sm">
                      <LayoutDashboard size={14} className="text-[var(--accent-primary)]" />
                      <span className="text-[12px] font-bold tracking-tight">Dashboard</span>
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors group">
                      <Calendar size={14} className="group-hover:text-[var(--accent-info)] transition-colors" />
                      <span className="text-[12px] font-medium">Calendar</span>
                   </div>
                   <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors group">
                      <Target size={14} className="group-hover:text-[var(--accent-success)] transition-colors" />
                      <span className="text-[12px] font-medium">Goals</span>
                   </div>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-card)]/50">
                   <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent-streak)]/10 text-[var(--accent-streak)] border border-[var(--accent-streak)]/20 shadow-sm accent-glow-gold">
                      <Flame size={12} fill="currentColor" />
                      <span className="text-[11px] font-bold">14</span>
                   </div>
                   <div className="p-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                      <Settings size={14} />
                   </div>
                </div>
             </div>

             {/* Main Content Area */}
             <div className="flex-1 p-8 overflow-y-auto bg-[var(--bg-base)] custom-scrollbar relative">
                {/* Subtle structural lines */}
                <div className="absolute top-0 left-8 bottom-0 w-px bg-gradient-to-b from-transparent via-[var(--border-subtle)] to-transparent" />
                
                <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                   
                   {/* Top Stats Overview */}
                   <section>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-label">Active Performance</h2>
                        <div className="h-px flex-1 bg-[var(--border-subtle)] ml-4" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                         <div className="p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] shadow-sm hover:accent-glow-red transition-all group">
                            <div className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] mb-2">Focus Time</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight group-hover:text-[var(--accent-primary)] transition-colors">1h 45m</div>
                            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--accent-success)] font-bold uppercase">
                               <TrendingUp size={10} /> +12%
                            </div>
                         </div>
                         <div className="p-5 rounded-xl glass-green shadow-sm transition-all group">
                            <div className="text-[9px] font-bold text-[var(--accent-success)] uppercase tracking-[0.2em] mb-2">Completion</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">4 / 7</div>
                            <div className="h-1.5 w-full bg-white/10 mt-4 rounded-full overflow-hidden border border-white/5">
                               <div className="h-full bg-[var(--accent-success)] w-[57%] shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                            </div>
                         </div>
                         <div className="p-5 rounded-xl glass-gold shadow-sm transition-all group">
                            <div className="text-[9px] font-bold text-[var(--accent-highlight)] uppercase tracking-[0.2em] mb-2">Yield</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">+120 XP</div>
                            <div className="mt-3 text-[9px] font-bold text-white/50 uppercase tracking-wider">Top 5% Student</div>
                         </div>
                      </div>
                   </section>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Focus Launcher */}
                      <section>
                         <h2 className="text-label mb-4">Focus Protocol</h2>
                         <div className="p-8 rounded-2xl glass-red flex flex-col items-center justify-center text-center h-[260px] shadow-xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 mb-6 shadow-xl">
                               <Clock size={28} className="text-white" />
                            </div>
                            <div className="text-[16px] font-bold text-white mb-1">Engage Deep Work</div>
                            <div className="text-[12px] text-white/70 mb-8 font-medium">Start session to trigger bonus multipliers</div>
                            <button className="px-10 py-3 rounded-xl bg-white text-[var(--accent-primary)] text-[13px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20">
                               Start Focusing
                            </button>
                         </div>
                      </section>

                      {/* Today's Tasks */}
                      <section className="flex flex-col h-full">
                         <div className="flex justify-between items-center mb-4">
                           <h2 className="text-label">Active Quests</h2>
                           <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest border border-[var(--border-subtle)] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)]">March 7</span>
                         </div>
                         <div className="space-y-3 flex-1">
                            <MockTaskCard title="Research paper outline" priority="high" completed />
                            <MockTaskCard title="Draft introduction for essay" priority="medium" active />
                            <MockTaskCard title="Lab report data analysis" priority="high" info="Lab 3" />
                            <div className="py-3 rounded-xl border border-dashed border-[var(--border-default)] flex items-center justify-center gap-2 text-[var(--text-muted)] text-[12px] mt-2 hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-all cursor-pointer">
                               <Plus size={14} /> Initialize Task
                            </div>
                         </div>
                      </section>
                   </div>

                </div>
             </div>

          </div>
        </div>
        
        {/* Crisp Shadow */}
        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-black blur-3xl -z-10 opacity-40" />
      </motion.div>

    </section>
  );
}

function MockTaskCard({ title, priority, completed, active, info }: { title: string, priority: "high"|"medium"|"low", completed?: boolean, active?: boolean, info?: string }) {
   const priorityColors = {
      high: "text-[var(--priority-high)] bg-[var(--priority-high)]/10 border-[var(--priority-high)]/20",
      medium: "text-[var(--priority-medium)] bg-[var(--priority-medium)]/10 border-[var(--priority-medium)]/20",
      low: "text-[var(--text-muted)] bg-[var(--bg-hover)] border-[var(--border-subtle)]",
   };

   return (
      <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
         active 
            ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/5' 
            : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'
      } ${completed ? 'opacity-40 grayscale-[0.5]' : ''}`}>
         <div className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 ${
            completed 
               ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] text-white' 
               : active ? 'border-[var(--accent-primary)] bg-transparent' : 'border-[var(--border-default)] bg-transparent'
         }`}>
            {completed && <Check size={12} strokeWidth={3} />}
            {active && !completed && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />}
         </div>
         <div className={`flex-1 text-sm truncate ${completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)] font-medium'}`}>
            {title}
         </div>
         {info && (
            <div className="text-[9px] font-geist-mono text-[var(--accent-info)] px-1.5 py-0.5 rounded border border-[var(--accent-info)]/30 bg-[var(--accent-info)]/5 tracking-tighter uppercase">
               {info}
            </div>
         )}
         <div className={`px-2 py-0.5 rounded text-[9px] font-geist-mono tracking-widest uppercase border ${priorityColors[priority]}`}>
            {priority}
         </div>
      </div>
   );
}
