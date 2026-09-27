import type { PlanResponse, RunResponse, WorkflowSpec } from "./types";

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
 * Connect to SSE stream for real-time pipeline updates.
 * Falls back to simulated events if backend doesn't support SSE yet.
 */
export function connectPipelineStream(
  taskId: string,
  onEvent: (event: string, data: Record<string, unknown>) => void,
  onComplete: () => void,
  onError: (error: Error) => void
): () => void {
  const controller = new AbortController();

  fetch(`${API_BASE}/workflows/run/${taskId}/stream`, {
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        throw new Error("SSE not available");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(currentEvent, data);
              if (currentEvent === "pipeline:complete") {
                onComplete();
              }
            } catch {
              // skip malformed data
            }
          }
        }
      }
      onComplete();
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err);
      }
    });

  return () => controller.abort();
}
