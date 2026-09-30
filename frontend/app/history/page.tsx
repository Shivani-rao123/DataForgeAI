"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History as HistoryIcon, ArrowRight, Loader2 } from "lucide-react";
import { listTasks } from "@/lib/api";
import type { TaskSummary } from "@/lib/types";

function statusColor(status: string) {
  if (status === "done") return "text-emerald border-emerald/30 bg-emerald/10";
  if (status === "failed") return "text-rose border-rose/30 bg-rose/10";
  return "text-amber border-amber/30 bg-amber/10";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTasks()
      .then(setTasks)
      .catch((err) => setError(err.message || "Failed to load history"));
  }, []);

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <HistoryIcon className="h-5 w-5 text-cyan" />
        <h1 className="font-heading text-xl font-semibold text-text-primary">
          Workflow History
        </h1>
      </div>

      {error && (
        <div className="text-sm text-rose bg-rose/10 border border-rose/20 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {!tasks && !error && (
        <div className="flex items-center gap-2 text-text-muted text-sm py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading past runs...
        </div>
      )}

      {tasks && tasks.length === 0 && (
        <div className="text-center text-text-muted text-sm py-16 border border-dashed border-border-subtle rounded-xl">
          No workflows yet. Run one from{" "}
          <button
            onClick={() => router.push("/")}
            className="text-cyan hover:underline"
          >
            New Task
          </button>
          .
        </div>
      )}

      <div className="flex flex-col gap-2">
        {tasks?.map((task) => (
          <button
            key={task.task_id}
            onClick={() => router.push(`/workflow?task_id=${task.task_id}`)}
            className="text-left flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-card border border-border-subtle hover:border-cyan/30 transition-colors group"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text-primary truncate">{task.prompt}</p>
              <p className="text-xs text-text-muted font-mono mt-1">
                {formatDate(task.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-mono text-text-secondary">
                {task.record_count} {task.record_count === 1 ? "record" : "records"}
              </span>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border ${statusColor(task.status)}`}
              >
                {task.status}
              </span>
              <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-cyan transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}