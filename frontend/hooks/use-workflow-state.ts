import { create } from "zustand";
import type {
  PipelineStage,
  WorkflowSpec,
  ResolvedWorkflowSpec,
  SourceExtractionResult,
  ValidatedResult,
  LogEntry,
} from "@/lib/types";

interface WorkflowState {
  /* ── Pipeline stage ── */
  stage: PipelineStage;
  progress: number;
  taskId: string | null;
  error: string | null;

  /* ── Pipeline data ── */
  prompt: string;
  spec: WorkflowSpec | null;
  resolvedSpec: ResolvedWorkflowSpec | null;
  extractionResults: SourceExtractionResult[];
  validatedResult: ValidatedResult | null;

  /* ── Live monitoring ── */
  logs: LogEntry[];
  recordCount: number;
  sourceCount: number;
  resolvedUrlCount: number;
  activeAgentIndex: number;

  /* ── Actions ── */
  setPrompt: (prompt: string) => void;
  setStage: (stage: PipelineStage) => void;
  setProgress: (progress: number) => void;
  setTaskId: (id: string) => void;
  setSpec: (spec: WorkflowSpec) => void;
  setResolvedSpec: (spec: ResolvedWorkflowSpec) => void;
  setExtractionResults: (results: SourceExtractionResult[]) => void;
  setValidatedResult: (result: ValidatedResult) => void;
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void;
  setRecordCount: (count: number) => void;
  incrementRecordCount: (by: number) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState = {
  stage: "idle" as PipelineStage,
  progress: 0,
  taskId: null,
  error: null,
  prompt: "",
  spec: null,
  resolvedSpec: null,
  extractionResults: [],
  validatedResult: null,
  logs: [],
  recordCount: 0,
  sourceCount: 0,
  resolvedUrlCount: 0,
  activeAgentIndex: -1,
};

export const useWorkflowStore = create<WorkflowState>((set) => ({
  ...initialState,

  setPrompt: (prompt) => set({ prompt }),

  setStage: (stage) =>
    set({
      stage,
      activeAgentIndex: ["planning", "discovering", "extracting", "critiquing", "validating"].indexOf(
        stage
      ),
    }),

  setProgress: (progress) => set({ progress }),
  setTaskId: (taskId) => set({ taskId }),
  setSpec: (spec) => set({ spec }),
  setResolvedSpec: (resolvedSpec) => set({ resolvedSpec }),
  setExtractionResults: (extractionResults) => set({ extractionResults }),
  setValidatedResult: (validatedResult) => set({ validatedResult }),

  addLog: (log) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          ...log,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date(),
        },
      ],
    })),

  setRecordCount: (recordCount) => set({ recordCount }),
  incrementRecordCount: (by) =>
    set((state) => ({ recordCount: state.recordCount + by })),
  setError: (error) => set({ error, stage: "error" }),

  reset: () => set(initialState),
}));
