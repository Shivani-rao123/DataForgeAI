"""
SQLAlchemy engine/session setup.

Defaults to a local SQLite file (dataforge.db, created automatically next to
this backend) — zero setup, works everywhere, good enough for a single-user
demo. Set DATABASE_URL in .env to point at real Postgres instead; nothing
else in the app needs to change to switch.
"""
import os
from contextlib import contextmanager

from dotenv import load_dotenv

load_dotenv()

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./dataforge.db")

_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


@contextmanager
def get_session():
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db():
    from app.db import models  # noqa: F401
    Base.metadata.create_all(bind=engine)