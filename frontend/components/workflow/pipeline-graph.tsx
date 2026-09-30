"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type EdgeProps,
  BaseEdge,
  getBezierPath,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentNode, type AgentNodeData } from "./agent-node";
import { useWorkflowStore } from "@/hooks/use-workflow-state";

const nodeTypes = {
  agent: AgentNode,
};

const stageToNodeStage = (
  pipelineStage: string,
  nodeIndex: number,
  activeIndex: number
): AgentNodeData["stage"] => {
  if (pipelineStage === "error") return "error";
  if (nodeIndex < activeIndex) return "complete";
  if (nodeIndex === activeIndex) return pipelineStage as AgentNodeData["stage"];
  return "idle";
};

/** Custom animated edge with glowing particles */
function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.3,
  });

  const isActive = (data as Record<string, unknown>)?.active === true;
  const isComplete = (data as Record<string, unknown>)?.complete === true;
  const label = (data as Record<string, unknown>)?.label as string | undefined;

  const color = isComplete ? "#10b981" : isActive ? "#00f0ff" : "rgba(100,116,139,0.12)";

  return (
    <>
      {/* Glow behind edge */}
      {(isActive || isComplete) && (
        <BaseEdge
          path={edgePath}
          style={{ stroke: color, strokeWidth: 10, opacity: 0.06, filter: "blur(6px)" }}
        />
      )}
      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: isActive ? 2 : 1.5,
          transition: "stroke 0.5s, stroke-width 0.5s",
          ...(isActive ? { strokeDasharray: "8 4", animation: "flow-line 0.8s linear infinite" } : {}),
        }}
      />
      {/* Flowing particles for active edges */}
      {isActive && (
        <>
          <circle r="4" fill="#00f0ff" opacity="0.8">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="6" fill="#00f0ff" opacity="0.15">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="3" fill="#00f0ff" opacity="0.5">
            <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} begin="0.4s" />
          </circle>
        </>
      )}
      {/* Edge label */}
      {label && (
        <foreignObject x={labelX - 45} y={labelY - 14} width="90" height="28" className="pointer-events-none">
          <div className="edge-label flex items-center justify-center h-full text-[10px]">
            {label}
          </div>
        </foreignObject>
      )}
    </>
  );
}

const edgeTypes = { animated: AnimatedEdge };

export function PipelineGraph() {
 const { stage, activeAgentIndex, spec, resolvedSpec, validatedResult, extractionResults } = useWorkflowStore();

  const agentConfigs = useMemo(
    () => [
      { id: "planner", label: "Planner", agent: "Gemini + Groq", icon: "brain", description: "Decomposes prompt into workflow spec" },
      { id: "discovery", label: "Source Discovery", agent: "Tavily API", icon: "search", description: "Resolves queries to real URLs" },
      { id: "extraction", label: "Extraction", agent: "LLM + Trafilatura", icon: "database", description: "Fetches pages, extracts records" },
      { id: "critic", label: "Critic", agent: "Self-Healing", icon: "shield", description: "Monitors quality, heals failures" },
      { id: "validator", label: "Validator", agent: "RapidFuzz", icon: "check", description: "Validates & deduplicates records" },
    ],
    []
  );

  const nodes: Node<AgentNodeData>[] = useMemo(
    () =>
      agentConfigs.map((config, i) => ({
        id: config.id,
        type: "agent",
        position: { x: i * 300, y: 80 },
        data: {
          ...config,
          stage: stageToNodeStage(stage, i, activeAgentIndex),
          progress: i < activeAgentIndex ? 100 : i === activeAgentIndex ? undefined : 0,
          stats:
            i === 0 && spec
              ? `${spec.sources.length} sources`
              : i === 1 && resolvedSpec
                ? `${resolvedSpec.sources.reduce((a, s) => a + s.resolved.length, 0)} URLs`
                : i === 2 && extractionResults.length > 0
                  ? `${extractionResults.reduce((a, r) => a + r.records.length, 0)} records`
                  : i === 4 && validatedResult
                    ? `${validatedResult.clean_records.length} clean`
                    : undefined,
        },
      })),
    [agentConfigs, stage, activeAgentIndex, spec, resolvedSpec, validatedResult, extractionResults]
  );

  const edgeLabels = useMemo(() => {
    if (!spec) return ["", "", "", ""];
    return [
      `${spec.sources.length} queries`,
      resolvedSpec ? resolvedSpec.sources.reduce((a, s) => a + s.resolved.length, 0) + " URLs" : "URLs",
      extractionResults.length > 0
        ? `${extractionResults.reduce((a, r) => a + r.records.length, 0)} raw`
        : "records",
      validatedResult ? `${validatedResult.clean_records.length} clean` : "validated",
    ];
  }, [spec, resolvedSpec, extractionResults, validatedResult]);

  const edges: Edge[] = useMemo(
    () =>
      agentConfigs.slice(0, -1).map((config, i) => ({
        id: `${config.id}-${agentConfigs[i + 1].id}`,
        source: config.id,
        target: agentConfigs[i + 1].id,
        type: "animated",
        data: { active: i === activeAgentIndex, complete: i < activeAgentIndex, label: edgeLabels[i] },
      })),
    [agentConfigs, activeAgentIndex, edgeLabels]
  );

  return (
    <div className="h-full w-full rounded-2xl border border-border-subtle bg-[#080818] overflow-hidden relative">
      {/* Subtle radial gradient behind the graph */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.03)_0%,transparent_70%)]" />
      <div className="relative h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
        >
          <Background color="rgba(0, 240, 255, 0.03)" gap={50} size={1} />
          <Controls
            position="bottom-left"
            className="!bg-card-solid !border-border-subtle !rounded-lg !shadow-lg"
            showInteractive={false}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
