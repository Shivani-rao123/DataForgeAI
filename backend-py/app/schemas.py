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




class ExtractedRecord(BaseModel):
    """One record pulled by an Extraction Agent, before validation/dedupe."""
    source_url: str
    data: dict = Field(default_factory=dict)  # field_name -> value (str | None)
    citation_snippet: str = ""
    citation_url: str = ""


class SourceExtractionResult(BaseModel):
    """Everything the Extraction Agent produced for one resolved source."""
    query_or_url: str
    records: List[ExtractedRecord] = Field(default_factory=list)
    fetch_errors: List[str] = Field(default_factory=list)


class ValidationIssue(BaseModel):
    record_index: int
    field: str
    reason: str


class MergeDecision(BaseModel):
    kept_index: int
    dropped_index: int
    reason: str
    similarity_score: float


class ValidatedResult(BaseModel):
    clean_records: List[ExtractedRecord] = Field(default_factory=list)
    issues: List[ValidationIssue] = Field(default_factory=list)
    merges: List[MergeDecision] = Field(default_factory=list)


class SourceHealthReport(BaseModel):
    query_or_url: str
    total_attempted: int
    null_rate: float
    needs_healing: bool


class HealingResult(BaseModel):
    query_or_url: str
    diagnosis: str
    revised_field_hints: dict = Field(default_factory=dict)
    retried: bool
    recovered_records: List[ExtractedRecord] = Field(default_factory=list)