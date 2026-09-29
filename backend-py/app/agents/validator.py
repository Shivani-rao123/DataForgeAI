"""
Validator Agent — flags missing/implausible fields and dedupes records, recording
*why* two records were judged duplicates instead of merging silently.
"""
import re
from urllib.parse import urlparse

from rapidfuzz import fuzz

from app.schemas import ExtractedRecord, MergeDecision, ValidatedResult, ValidationIssue

DUPLICATE_NAME_THRESHOLD = 88
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _looks_implausible(field: str, value) -> str | None:
    if value in (None, "", "null"):
        return "missing"
    if "email" in field.lower() and not EMAIL_RE.match(str(value)):
        return "not a valid email format"
    if "url" in field.lower() and not str(value).startswith(("http://", "https://")):
        return "not a valid URL"
    return None


def _primary_name_field(record: ExtractedRecord) -> str | None:
    """Identity key: ALL name/title/company-like fields joined, so two different
    companies with the same job title are not treated as duplicates."""
    parts = [
        str(v)
        for k, v in record.data.items()
        if any(hint in k.lower() for hint in ("name", "title", "company")) and v
    ]
    return " | ".join(parts) if parts else None


def _domain(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return url


def validate_and_dedupe(records: list, validation_rules: list) -> ValidatedResult:
    issues: list = []
    for i, record in enumerate(records):
        for field, value in record.data.items():
            reason = _looks_implausible(field, value)
            if reason:
                issues.append(ValidationIssue(record_index=i, field=field, reason=reason))

    merges: list = []
    dropped: set = set()

    for i in range(len(records)):
        if i in dropped:
            continue
        name_i = _primary_name_field(records[i])
        if not name_i:
            continue
        for j in range(i + 1, len(records)):
            if j in dropped:
                continue
            name_j = _primary_name_field(records[j])
            if not name_j:
                continue

            score = fuzz.ratio(str(name_i).lower(), str(name_j).lower())
            if score >= DUPLICATE_NAME_THRESHOLD:
                same_domain = _domain(records[i].citation_url) == _domain(records[j].citation_url)
                reason = f"name similarity {score:.0f}%" + (" + same source domain" if same_domain else "")
                merges.append(MergeDecision(kept_index=i, dropped_index=j, reason=reason, similarity_score=score / 100))
                dropped.add(j)

    clean_records = [r for idx, r in enumerate(records) if idx not in dropped]
    return ValidatedResult(clean_records=clean_records, issues=issues, merges=merges)