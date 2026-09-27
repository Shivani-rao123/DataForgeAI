"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/shared/status-dot";
import type { PipelineStage } from "@/lib/types";
import {
  Brain,
  Search,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  agent: string;
  icon: string;
  stage: PipelineStage;
  stats?: string;
  description?: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  brain: Brain,
  search: Search,
  database: Database,
  shield: ShieldCheck,
  check: CheckCircle2,
  alert: AlertTriangle,
};

function AgentNodeComponent({ data }: { data: AgentNodeData }) {
  const Icon = iconMap[data.icon] || Brain;
  const isActive = ["planning", "discovering", "extracting", "critiquing", "validating"].includes(
    data.stage
  );
  const isComplete = data.stage === "complete";
  const isError = data.stage === "error";

  return (
    <div
      className={cn(
        "relative min-w-[200px] rounded-2xl border p-4 transition-all duration-500",
        "bg-card-solid backdrop-blur-sm",
        isActive && "border-cyan/40 shadow-[0_0_30px_rgba(0,240,255,0.15)]",
        isComplete && "border-emerald/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
        isError && "border-rose/40 shadow-[0_0_20px_rgba(244,63,94,0.1)]",
        !isActive && !isComplete && !isError && "border-border-subtle"
      )}
    >
      {/* Active glow overlay */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan/5 to-violet/5"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Content */}
      <div className="relative flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500",
            isActive && "bg-cyan/10",
            isComplete && "bg-emerald/10",
            isError && "bg-rose/10",
            !isActive && !isComplete && !isError && "bg-elevated"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5 transition-colors duration-500",
              isActive && "text-cyan",
              isComplete && "text-emerald",
              isError && "text-rose",
              !isActive && !isComplete && !isError && "text-text-muted"
            )}
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold font-heading text-text-primary">
              {data.label}
            </h3>
            <StatusDot stage={data.stage} size="sm" />
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">
            {data.description || data.agent}
          </p>
          {data.stats && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-mono text-cyan mt-1"
            >
              {data.stats}
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
