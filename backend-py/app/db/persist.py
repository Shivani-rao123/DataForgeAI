"""
Persists a completed pipeline run into the database, and reads runs back out
for the History page (list_tasks / get_task).
"""
from datetime import datetime

from app.db.database import get_session
from app.db.models import AgentEvent, MergeDecisionModel, Record, Source, Task, Workflow


def create_task(prompt: str, retry_of: str | None = None) -> str:
    """Create a task before pipeline execution starts."""
    with get_session() as db:
        workflow = Workflow(prompt=prompt, spec_json={})
        db.add(workflow)
        db.flush()
        task = Task(
            workflow_id=workflow.id,
            status="running",
            started_at=datetime.utcnow(),
            retry_of=retry_of,
        )
        db.add(task)
        db.flush()
        return task.id


def update_task_status(
    task_id: str,
    status: str,
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    """Update a task's lifecycle state without exposing internal errors to clients."""
    with get_session() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return
        task.status = status
        task.error_code = error_code
        task.error_message = error_message
        if status in {"done", "failed", "cancelled"}:
            task.completed_at = datetime.utcnow()


def record_agent_event(
    task_id: str,
    agent_name: str,
    status: str,
    message: str | None = None,
) -> None:
    with get_session() as db:
        db.add(
            AgentEvent(
                task_id=task_id,
                agent_name=agent_name,
                status=status,
                message=message,
            )
        )


def persist_workflow_run(prompt, spec, resolved_spec, extraction_results, validated_result, task_id: str | None = None) -> str:
    """Write a completed run, updating the task created at stream start."""
    with get_session() as db:
        task = db.query(Task).filter(Task.id == task_id).first() if task_id else None
        if task:
            workflow = db.query(Workflow).filter(Workflow.id == task.workflow_id).first()
            workflow.spec_json = spec.model_dump()
            task.status = "done"
            task.error_code = None
            task.error_message = None
            task.completed_at = datetime.utcnow()
        else:
            workflow = Workflow(prompt=prompt, spec_json=spec.model_dump())
            db.add(workflow)
            db.flush()
            task = Task(
                workflow_id=workflow.id,
                status="done",
                started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(),
            )
            db.add(task)
            db.flush()

        # Flattened in the same order validate_and_dedupe saw them, so merges'
        # kept_index/dropped_index line up with this list.
        record_rows = []

        for result in extraction_results:
            source = Source(
                task_id=task.id,
                url=result.query_or_url,
                status="failed" if not result.records and result.fetch_errors else "ok",
                record_count=len(result.records),
            )
            db.add(source)
            db.flush()

            for extracted in result.records:
                record = Record(
                    task_id=task.id,
                    source_id=source.id,
                    data_json=extracted.data,
                    citation_snippet=extracted.citation_snippet,
                    citation_url=extracted.citation_url,
                    match_status=extracted.match_status,
                    match_reason=extracted.match_reason,
                )
                db.add(record)
                record_rows.append(record)

        db.flush()  # every record now has a real id

        for merge in validated_result.merges:
            record_rows[merge.dropped_index].is_duplicate = True
            db.add(
                MergeDecisionModel(
                    task_id=task.id,
                    record_id_a=record_rows[merge.kept_index].id,
                    record_id_b=record_rows[merge.dropped_index].id,
                    reason=merge.reason,
                    similarity_score=merge.similarity_score,
                )
            )

        return task.id


def list_tasks(
    limit: int = 50,
    offset: int = 0,
    status: str | None = None,
    search: str | None = None,
) -> list[dict]:
    """Newest-first task summaries with pagination and basic filtering."""
    with get_session() as db:
        query = (
            db.query(Task, Workflow)
            .join(Workflow, Task.workflow_id == Workflow.id)
        )
        if status:
            query = query.filter(Task.status == status)
        if search:
            query = query.filter(Workflow.prompt.ilike(f"%{search}%"))
        tasks = query.order_by(Task.started_at.desc()).offset(offset).limit(min(limit, 100)).all()
        out = []
        for task, workflow in tasks:
            record_count = db.query(Record).filter(Record.task_id == task.id, Record.is_duplicate == False).count()  # noqa: E712
            out.append(
                {
                    "task_id": task.id,
                    "prompt": workflow.prompt,
                    "status": task.status,
                    "created_at": (task.started_at or task.completed_at).isoformat()
                    if (task.started_at or task.completed_at)
                    else None,
                    "record_count": record_count,
                    "error_code": task.error_code,
                }
            )
        return out


def list_task_events(task_id: str) -> list[dict]:
    with get_session() as db:
        events = (
            db.query(AgentEvent)
            .filter(AgentEvent.task_id == task_id)
            .order_by(AgentEvent.created_at.asc())
            .all()
        )
        return [
            {
                "agent": event.agent_name,
                "status": event.status,
                "message": event.message,
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in events
        ]


def get_task(task_id: str) -> dict | None:
    """Full detail for one past run, shaped for the frontend to reopen it
    the same way it renders a just-finished live run."""
    with get_session() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return None
        workflow = db.query(Workflow).filter(Workflow.id == task.workflow_id).first()
        sources = db.query(Source).filter(Source.task_id == task.id).all()
        records = db.query(Record).filter(Record.task_id == task.id).all()
        merges = db.query(MergeDecisionModel).filter(MergeDecisionModel.task_id == task.id).all()

        record_by_id = {r.id: r for r in records}
        source_url_by_id = {s.id: s.url for s in sources}
        clean_records = [_record_to_dict(r, source_url_by_id) for r in records if not r.is_duplicate]
        merge_dicts = []
        for m in merges:
            kept = record_by_id.get(m.record_id_a)
            dropped = record_by_id.get(m.record_id_b)
            if not kept or not dropped:
                continue
            merge_dicts.append(
                {
                    "kept_index": next((i for i, r in enumerate(clean_records) if _matches(r, kept)), 0),
                    "dropped_index": -1,  # dropped record isn't in clean_records; index not meaningful on replay
                    "reason": m.reason,
                    "similarity_score": m.similarity_score,
                }
            )

        return {
            "task_id": task.id,
            "prompt": workflow.prompt,
            "status": task.status,
            "error_code": task.error_code,
            "error_message": task.error_message,
            "created_at": (task.started_at or task.completed_at).isoformat()
            if (task.started_at or task.completed_at)
            else None,
            "spec": workflow.spec_json,
            "sources": [{"url": s.url, "status": s.status, "record_count": s.record_count} for s in sources],
            "validated_result": {
                "clean_records": clean_records,
                "issues": [],  # not persisted per-field today; the live run's Critic output isn't stored
                "merges": merge_dicts,
            },
        }


def _record_to_dict(r: Record, source_url_by_id: dict) -> dict:
    return {
        "source_url": source_url_by_id.get(r.source_id, ""),
        "data": r.data_json,
        "citation_snippet": r.citation_snippet or "",
        "citation_url": r.citation_url or "",
        "match_status": r.match_status or "match",
        "match_reason": r.match_reason or "",
    }


def _matches(record_dict: dict, record_row: Record) -> bool:
    return record_dict["data"] == record_row.data_json