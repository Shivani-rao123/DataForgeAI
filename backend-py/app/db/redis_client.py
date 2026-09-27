"""Redis connection singleton — backs the RQ queue and progress pub/sub."""
import functools
import json
import os

import redis

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")


@functools.lru_cache(maxsize=1)
def get_redis() -> redis.Redis:
    return redis.from_url(REDIS_URL, decode_responses=True)


def publish_event(task_id: str, event: str, payload: dict) -> None:
    get_redis().publish(f"task:{task_id}", json.dumps({"event": event, "payload": payload}))