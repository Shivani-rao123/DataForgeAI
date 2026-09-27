"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/hooks/use-workflow-state";
import { formatTimestamp } from "@/lib/utils";

const levelColors = {
  info: "text-text-secondary",
  success: "text-emerald",
  warning: "text-amber",
  error: "text-rose",
};

const levelDots = {
  info: "bg-text-secondary",
  success: "bg-emerald",
  warning: "bg-amber",
  error: "bg-rose",
};

const stageIcons: Record<string, string> = {
  planning: "🧠",
  discovering: "🔍",
  extracting: "📊",
  critiquing: "🛡️",
  validating: "✅",
  complete: "🎉",
  error: "❌",
  idle: "⏳",
};

export function LiveLogFeed() {
  const logs = useWorkflowStore((s) => s.logs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border-subtle bg-card-solid/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald/60" />
        </div>
        <span className="text-xs font-mono text-text-muted ml-2">
          pipeline.log
        </span>
      </div>

      {/* Log entries */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5 font-mono text-xs"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-muted text-xs">
            Waiting for pipeline to start...
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex items-start gap-2 py-1",
                  levelColors[log.level]
                )}
              >
                <span className="text-text-muted shrink-0">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span className="shrink-0">{stageIcons[log.stage] || "📌"}</span>
                <span className="flex-1 leading-relaxed">{log.message}</span>
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full mt-1.5 shrink-0",
                    levelDots[log.level]
                  )}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
