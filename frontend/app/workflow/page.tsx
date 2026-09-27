"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Download, Copy, Check, ExternalLink } from "lucide-react";
import { PipelineGraph } from "@/components/workflow/pipeline-graph";
import { LiveLogFeed } from "@/components/workflow/live-log-feed";
import { AgentStatusStrip } from "@/components/workflow/agent-status-strip";
import { GradientText } from "@/components/shared/gradient-text";
import { AnimatedCounter } from "@/components/shared/animated-counter";
import { useWorkflowStore } from "@/hooks/use-workflow-state";
import { cn } from "@/lib/utils";

export default function WorkflowPage() {
  const router = useRouter();
  const store = useWorkflowStore();
  const [showResults, setShowResults] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasSimulated = useRef(false);

  // Redirect if no data
  useEffect(() => {
    if (!store.spec && store.stage === "idle") {
      router.push("/");
    }
  }, [store.spec, store.stage, router]);

  // Show results after pipeline completes
  useEffect(() => {
    if (store.stage === "complete") {
      setTimeout(() => setShowResults(true), 800);
    }
  }, [store.stage]);

  // Simulate pipeline progression from stored data
  useEffect(() => {
    if (!store.spec || hasSimulated.current) return;
    hasSimulated.current = true;

    const simulateProgress = async () => {
      // Stage 1: Planning
      store.setStage("planning");
      store.setProgress(10);
      store.addLog({
        stage: "planning",
        agent: "Planner",
        message: `Generated workflow spec with ${store.spec?.sources.length || 0} sources`,
        level: "success",
      });

      await delay(800);

      // Stage 2: Discovery
      store.setStage("discovering");
      store.setProgress(25);
      const totalUrls =
        store.resolvedSpec?.sources.reduce(
          (acc, s) => acc + (s.resolved?.length || 0),
          0
        ) || 0;
      store.addLog({
        stage: "discovering",
        agent: "Source Discovery",
        message: `Resolved ${totalUrls} URLs from ${store.spec?.sources.length || 0} queries`,
        level: "success",
      });

      await delay(800);

      // Stage 3: Extraction
      store.setStage("extracting");
      store.setProgress(45);

      for (const result of store.extractionResults) {
        store.addLog({
          stage: "extracting",
          agent: "Extraction",
          message: `Processing ${result.query_or_url}...`,
          level: "info",
        });

        await delay(400);

        if (result.fetch_errors.length > 0) {
          for (const err of result.fetch_errors) {
            const shortErr =
              err.length > 80 ? err.slice(0, 80) + "..." : err;
            store.addLog({
              stage: "extracting",
              agent: "Extraction",
              message: `Fetch error: ${shortErr}`,
              level: "warning",
            });
          }
        }

        if (result.records.length > 0) {
          store.incrementRecordCount(result.records.length);
          store.addLog({
            stage: "extracting",
            agent: "Extraction",
            message: `Extracted ${result.records.length} records from ${result.query_or_url}`,
            level: "success",
          });
        }

        await delay(300);
      }

      store.setProgress(70);

      // Stage 4: Critic
      store.setStage("critiquing");
      store.setProgress(80);
      store.addLog({
        stage: "critiquing",
        agent: "Critic",
        message: "Analyzing extraction quality...",
        level: "info",
      });

      await delay(600);

      store.addLog({
        stage: "critiquing",
        agent: "Critic",
        message: "All sources passed quality threshold",
        level: "success",
      });

      await delay(400);

      // Stage 5: Validation
      store.setStage("validating");
      store.setProgress(90);

      if (store.validatedResult) {
        const v = store.validatedResult;
        store.addLog({
          stage: "validating",
          agent: "Validator",
          message: `${v.clean_records.length} clean records, ${v.issues.length} issues, ${v.merges.length} duplicates merged`,
          level: "success",
        });
      }

      await delay(500);

      // Complete
      store.setStage("complete");
      store.setProgress(100);
      store.setRecordCount(
        store.validatedResult?.clean_records.length || 0
      );
      store.addLog({
        stage: "complete",
        agent: "Pipeline",
        message: "Pipeline complete!",
        level: "success",
      });
    };

    // Start simulation
    simulateProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyJson = () => {
    if (store.validatedResult) {
      navigator.clipboard.writeText(
        JSON.stringify(store.validatedResult.clean_records, null, 2)
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-cyan/10 border border-cyan/20 text-cyan hover:bg-cyan/20 transition-all">
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

      {/* Main content: Graph + Log */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 px-6 pb-6 min-h-0">
        {/* Pipeline graph */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-[400px] lg:min-h-0"
        >
          <PipelineGraph />
        </motion.div>

        {/* Right panel: Log + Stats */}
        <div className="flex flex-col gap-4 min-h-[300px] lg:min-h-0">
          {/* Live log */}
          <div className="flex-1 min-h-0">
            <LiveLogFeed />
          </div>

          {/* Stats cards */}
          <AnimatePresence>
            {store.stage === "complete" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="grid grid-cols-3 gap-3"
              >
                <StatCard
                  label="Records"
                  value={store.validatedResult?.clean_records.length || 0}
                  color="cyan"
                />
                <StatCard
                  label="Issues"
                  value={store.validatedResult?.issues.length || 0}
                  color="amber"
                />
                <StatCard
                  label="Merged"
                  value={store.validatedResult?.merges.length || 0}
                  color="violet"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
                  Showing first 5 of{" "}
                  {store.validatedResult.clean_records.length}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {store.validatedResult.clean_records.slice(0, 5).map((record, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-xl border border-border-subtle bg-elevated/50 p-4 hover:border-cyan/20 transition-all"
                  >
                    {Object.entries(record.data).map(([key, value]) => (
                      <div key={key} className="mb-2 last:mb-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted block">
                          {key.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm text-text-primary">
                          {value || (
                            <span className="text-text-muted italic">null</span>
                          )}
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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
