"""Entrypoint for a Dockerized extraction worker. Run: python -m app.workers.extraction_worker"""
from rq import Worker

from app.db.queue import extraction_queue
from app.db.redis_client import get_redis

if __name__ == "__main__":
    worker = Worker([extraction_queue], connection=get_redis())
    worker.work()