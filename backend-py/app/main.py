"""
FastAPI server exposing the Planner + Source-Discovery agents.
Mirrors the Node version's routes: /api/workflows/plan and /api/workflows/discover,
plus /api/workflows/run which chains both through the LangGraph graph in one call.
"""
from dotenv import load_dotenv

load_dotenv()  # must run before any agent module reads os.environ for API keys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.agents.planner import plan_workflow
from app.agents.source_discovery import discover_sources
from app.graph import run_workflow
from app.schemas import WorkflowSpec

app = FastAPI(title="DataForge AI — Planning Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PlanRequest(BaseModel):
    prompt: str


class DiscoverRequest(BaseModel):
    spec: WorkflowSpec


@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("startup")
def warm_up_llm():
    """
    The first Groq/LangChain call in a fresh process pays a one-time ~60s
    cold-start cost (unrelated to Groq itself — a lazy init inside
    langchain-core). Absorb that cost here at server startup instead of
    on a real user's first request.
    """
    try:
        plan_workflow("warmup")
        print("LLM warm-up complete.")
    except Exception as err:
        print(f"LLM warm-up failed (non-fatal): {err}")


@app.post("/api/workflows/plan")
def plan(req: PlanRequest):
    try:
        spec = plan_workflow(req.prompt)
        return {"prompt": req.prompt, "spec": spec.model_dump()}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err)) from err


@app.post("/api/workflows/discover")
def discover(req: DiscoverRequest):
    try:
        resolved = discover_sources(req.spec)
        return {"spec": resolved.model_dump()}
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err)) from err


@app.post("/api/workflows/run")
def run(req: PlanRequest):
    """Runs Planner -> Source-Discovery -> Extraction -> Critic -> Validator, then persists the run."""
    result = run_workflow(req.prompt)
    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    task_id = None
    persist_error = None
    try:
        from app.db.persist import persist_workflow_run

        task_id = persist_workflow_run(
            req.prompt,
            result["spec"],
            result["resolved_spec"],
            result["extraction_results"],
            result["validated_result"],
        )
    except Exception as err:  # noqa: BLE001 — a DB hiccup shouldn't break the response
        persist_error = str(err)

    return {
        "prompt": req.prompt,
        "task_id": task_id,
        "persist_error": persist_error,
        "spec": result["spec"].model_dump(),
        "resolved_spec": result["resolved_spec"].model_dump(),
        "extraction_results": [r.model_dump() for r in result["extraction_results"]],
        "validated_result": result["validated_result"].model_dump(),
    }
