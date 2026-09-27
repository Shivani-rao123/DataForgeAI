"use client";

import { cn } from "@/lib/utils";
import type { PipelineStage } from "@/lib/types";

interface StatusDotProps {
  stage: PipelineStage;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const stageColors: Record<PipelineStage, string> = {
  idle: "bg-text-muted",
  planning: "bg-cyan",
  discovering: "bg-cyan",
  extracting: "bg-cyan",
  critiquing: "bg-amber",
  validating: "bg-violet",
  complete: "bg-emerald",
  error: "bg-rose",
};

const sizeClasses = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
};

export function StatusDot({ stage, size = "md", className }: StatusDotProps) {
  const isActive = ["planning", "discovering", "extracting", "critiquing", "validating"].includes(
    stage
  );

  return (
    <span className={cn("relative inline-flex", className)}>
      <span
        className={cn(
          "rounded-full",
          sizeClasses[size],
          stageColors[stage],
          isActive && "dot-pulse"
        )}
      />
      {isActive && (
        <span
          className={cn(
            "absolute inset-0 rounded-full opacity-50",
            sizeClasses[size],
            stageColors[stage],
            "dot-pulse"
          )}
          style={{ animationDelay: "0.5s" }}
        />
      )}
    </span>
  );
}
