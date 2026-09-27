"""
Critic / Self-Healing Agent — watches for extraction failure spikes on a source,
re-inspects the page, and retries extraction once with LLM-revised field guidance.
"""
import json
import re

from app.agents.extraction import extract_records_from_text, fetch_page_text, invoke_llm
from app.schemas import ExtractedRecord, HealingResult, SourceExtractionResult, SourceHealthReport

NULL_RATE_THRESHOLD = 0.4


def _null_rate(records: list, fields: list) -> float:
    if not records or not fields:
        return 0.0
    total_cells = len(records) * len(fields)
    empty_cells = sum(1 for r in records for f in fields if not r.data.get(f))
    return empty_cells / total_cells


def check_health(result: SourceExtractionResult, fields: list) -> SourceHealthReport:
    rate = _null_rate(result.records, fields)
    failed_completely = len(result.records) == 0 and len(result.fetch_errors) > 0
    return SourceHealthReport(
        query_or_url=result.query_or_url,
        total_attempted=len(result.records),
        null_rate=rate,
        needs_healing=failed_completely or rate > NULL_RATE_THRESHOLD,
    )


def _diagnose_and_revise(page_text: str, fields: list, previous_records: list) -> dict:
    sample = json.dumps([r.data for r in previous_records[:3]])
    prompt = f"""You are the Critic Agent. A previous extraction attempt for fields {fields}
returned mostly empty values. Sample of what was extracted: {sample}

Look at the page text below and work out: (1) a one-sentence diagnosis of why extraction
likely failed, and (2) for each field, a short hint on where/how to find it on THIS page.

Output ONLY JSON: {{"diagnosis": string, "field_hints": {{"field": "hint", ...}}}}

Page text:
---
{page_text}
---"""
    try:
        text = invoke_llm([{"role": "user", "content": prompt}])
    except Exception as err:  # noqa: BLE001 — rate limit exhausted retries
        return {"diagnosis": f"diagnosis call failed: {err}", "field_hints": {}}

    cleaned = re.sub(r"```json|```", "", text).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return {"diagnosis": "could not parse diagnosis", "field_hints": {}}


def heal_and_retry(url: str, fields: list, previous_records: list) -> HealingResult:
    try:
        page_text = fetch_page_text(url)
    except Exception as err:  # noqa: BLE001
        return HealingResult(query_or_url=url, diagnosis=f"re-fetch failed: {err}", revised_field_hints={}, retried=False)

    diagnosis = _diagnose_and_revise(page_text, fields, previous_records)
    hints = diagnosis.get("field_hints", {})

    hint_lines = "\n".join(f"- {f}: {h}" for f, h in hints.items())
    guided_text = f"Extraction hints from a prior failed attempt:\n{hint_lines}\n\n{page_text}"

    try:
        raw_records = extract_records_from_text(guided_text, fields)
    except Exception:  # noqa: BLE001
        raw_records = []

    recovered = [
        ExtractedRecord(source_url=url, data=r.get("data", {}), citation_snippet=r.get("citation_snippet", ""), citation_url=url)
        for r in raw_records
    ]

    return HealingResult(
        query_or_url=url,
        diagnosis=diagnosis.get("diagnosis", ""),
        revised_field_hints=hints,
        retried=True,
        recovered_records=recovered,
    )