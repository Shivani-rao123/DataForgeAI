"""
Extraction Agent — for one resolved source, fetches the page, pulls the requested
fields via the LLM, and captures the exact snippet each record's data came from.
"""
import functools
import json
import os
import re

import httpx
import trafilatura
from langchain_groq import ChatGroq
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.schemas import ExtractedRecord, ResolvedSource, SourceExtractionResult

MAX_CHARS_TO_LLM = 6000  # trimmed down from 12000 to reduce tokens-per-minute usage on the free tier


@functools.lru_cache(maxsize=1)
def get_llm() -> ChatGroq:
    return ChatGroq(
        model="openai/gpt-oss-20b",
        api_key=os.environ["GROQ_API_KEY"],
        max_tokens=2000,
        max_retries=0,
        timeout=30,
    )


def _is_rate_limit_error(err: BaseException) -> bool:
    text = str(err).lower()
    return "429" in text or "rate_limit" in text or "rate limit" in text


@retry(
    retry=retry_if_exception(_is_rate_limit_error),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)
def invoke_llm(messages: list) -> str:
    """Shared LLM call for extraction.py and critic.py — retries with backoff on a
    Groq free-tier 429, instead of failing the whole workflow run."""
    response = get_llm().invoke(messages)
    return response.content


def fetch_page_text(url: str) -> str:
    resp = httpx.get(url, timeout=15, follow_redirects=True, headers={"User-Agent": "DataForgeAI/1.0"})
    resp.raise_for_status()
    text = trafilatura.extract(resp.text) or ""
    return text[:MAX_CHARS_TO_LLM]


def _extraction_prompt(fields: list, page_text: str) -> str:
    field_list = ", ".join(fields)
    return f"""You are the Extraction Agent in a data-collection platform.
Given the page text below, extract every distinct record you can find, using exactly
these fields: {field_list}.
For each record, also include "citation_snippet": the exact short quote (under 25 words)
from the page text that the record's data came from.

Output ONLY a JSON array (no prose, no markdown fences), shape:
[{{ "data": {{"field": "value", ...}}, "citation_snippet": string }}]

If a field isn't present for a record, set it to null. If you find nothing, output [].

Page text:
---
{page_text}
---"""


def extract_records_from_text(page_text: str, fields: list) -> list:
    text = invoke_llm([{"role": "user", "content": _extraction_prompt(fields, page_text)}])
    cleaned = re.sub(r"```json|```", "", text).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, list):
        return []
    return [item for item in parsed if isinstance(item, dict)]  # drop any malformed non-object entries


def extract_from_source(resolved_source: ResolvedSource, fields: list) -> SourceExtractionResult:
    records: list = []
    errors: list = []

    for result in resolved_source.resolved:
        try:
            page_text = fetch_page_text(result.url)
        except Exception as err:  # noqa: BLE001
            errors.append(f"{result.url}: {err}")
            continue

        if not page_text.strip():
            errors.append(f"{result.url}: no extractable text")
            continue

        try:
            raw_records = extract_records_from_text(page_text, fields)
        except Exception as err:  # noqa: BLE001 — rate limit exhausted retries, or another LLM failure
            errors.append(f"{result.url}: LLM extraction failed: {err}")
            continue

        for raw in raw_records:
            records.append(
                ExtractedRecord(
                    source_url=result.url,
                    data=raw.get("data", {}),
                    citation_snippet=raw.get("citation_snippet", ""),
                    citation_url=result.url,
                )
            )

    return SourceExtractionResult(query_or_url=resolved_source.query_or_url, records=records, fetch_errors=errors)


def extract_all(resolved_spec) -> list:
    """Sequential fallback (e.g. for local testing without Redis/RQ running)."""
    return [extract_from_source(source, resolved_spec.fields) for source in resolved_spec.sources]


def run_extraction_job(task_id: str, source_id: str, resolved_source_dict: dict, fields: list) -> dict:
    """RQ worker entrypoint: runs one source's extraction, writes to Postgres, publishes progress."""
    from app.db.database import get_session
    from app.db.models import Record
    from app.db.redis_client import publish_event

    resolved_source = ResolvedSource.model_validate(resolved_source_dict)
    result = extract_from_source(resolved_source, fields)

    with get_session() as db:
        for record in result.records:
            db.add(
                Record(
                    task_id=task_id,
                    source_id=source_id,
                    data_json=record.data,
                    citation_snippet=record.citation_snippet,
                    citation_url=record.citation_url,
                )
            )

    publish_event(task_id, "record:new", {"source_id": source_id, "count": len(result.records)})
    return {"source_id": source_id, "record_count": len(result.records), "errors": result.fetch_errors}