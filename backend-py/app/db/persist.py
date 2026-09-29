"""
Persists a completed pipeline run into the database, and reads runs back out
for the History page (list_tasks / get_task).
"""
from datetime import datetime

from app.db.database import get_session
from app.db.models import MergeDecisionModel, Record, Source, Task, Workflow


def persist_workflow_run(prompt, spec, resolved_spec, extraction_results, validated_result) -> str:
    """Writes one full run to the DB and returns the new task_id."""
    with get_session() as db:
        workflow = Workflow(prompt=prompt, spec_json=spec.model_dump())
        db.add(workflow)
        db.flush()  # assigns workflow.id before we reference it

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


def list_tasks(limit: int = 50) -> list[dict]:
    """Newest-first summary of past runs, for the History page list view."""
    with get_session() as db:
        tasks = (
            db.query(Task, Workflow)
            .join(Workflow, Task.workflow_id == Workflow.id)
            .order_by(Task.started_at.desc())
            .limit(limit)
            .all()
        )
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
                }
            )
        return out


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