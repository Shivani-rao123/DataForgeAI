"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
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
): "idle" | "planning" | "discovering" | "extracting" | "critiquing" | "validating" | "complete" | "error" => {
  if (pipelineStage === "error") return "error";
  if (nodeIndex < activeIndex) return "complete";
  if (nodeIndex === activeIndex) return pipelineStage as any;
  return "idle";
};

export function PipelineGraph() {
  const { stage, activeAgentIndex, spec, validatedResult } = useWorkflowStore();

  const agentConfigs = useMemo(
    () => [
      {
        id: "planner",
        label: "Planner",
        agent: "Groq LLM",
        icon: "brain",
        description: "Decomposes prompt into workflow spec",
      },
      {
        id: "discovery",
        label: "Source Discovery",
        agent: "Tavily API",
        icon: "search",
        description: "Resolves queries to real URLs",
      },
      {
        id: "extraction",
        label: "Extraction",
        agent: "LLM + Trafilatura",
        icon: "database",
        description: "Fetches pages, extracts records",
      },
      {
        id: "critic",
        label: "Critic",
        agent: "Self-Healing",
        icon: "shield",
        description: "Monitors quality, heals failures",
      },
      {
        id: "validator",
        label: "Validator",
        agent: "RapidFuzz",
        icon: "check",
        description: "Validates & deduplicates records",
      },
    ],
    []
  );

  const nodes: Node<AgentNodeData>[] = useMemo(
    () =>
      agentConfigs.map((config, i) => ({
        id: config.id,
        type: "agent",
        position: { x: i * 260, y: 50 },
        data: {
          ...config,
          stage: stageToNodeStage(stage, i, activeAgentIndex),
          stats:
            i === 4 && validatedResult
              ? `${validatedResult.clean_records.length} clean records`
              : i === 0 && spec
                ? `${spec.sources.length} sources`
                : undefined,
        },
      })),
    [agentConfigs, stage, activeAgentIndex, spec, validatedResult]
  );

  const edges: Edge[] = useMemo(
    () =>
      agentConfigs.slice(0, -1).map((config, i) => {
        const nextConfig = agentConfigs[i + 1];
        const isComplete = i < activeAgentIndex;
        const isActive = i === activeAgentIndex;

        return {
          id: `${config.id}-${nextConfig.id}`,
          source: config.id,
          target: nextConfig.id,
          type: "smoothstep",
          animated: isActive,
          style: {
            stroke: isComplete
              ? "#10b981"
              : isActive
                ? "#00f0ff"
                : "rgba(100, 116, 139, 0.2)",
            strokeWidth: isActive ? 2 : 1,
          },
        };
      }),
    [agentConfigs, activeAgentIndex]
  );

  return (
    <div className="h-full w-full rounded-2xl border border-border-subtle bg-card-solid/50 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { strokeWidth: 1 },
        }}
      >
        <Background color="rgba(100,116,139,0.08)" gap={24} size={1} />
        <Controls
          position="bottom-left"
          className="!bg-card-solid !border-border-subtle !rounded-lg !shadow-lg"
        />
        <MiniMap
          position="bottom-right"
          nodeColor={(node) => {
            const s = node.data?.stage;
            if (s === "complete") return "#10b981";
            if (s === "error") return "#f43f5e";
            if (["planning", "discovering", "extracting", "critiquing", "validating"].includes(s as string))
              return "#00f0ff";
            return "#1e293b";
          }}
          maskColor="rgba(5, 5, 16, 0.8)"
          className="!bg-elevated !border-border-subtle !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
