import type { PlanResponse, RunResponse, WorkflowSpec, TaskSummary, TaskDetail } from "./types";

// ---------------------------------------------------------------------------
// Backend API base URL
// ---------------------------------------------------------------------------
// Set NEXT_PUBLIC_API_URL in .env.local (development) or your hosting platform
// (Vercel, Netlify, etc.) for production.
//
//   Development:  http://127.0.0.1:8000/api   (set in .env.local)
//   Production:   https://api.yourdomain.com/api  (set in hosting env)
//
// The 127.0.0.1 fallback is intentional for local dev convenience only.
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

// In production, fail loudly if the env var is missing.
if (
  !process.env.NEXT_PUBLIC_API_URL &&
  process.env.NODE_ENV === "production"
) {
  console.error(
    "[DataForge] FATAL: NEXT_PUBLIC_API_URL must be set in production."
  );
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function planWorkflow(prompt: string): Promise<PlanResponse> {
  const res = await fetch(`${API_BASE}/workflows/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Plan failed: ${res.statusText}`);
  return res.json();
}

export async function discoverSources(
  spec: WorkflowSpec
): Promise<{ spec: WorkflowSpec }> {
  const res = await fetch(`${API_BASE}/workflows/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spec }),
  });
  if (!res.ok) throw new Error(`Discover failed: ${res.statusText}`);
  return res.json();
}

export async function runWorkflow(prompt: string): Promise<RunResponse> {
  const res = await fetch(`${API_BASE}/workflows/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`Run failed: ${res.statusText}`);
  return res.json();
}

/**
 * Connect to SSE stream for real-time pipeline progress.
 *
 * Uses the browser-native EventSource API for reliable SSE handling.
 * Registers a listener for every known pipeline event and dispatches
 * them to the caller.
 *
 * Returns a teardown function that closes the connection.
 */
export function connectPipelineStream(
  prompt: string,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const url = `${API_BASE}/workflows/run/stream?prompt=${encodeURIComponent(prompt)}`;
  const es = new EventSource(url);

  const knownEvents = [
    "planner:start", "planner:done",
    "discovery:start", "discovery:done",
    "extraction:start", "extraction:done",
    "critic:start", "critic:done",
    "validator:start", "validator:done",
    "pipeline:complete", "pipeline:error",
  ];

  for (const eventName of knownEvents) {
    es.addEventListener(eventName, ((e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(eventName, data);
        if (eventName === "pipeline:complete") {
          onComplete();
          es.close();
        }
        if (eventName === "pipeline:error") {
          onError(new Error(data.error || "Pipeline error"));
          es.close();
        }
      } catch {
        // skip malformed JSON
      }
    }) as EventListener);
  }

  es.onerror = () => {
    // EventSource auto-retries; only error on closed connections
    if (es.readyState === EventSource.CLOSED) {
      onError(new Error("SSE connection closed"));
      es.close();
    }
  };

  return () => es.close();
}

export async function listTasks(): Promise<TaskSummary[]> {
  const res = await fetch(`${API_BASE}/tasks`);
  if (!res.ok) throw new Error(`Failed to list tasks: ${res.status}`);
  const data = await res.json();
  return data.tasks as TaskSummary[];
}

export async function getTask(taskId: string): Promise<TaskDetail> {
  const res = await fetch(`${API_BASE}/tasks/${taskId}`);
  if (!res.ok) throw new Error(`Failed to load task: ${res.status}`);
  return (await res.json()) as TaskDetail;
}