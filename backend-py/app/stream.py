"""
SSE streaming endpoint for real-time pipeline progress.
Mounts as a router in main.py.
"""
import json
import asyncio
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.planner import plan_workflow
from app.agents.source_discovery import discover_sources
from app.graph import extract_all, critic_node, validator_node
from app.schemas import WorkflowSpec

router = APIRouter()

# In-memory store for task results (for SSE replay)
_task_results: dict = {}


def _sse_event(event: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _run_pipeline_stream(prompt: str):
    """Run the full pipeline and yield SSE events at each stage."""
    task_id = str(uuid.uuid4())

    # --- Stage 1: Planner ---
    yield _sse_event("planner:start", {"timestamp": _now()})
    try:
        spec = plan_workflow(prompt)
        yield _sse_event("planner:done", {
            "spec": spec.model_dump(),
            "source_count": len(spec.sources),
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Planner failed: {err}"})
        return

    # --- Stage 2: Source Discovery ---
    yield _sse_event("discovery:start", {"source_count": len(spec.sources)})
    try:
        resolved_spec = discover_sources(spec)
        total_urls = sum(len(s.resolved) for s in resolved_spec.sources)
        yield _sse_event("discovery:done", {
            "resolved_count": total_urls,
            "sources": [
                {"query": s.query_or_url, "url_count": len(s.resolved)}
                for s in resolved_spec.sources
            ],
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Discovery failed: {err}"})
        return

    # --- Stage 3: Extraction ---
    yield _sse_event("extraction:start", {"source_count": len(resolved_spec.sources)})
    try:
        extraction_results = extract_all(resolved_spec, spec.fields)
        total_records = sum(len(r.records) for r in extraction_results)
        yield _sse_event("extraction:done", {
            "total_records": total_records,
            "source_results": [
                {
                    "query": r.query_or_url,
                    "record_count": len(r.records),
                    "error_count": len(r.fetch_errors),
                }
                for r in extraction_results
            ],
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Extraction failed: {err}"})
        return

    # --- Stage 4: Critic ---
    yield _sse_event("critic:start", {})
    try:
        healed_results = critic_node(resolved_spec, extraction_results)
        yield _sse_event("critic:done", {"healed": True})
    except Exception as err:
        healed_results = extraction_results
        yield _sse_event("critic:done", {"healed": False, "error": str(err)})

    # --- Stage 5: Validator ---
    yield _sse_event("validator:start", {})
    try:
        validated = validator_node(healed_results, spec.validation_rules)
        yield _sse_event("validator:done", {
            "clean_records": len(validated.clean_records),
            "issues": len(validated.issues),
            "merges": len(validated.merges),
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Validator failed: {err}"})
        return

    # --- Complete ---
    yield _sse_event("pipeline:complete", {
        "task_id": task_id,
        "total_records": len(validated.clean_records),
    })

    # Store result for potential replay
    _task_results[task_id] = {
        "prompt": prompt,
        "spec": spec.model_dump(),
        "resolved_spec": resolved_spec.model_dump(),
        "extraction_results": [r.model_dump() for r in extraction_results],
        "validated_result": validated.model_dump(),
    }


def _now():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


@router.get("/api/workflows/run/stream")
async def stream_workflow(prompt: str):
    """SSE endpoint: streams pipeline progress events as they happen."""
    return StreamingResponse(
        _run_pipeline_stream(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/api/workflows/result/{task_id}")
async def get_result(task_id: str):
    """Retrieve a completed pipeline result by task_id."""
    if task_id not in _task_results:
        raise HTTPException(status_code=404, detail="Task not found")
    return _task_results[task_id]
