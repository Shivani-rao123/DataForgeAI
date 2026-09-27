"""RQ (Redis Queue) setup — one job per resolved source, for parallel extraction workers."""
from rq import Queue

from app.db.redis_client import get_redis

extraction_queue = Queue("extraction", connection=get_redis())


def enqueue_extraction(task_id: str, source_id: str, resolved_source: dict, fields: list) -> None:
    extraction_queue.enqueue(
        "app.agents.extraction.run_extraction_job",
        task_id,
        source_id,
        resolved_source,
        fields,
        job_timeout=180,
    )