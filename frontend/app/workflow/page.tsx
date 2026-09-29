"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Copy, Check, ExternalLink, Terminal } from "lucide-react";
import { recordsToCsv, downloadCsv } from "@/lib/csv";
import { PipelineGraph } from "@/components/workflow/pipeline-graph";
import { LiveLogFeed } from "@/components/workflow/live-log-feed";
import { AgentStatusStrip } from "@/components/workflow/agent-status-strip";
import { GradientText } from "@/components/shared/gradient-text";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useWorkflowStore } from "@/hooks/use-workflow-state";
import { connectPipelineStream } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { WorkflowSpec, ResolvedWorkflowSpec, SourceExtractionResult, ValidatedResult } from "@/lib/types";

export default function WorkflowPage() {
  return (
    <Suspense>
      <WorkflowPageInner />
    </Suspense>
  );
}

function WorkflowPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prompt = searchParams.get("prompt") || "";
  const store = useWorkflowStore();
  const [showResults, setShowResults] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);

  // Redirect if no prompt in URL
  useEffect(() => {
    if (!prompt) {
      router.push("/");
    }
  }, [prompt, router]);

  // Show results after pipeline completes
  useEffect(() => {
    if (store.stage === "complete") {
      setTimeout(() => setShowResults(true), 800);
    }
  }, [store.stage]);

  // SSE event handler — uses getState() to avoid stale closure issues
  const handleEvent = useCallback(
    (event: string, data: Record<string, unknown>) => {
      const s = useWorkflowStore.getState();
      switch (event) {
        case "planner:start":
          s.setStage("planning");
          s.setProgress(10);
          s.addLog({ stage: "planning", agent: "Planner", message: "Generating workflow spec...", level: "info" });
          break;
        case "planner:done": {
          const spec = data.spec as WorkflowSpec;
          s.setSpec(spec);
          s.addLog({ stage: "planning", agent: "Planner", message: `Generated workflow spec with ${spec.sources.length} sources`, level: "success" });
          break;
        }
        case "discovery:start":
          s.setStage("discovering");
          s.setProgress(25);
          s.addLog({ stage: "discovering", agent: "Source Discovery", message: `Resolving ${(data.source_count as number) || 0} sources...`, level: "info" });
          break;
        case "discovery:done": {
          const resolvedSpec = data.resolved_spec as ResolvedWorkflowSpec;
          s.setResolvedSpec(resolvedSpec);
          const totalUrls = resolvedSpec.sources.reduce((acc: number, src: { resolved?: unknown[] }) => acc + (src.resolved?.length || 0), 0);
          s.addLog({ stage: "discovering", agent: "Source Discovery", message: `Resolved ${totalUrls} URLs from ${resolvedSpec.sources.length} queries`, level: "success" });
          break;
        }
        case "extraction:start":
          s.setStage("extracting");
          s.setProgress(45);
          s.addLog({ stage: "extracting", agent: "Extraction", message: `Processing ${(data.source_count as number) || 0} sources...`, level: "info" });
          break;
        case "extraction:done": {
          const results = data.extraction_results as SourceExtractionResult[];
          s.setExtractionResults(results);
          s.setRecordCount((data.total_records as number) || 0);
          for (const r of results) {
            if (r.fetch_errors.length > 0) {
              for (const err of r.fetch_errors) {
                s.addLog({ stage: "extracting", agent: "Extraction", message: `Fetch error: ${err.length > 80 ? err.slice(0, 80) + "..." : err}`, level: "warning" });
              }
            }
            if (r.records.length > 0) {
              s.addLog({ stage: "extracting", agent: "Extraction", message: `Extracted ${r.records.length} records from ${r.query_or_url}`, level: "success" });
            }
          }
          break;
        }
        case "critic:start":
          s.setStage("critiquing");
          s.setProgress(70);
          s.addLog({ stage: "critiquing", agent: "Critic", message: "Analyzing extraction quality...", level: "info" });
          break;
        case "critic:done":
          s.addLog({ stage: "critiquing", agent: "Critic", message: "Quality check passed", level: "success" });
          break;
        case "validator:start":
          s.setStage("validating");
          s.setProgress(85);
          s.addLog({ stage: "validating", agent: "Validator", message: "Validating and deduplicating records...", level: "info" });
          break;
        case "validator:done": {
          const validated = data.validated_result as ValidatedResult;
          s.setValidatedResult(validated);
          s.setRecordCount(validated.clean_records.length);
          s.addLog({ stage: "validating", agent: "Validator", message: `${validated.clean_records.length} clean records, ${validated.issues.length} issues, ${validated.merges.length} duplicates merged`, level: "success" });
          break;
        }
        case "pipeline:complete":
          s.setStage("complete");
          s.setProgress(100);
          s.addLog({ stage: "complete", agent: "Pipeline", message: "Pipeline complete!", level: "success" });
          break;
        case "pipeline:error":
          s.setError(data.error as string);
          s.addLog({ stage: "error", agent: "Pipeline", message: (data.error as string) || "Unknown error", level: "error" });
          break;
      }
    },
    []
  );

  const handleError = useCallback((err: Error) => {
    const s = useWorkflowStore.getState();
    s.setError(err.message);
    s.addLog({ stage: "error", agent: "Pipeline", message: err.message, level: "error" });
  }, []);

  // Connect to SSE stream on mount
  useEffect(() => {
    if (!prompt) return;

    useWorkflowStore.getState().setPrompt(prompt);
    // Delay so React StrictMode's dev-only mount/unmount/mount only opens one connection.
    const t = setTimeout(() => {
      abortRef.current = connectPipelineStream(prompt, handleEvent, () => {}, handleError);
    }, 0);

    return () => { clearTimeout(t); abortRef.current?.(); };
  }, [prompt, handleEvent, handleError]);

  
  const handleCopyJson = () => {
    if (store.validatedResult) {
      navigator.clipboard.writeText(
        JSON.stringify(store.validatedResult.clean_records, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportCsv = () => {
    if (store.validatedResult) {
      const csv = recordsToCsv(store.validatedResult.clean_records);
      downloadCsv(csv, `dataforge-export-${Date.now()}.csv`);
    }
  };


  return (
    <main className="min-h-screen bg-void flex flex-col">
      {/* Top bar */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-void/80 backdrop-blur-xl sticky top-0 z-50"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-text-secondary hover:text-cyan transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            New Query
          </button>
          <div className="h-4 w-px bg-border-subtle" />
          <h1 className="text-sm font-heading font-semibold">
            <GradientText>DataForge</GradientText>{" "}
            <span className="text-text-primary">Pipeline</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {store.stage === "complete" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3"
            >
              <button
                onClick={handleCopyJson}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-elevated border border-border-subtle hover:border-cyan/30 transition-all"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied!" : "Copy JSON"}
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan/10 border border-cyan/20 text-cyan hover:bg-cyan/20 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Agent status strip */}
      <div className="px-6 py-3">
        <AgentStatusStrip />
      </div>

      {/* Main content: Graph */}
      <div className="flex flex-col gap-4 px-6 pb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="h-[420px]"
        >
          <PipelineGraph />
        </motion.div>

        <AnimatePresence>
          {store.stage === "complete" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="grid grid-cols-3 gap-3 max-w-md"
            >
              <StatCard label="Records" value={store.validatedResult?.clean_records.length || 0} color="cyan" />
              <StatCard label="Issues" value={store.validatedResult?.issues.length || 0} color="amber" />
              <StatCard label="Merged" value={store.validatedResult?.merges.length || 0} color="violet" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Results preview overlay */}
      <AnimatePresence>
        {showResults && store.validatedResult && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="px-6 pb-8"
          >
            <div className="rounded-2xl border border-border-subtle bg-card-solid/80 backdrop-blur-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold">
                  <GradientText>Extracted Records</GradientText>
                </h2>
                <span className="text-xs font-mono text-text-muted">
                  Showing all{" "}
                  {store.validatedResult.clean_records.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {store.validatedResult.clean_records.map((record, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 10) * 0.05 }}
                    className="rounded-xl border border-border-subtle bg-elevated/50 p-4 hover:border-cyan/20 transition-all"
                  >
                    {Object.entries(record.data)
                      .filter(([, value]) => value)
                      .map(([key, value]) => (
                        <div key={key} className="mb-2 last:mb-0">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                            {key.replace(/_/g, " ")}
                          </span>
                          <span className="text-sm text-text-primary line-clamp-4">
                            {value}
                          </span>
                        </div>
                      ))}
                    {record.citation_url && (
                      <a
                        href={record.citation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-cyan/60 hover:text-cyan transition-colors"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Source
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Log popup */}
      <button
        onClick={() => setShowLogs((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-mono bg-elevated border border-border-subtle hover:border-cyan/30 transition-all"
      >
        <Terminal className="h-3.5 w-3.5" />
        Logs ({store.logs.length})
      </button>
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 right-4 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[420px]"
          >
            <LiveLogFeed />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "cyan" | "amber" | "violet";
}) {
  const colors = {
    cyan: "border-cyan/20 text-cyan",
    amber: "border-amber/20 text-amber",
    violet: "border-violet/20 text-violet",
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-elevated/50 p-3 text-center",
        colors[color].split(" ")[0]
      )}
    >
      <AnimatedCounter
        value={value}
        className={cn("text-xl font-bold", colors[color].split(" ")[1])}
      />
      <p className="text-[10px] font-mono text-text-muted mt-1 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}
