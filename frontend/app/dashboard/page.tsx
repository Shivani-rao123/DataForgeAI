"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, PlusCircle, ArrowRight, Loader2 } from "lucide-react";
import { listTasks } from "@/lib/api";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import type { TaskSummary } from "@/lib/types";

function statusColor(status: string) {
  if (status === "done") return "text-emerald border-emerald/30 bg-emerald/10";
  if (status === "failed") return "text-rose border-rose/30 bg-rose/10";
  return "text-amber border-amber/30 bg-amber/10";
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      listTasks()
        .then(setTasks)
        .catch((err) => setError(err.message || "Failed to load runs"));
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  const total = tasks?.length ?? 0;
  const done = tasks?.filter((t) => t.status === "done").length ?? 0;
  const totalRecords = tasks?.reduce((a, t) => a + t.record_count, 0) ?? 0;
  const avg = total ? Math.round(totalRecords / total) : 0;
  const successRate = total ? Math.round((done / total) * 100) : 0;

  const stats = [
    { label: "Total runs", value: total, suffix: "" },
    { label: "Records collected", value: totalRecords, suffix: "" },
    { label: "Success rate", value: successRate, suffix: "%" },
    { label: "Avg records / run", value: avg, suffix: "" },
  ];

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-cyan" />
          <h1 className="font-heading text-xl font-semibold text-text-primary">Dashboard</h1>
        </div>
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 rounded-lg border border-border-glow bg-card-solid px-3 py-2 text-sm text-cyan hover:bg-elevated transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          New Task
        </button>
      </div>

      {error && (
        <div className="text-sm text-rose bg-rose/10 border border-rose/20 rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {!tasks && !error && (
        <div className="flex items-center gap-2 text-text-muted text-sm py-12 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading runs...
        </div>
      )}

      {tasks && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-border-subtle bg-elevated/50 p-4">
                <div className="flex items-baseline gap-0.5 text-2xl font-bold text-cyan">
                  <AnimatedCounter value={s.value} />
                  {s.suffix}
                </div>
                <p className="text-[10px] font-mono text-text-muted mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Recent runs
            </h2>
            <button onClick={() => router.push("/history")} className="text-xs text-cyan hover:underline">
              View all
            </button>
          </div>

          {tasks.length === 0 && (
            <div className="text-center text-text-muted text-sm py-16 border border-dashed border-border-subtle rounded-xl">
              No runs yet. Start one with New Task.
            </div>
          )}

          <div className="flex flex-col gap-2">
            {tasks.slice(0, 6).map((task) => (
              <button
                key={task.task_id}
                onClick={() => router.push(`/workflow?task_id=${task.task_id}`)}
                className="text-left flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-card border border-border-subtle hover:border-cyan/30 transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary truncate">{task.prompt}</p>
                  <p className="text-xs text-text-muted font-mono mt-1">{formatDate(task.created_at)}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-text-secondary">
                    {task.record_count} {task.record_count === 1 ? "record" : "records"}
                  </span>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border ${statusColor(task.status)}`}>
                    {task.status}
                  </span>
                  <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-cyan transition-colors" />
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}