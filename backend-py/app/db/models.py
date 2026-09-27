"""SQLAlchemy ORM models — mirrors the table list in section 4.3 of the plan doc."""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.db.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    prompt = Column(Text, nullable=False)
    spec_json = Column(JSONB, nullable=False)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="workflow")


class Task(Base):
    __tablename__ = "tasks"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    workflow_id = Column(UUID(as_uuid=False), ForeignKey("workflows.id"), nullable=False)
    status = Column(String, default="pending")
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    workflow = relationship("Workflow", back_populates="tasks")
    sources = relationship("Source", back_populates="task")
    records = relationship("Record", back_populates="task")
    agent_events = relationship("AgentEvent", back_populates="task")


class AgentEvent(Base):
    __tablename__ = "agent_events"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    task_id = Column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False)
    agent_name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="agent_events")


class Source(Base):
    __tablename__ = "sources"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    task_id = Column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False)
    url = Column(Text, nullable=False)
    status = Column(String, default="pending")
    record_count = Column(Integer, default=0)

    task = relationship("Task", back_populates="sources")
    records = relationship("Record", back_populates="source")


class Record(Base):
    __tablename__ = "records"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    task_id = Column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False)
    source_id = Column(UUID(as_uuid=False), ForeignKey("sources.id"), nullable=False)
    data_json = Column(JSONB, nullable=False)
    citation_snippet = Column(Text, nullable=True)
    citation_url = Column(Text, nullable=True)
    is_duplicate = Column(Boolean, default=False)

    task = relationship("Task", back_populates="records")
    source = relationship("Source", back_populates="records")


class MergeDecisionModel(Base):
    __tablename__ = "merge_decisions"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    task_id = Column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False)
    record_id_a = Column(UUID(as_uuid=False), ForeignKey("records.id"), nullable=False)
    record_id_b = Column(UUID(as_uuid=False), ForeignKey("records.id"), nullable=False)
    reason = Column(Text, nullable=False)
    similarity_score = Column(Float, nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    task_id = Column(UUID(as_uuid=False), ForeignKey("tasks.id"), nullable=False)
    name = Column(String, nullable=False)
    row_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)


class Template(Base):
    __tablename__ = "templates"
    id = Column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    workflow_id = Column(UUID(as_uuid=False), ForeignKey("workflows.id"), nullable=False)
    name = Column(String, nullable=False)
    is_public = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)