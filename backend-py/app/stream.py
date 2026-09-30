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
from app.agents.extraction import extract_all
from app.agents.critic import check_health, heal_and_retry
from app.agents.validator import validate_and_dedupe
from app.schemas import WorkflowSpec, SourceExtractionResult

router = APIRouter()

# In-memory store for task results (for SSE replay)
_task_results: dict = {}


def _sse_event(event: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def _run_pipeline_stream(prompt: str):
    """Run the full pipeline and yield SSE events at each stage.

    Each ``done`` event carries the full data payload so the frontend can
    populate its state incrementally — no second request needed.
    """
    task_id = str(uuid.uuid4())

    # --- Stage 1: Planner ---
    yield _sse_event("planner:start", {"timestamp": _now()})
    try:
        spec = plan_workflow(prompt)
        yield _sse_event("planner:done", {
            "spec": spec.model_dump(),
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Planner failed: {err}"})
        return

    # --- Stage 2: Source Discovery ---
    yield _sse_event("discovery:start", {"source_count": len(spec.sources)})
    try:
        resolved_spec = discover_sources(spec)
        yield _sse_event("discovery:done", {
            "resolved_spec": resolved_spec.model_dump(),
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Discovery failed: {err}"})
        return

    # --- Stage 3: Extraction ---
    yield _sse_event("extraction:start", {"source_count": len(resolved_spec.sources)})
    try:
        extraction_results = extract_all(resolved_spec)
        total_records = sum(len(r.records) for r in extraction_results)
        yield _sse_event("extraction:done", {
            "extraction_results": [r.model_dump() for r in extraction_results],
            "total_records": total_records,
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Extraction failed: {err}"})
        return

    # --- Stage 4: Critic ---
    yield _sse_event("critic:start", {})
    healed_results: list[SourceExtractionResult] = []
    try:
        fields = spec.fields
        resolved_sources = resolved_spec.sources
        for result, resolved_source in zip(extraction_results, resolved_sources):
            report = check_health(result, fields)
            if not report.needs_healing or not resolved_source.resolved:
                healed_results.append(result)
                continue
            retry_url = resolved_source.resolved[0].url
            healing = heal_and_retry(retry_url, fields, result.records)
            healed_results.append(
                SourceExtractionResult(
                    query_or_url=result.query_or_url,
                    records=result.records + healing.recovered_records,
                    fetch_errors=result.fetch_errors + ([healing.diagnosis] if healing.diagnosis else []),
                )
            )
        yield _sse_event("critic:done", {})
    except Exception as err:
        healed_results = extraction_results
        yield _sse_event("critic:done", {"warning": str(err)})

    # --- Stage 5: Validator ---
    yield _sse_event("validator:start", {})
    try:
        all_records = [r for result in healed_results for r in result.records]
        validated = validate_and_dedupe(all_records, spec.validation_rules)
        yield _sse_event("validator:done", {
            "validated_result": validated.model_dump(),
        })
    except Exception as err:
        yield _sse_event("pipeline:error", {"error": f"Validator failed: {err}"})
        return

    # --- Persist ---
    # Falls back to the in-memory task_id if the DB write fails, so a run that
    # completed is never lost from the UI even when persistence itself breaks.
    persisted_task_id = task_id
    persist_error = None
    try:
        from app.db.persist import persist_workflow_run

        persisted_task_id = persist_workflow_run(prompt, spec, resolved_spec, healed_results, validated)
    except Exception as err:  # noqa: BLE001 — a DB hiccup shouldn't break a completed run
        persist_error = str(err)
        print(f"[stream] persist failed (run still shown in UI, just not saved to history): {err}")

    # --- Complete ---
    yield _sse_event("pipeline:complete", {
        "task_id": persisted_task_id,
        "total_records": len(validated.clean_records),
        "persist_error": persist_error,
    })

    # Store result for potential replay (same request/session only)
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
