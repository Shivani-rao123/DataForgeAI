"use client";

import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <div className="text-center">
      {/* Status badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8"
      >
        <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full border border-border-subtle bg-elevated/50 text-xs text-text-secondary font-mono tracking-wide">
          <span className="h-2 w-2 rounded-full bg-emerald dot-pulse" />
          AI Agents Ready
        </div>
      </motion.div>

      {/* Main heading — bold shimmer reveal */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-6xl md:text-8xl font-bold font-heading tracking-tight leading-none"
      >
        <span className="shimmer-reveal">DataForge</span>
        <span className="text-text-primary ml-4">AI</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto font-body leading-relaxed"
      >
        Transform natural language into structured, source-backed datasets.
        <br />
        <span className="text-text-muted">
          Powered by five AI agents working in concert.
        </span>
      </motion.p>

      {/* Animated pipeline orbs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-10 flex items-center justify-center gap-0"
      >
        {["Plan", "Discover", "Extract", "Critic", "Validate"].map(
          (step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="orb" />
                <span className="text-[11px] font-mono text-text-muted tracking-wider uppercase">
                  {step}
                </span>
              </div>
              {i < 4 && (
                <div className="w-10 h-px bg-gradient-to-r from-border-subtle via-cyan/20 to-border-subtle mx-1 mt-[-18px]" />
              )}
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}
