"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/hooks/use-workflow-state";
import { StatusDot } from "@/components/shared/status-dot";
import {
  Brain,
  Search,
  Database,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import type { PipelineStage } from "@/lib/types";

const agents = [
  { id: "planner", label: "Planner", icon: Brain, stageKey: "planning" },
  { id: "discovery", label: "Discovery", icon: Search, stageKey: "discovering" },
  { id: "extraction", label: "Extraction", icon: Database, stageKey: "extracting" },
  { id: "critic", label: "Critic", icon: ShieldCheck, stageKey: "critiquing" },
  { id: "validator", label: "Validator", icon: CheckCircle2, stageKey: "validating" },
];

function getAgentStage(
  agentIndex: number,
  pipelineStage: PipelineStage,
  activeIndex: number
): PipelineStage {
  if (pipelineStage === "error") return "error";
  if (pipelineStage === "complete") return "complete";
  if (agentIndex < activeIndex) return "complete";
  if (agentIndex === activeIndex) return pipelineStage;
  return "idle";
}

export function AgentStatusStrip() {
  const { stage, activeAgentIndex, recordCount } = useWorkflowStore();

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border-subtle bg-card-solid/50">
      {agents.map((agent, i) => {
        const agentStage = getAgentStage(i, stage, activeAgentIndex);
        const isActive = agentStage === stage && stage !== "idle" && stage !== "complete" && stage !== "error";
        const isComplete = agentStage === "complete";
        const Icon = agent.icon;

        return (
          <div key={agent.id} className="flex items-center gap-3">
            <motion.div
              initial={false}
              animate={{
                scale: isActive ? 1.05 : 1,
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300",
                isActive && "bg-cyan/10 border border-cyan/20",
                isComplete && "bg-emerald/5 border border-emerald/10",
                agentStage === "idle" && "border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 transition-colors duration-300",
                  isActive && "text-cyan",
                  isComplete && "text-emerald",
                  agentStage === "error" && "text-rose",
                  agentStage === "idle" && "text-text-muted"
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  isActive && "text-cyan",
                  isComplete && "text-emerald",
                  agentStage === "idle" && "text-text-muted"
                )}
              >
                {agent.label}
              </span>
              <StatusDot stage={agentStage} size="sm" />
            </motion.div>

            {/* Connector line */}
            {i < agents.length - 1 && (
              <div
                className={cn(
                  "w-6 h-px transition-colors duration-500",
                  i < activeAgentIndex
                    ? "bg-emerald/40"
                    : i === activeAgentIndex
                      ? "bg-cyan/40"
                      : "bg-border-subtle"
                )}
              />
            )}
          </div>
        );
      })}

      {/* Record counter */}
      {recordCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-elevated border border-border-subtle"
        >
          <span className="text-xs text-text-muted">Records</span>
          <span className="text-sm font-mono font-bold text-cyan">
            {recordCount}
          </span>
        </motion.div>
      )}
    </div>
  );
}
