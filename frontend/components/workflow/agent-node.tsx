"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { agentIconMap } from "@/components/shared/agent-icons";
import type { PipelineStage } from "@/lib/types";

export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  agent: string;
  icon: string;
  stage: PipelineStage;
  stats?: string;
  description?: string;
  progress?: number;
}

const stageLabel: Partial<Record<PipelineStage, string>> = {
  planning: "Planning...",
  discovering: "Discovering...",
  extracting: "Extracting...",
  critiquing: "Analyzing...",
  validating: "Validating...",
  complete: "Complete",
  error: "Error",
};

const progressMap: Record<string, number> = {
  idle: 0,
  planning: 30,
  discovering: 50,
  extracting: 70,
  critiquing: 85,
  validating: 95,
  complete: 100,
  error: 100,
};

const glowColors: Record<string, { ring: string; glow: string; bg: string; text: string }> = {
  brain: {
    ring: "border-cyan/50",
    glow: "shadow-[0_0_40px_rgba(0,240,255,0.35)]",
    bg: "bg-gradient-to-br from-cyan/20 via-cyan/10 to-violet/10",
    text: "text-cyan",
  },
  search: {
    ring: "border-blue-400/50",
    glow: "shadow-[0_0_40px_rgba(56,189,248,0.35)]",
    bg: "bg-gradient-to-br from-blue-400/20 via-cyan/10 to-sky-300/10",
    text: "text-blue-400",
  },
  database: {
    ring: "border-violet/50",
    glow: "shadow-[0_0_40px_rgba(139,92,246,0.35)]",
    bg: "bg-gradient-to-br from-violet/20 via-purple-500/10 to-fuchsia-400/10",
    text: "text-violet",
  },
  shield: {
    ring: "border-amber/50",
    glow: "shadow-[0_0_40px_rgba(245,158,11,0.35)]",
    bg: "bg-gradient-to-br from-amber/20 via-orange-500/10 to-yellow-400/10",
    text: "text-amber",
  },
  check: {
    ring: "border-emerald/50",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.35)]",
    bg: "bg-gradient-to-br from-emerald/20 via-teal-500/10 to-green-400/10",
    text: "text-emerald",
  },
};

function AgentNodeComponent({ data }: { data: AgentNodeData }) {
  const Icon = agentIconMap[data.icon] || agentIconMap.brain;
  const isActive = ["planning", "discovering", "extracting", "critiquing", "validating"].includes(
    data.stage
  );
  const isComplete = data.stage === "complete";
  const isError = data.stage === "error";
  const colors = glowColors[data.icon] || glowColors.brain;
  const progress = data.progress ?? progressMap[data.stage] ?? 0;

  return (
    <div className="flex flex-col items-center gap-3" style={{ minWidth: 180 }}>
      {/* Main spherical orb */}
      <motion.div
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center",
          "border-2 transition-all duration-700",
          isActive && [colors.ring, colors.glow, colors.bg],
          isComplete && "border-emerald/50 shadow-[0_0_30px_rgba(16,185,129,0.25)] bg-gradient-to-br from-emerald/15 to-emerald/5",
          isError && "border-rose/50 shadow-[0_0_30px_rgba(244,63,94,0.25)] bg-gradient-to-br from-rose/15 to-rose/5",
          !isActive && !isComplete && !isError && "border-white/10 bg-white/[0.03]"
        )}
        animate={isActive ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Rotating ring for active state */}
        {isActive && (
          <motion.div
            className="absolute inset-[-4px] rounded-full border border-dashed"
            style={{ borderColor: `var(--accent-${data.icon === "brain" ? "cyan" : data.icon === "search" ? "cyan" : data.icon === "database" ? "violet" : data.icon === "shield" ? "amber" : "emerald"})` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
        )}

        {/* Inner glow sphere */}
        <div className={cn(
          "absolute inset-2 rounded-full transition-all duration-700",
          isActive && "bg-gradient-to-br from-white/10 to-transparent",
          isComplete && "bg-gradient-to-br from-emerald/10 to-transparent"
        )} />

        {/* Icon */}
        <div className={cn(
          "relative z-10 transition-colors duration-500",
          isActive && colors.text,
          isComplete && "text-emerald",
          isError && "text-rose",
          !isActive && !isComplete && !isError && "text-text-secondary"
        )}>
          <Icon className="h-10 w-10" animated={isActive} />
        </div>

        {/* Progress ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="2"
          />
          <circle
            cx="48"
            cy="48"
            r="44"
            fill="none"
            stroke={isComplete ? "#10b981" : isActive ? "#00f0ff" : "transparent"}
            strokeWidth="2"
            strokeDasharray={`${(progress / 100) * 276.46} 276.46`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
      </motion.div>

      {/* Label card below the orb */}
      <div className="text-center max-w-[180px]">
        <h3 className="text-sm font-bold font-heading text-text-primary leading-tight">
          {data.label}
        </h3>
        <p className="text-[11px] text-text-muted mt-0.5 font-mono">
          {data.agent}
        </p>
        {data.description && (
          <p className="text-[10px] text-text-secondary mt-1 leading-relaxed">
            {data.description}
          </p>
        )}
        {/* Stage label */}
        {stageLabel[data.stage] && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "inline-block mt-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full",
              isActive && "bg-cyan/10 text-cyan",
              isComplete && "bg-emerald/10 text-emerald",
              isError && "bg-rose/10 text-rose",
              !isActive && !isComplete && !isError && "bg-white/5 text-text-muted"
            )}
          >
            {stageLabel[data.stage]}
          </motion.span>
        )}
        {/* Stats */}
        {data.stats && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[11px] font-mono text-cyan mt-1 font-medium"
          >
            {data.stats}
          </motion.p>
        )}
      </div>
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
