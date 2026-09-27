"""
Persists a completed graph run (Planner -> ... -> Validator) into Postgres.
Called from main.py's /api/workflows/run right after run_workflow() succeeds.
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