"""
Shared workflow schema — the Python equivalent of backend/src/schemas/workflow.js.
This is the contract every agent (and eventually the frontend) matches against.
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class SourceSpec(BaseModel):
    """A single source the Planner wants checked, before Source-Discovery resolves it."""
    type: Literal["web_search", "site"]
    query_or_url: str = Field(min_length=1)
    notes: str = ""


class ResolvedResult(BaseModel):
    """One real URL found for a source, after Source-Discovery runs."""
    url: str
    title: Optional[str] = None
    snippet: Optional[str] = None


class ResolvedSource(SourceSpec):
    """A source after Source-Discovery has enriched it with real URLs."""
    resolved: List[ResolvedResult] = Field(default_factory=list)


class WorkflowSpec(BaseModel):
    """What the Planner Agent must return."""
    goal: str = Field(min_length=1)
    fields: List[str] = Field(min_length=1)
    sources: List[SourceSpec] = Field(min_length=1)
    validation_rules: List[str] = Field(default_factory=list)
    dedupe_strategy: str = ""


class ResolvedWorkflowSpec(WorkflowSpec):
    """What Source-Discovery Agent returns: same shape, sources enriched with real URLs."""
    sources: List[ResolvedSource] = Field(min_length=1)
