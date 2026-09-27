"use client";

import { motion } from "framer-motion";
import { GradientText } from "@/components/shared/gradient-text";

export function HeroSection() {
  return (
    <div className="text-center">
      {/* Logo / Brand */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-subtle bg-elevated/50 text-xs text-text-secondary font-mono">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald dot-pulse" />
          AI Agents Ready
        </div>
      </motion.div>

      {/* Main heading */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-5xl md:text-7xl font-bold font-heading tracking-tight"
      >
        <GradientText>DataForge</GradientText>
        <span className="text-text-primary"> AI</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 text-lg md:text-xl text-text-secondary max-w-xl mx-auto font-body leading-relaxed"
      >
        Transform natural language into structured, source-backed datasets.
        <br />
        <span className="text-text-muted">
          Powered by AI agents that plan, discover, extract, validate, and
          deduplicate.
        </span>
      </motion.p>

      {/* Agent pipeline preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="mt-8 flex items-center justify-center gap-3 text-xs font-mono text-text-muted"
      >
        {["Plan", "Discover", "Extract", "Critic", "Validate"].map(
          (step, i) => (
            <div key={step} className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan/40" />
                {step}
              </span>
              {i < 4 && (
                <svg
                  width="16"
                  height="8"
                  viewBox="0 0 16 8"
                  className="text-text-muted/30"
                >
                  <path
                    d="M0 4h12M10 1l3 3-3 3"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="1"
                  />
                </svg>
              )}
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}
