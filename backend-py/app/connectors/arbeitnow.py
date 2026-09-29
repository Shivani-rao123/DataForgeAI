"""
Arbeitnow connector — free public job-board API, no key required.
GET https://www.arbeitnow.com/api/job-board-api  (paginated, ~100 jobs/page)
Aggregates from several ATS platforms (Greenhouse, SmartRecruiters, Recruitee, etc.),
covering mostly Europe-based / remote-friendly postings.
"""
import html
import re

import httpx

from app.schemas import ConnectorParams, ResolvedResult

MAX_RESULTS = 25
MAX_PAGES = 3
_STOP = {"entry", "level", "junior", "senior", "the", "and", "for", "with", "job", "jobs", "role"}
_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(fragment: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", _TAG_RE.sub("", html.unescape(fragment or ""))).strip()


def _tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) >= 3 and t not in _STOP]


def _matches(job: dict, keyword_tokens: list[str], location: str) -> bool:
    if keyword_tokens:
        hay = f"{job.get('title', '')} {job.get('description', '')} {' '.join(job.get('tags', []))}".lower()
        if not any(t in hay for t in keyword_tokens):
            return False
    if location:
        loc = (job.get("location") or "").lower()
        if location.lower() not in loc and not job.get("remote"):
            return False
    return True


def fetch(params: ConnectorParams) -> list[ResolvedResult]:
    keyword_tokens = _tokens(params.keywords)
    out: list[ResolvedResult] = []

    page = 1
    while page <= MAX_PAGES and len(out) < MAX_RESULTS:
        resp = httpx.get("https://www.arbeitnow.com/api/job-board-api", params={"page": page}, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        jobs = payload.get("data", [])
        if not jobs:
            break

        for job in jobs:
            if not _matches(job, keyword_tokens, params.location):
                continue
            title = job.get("title") or ""
            company = job.get("company_name") or ""
            location = job.get("location") or ("Remote" if job.get("remote") else "")
            tags = ", ".join(job.get("tags", []))
            body = _strip_html(job.get("description") or "")
            raw = f"Title: {title}\nCompany: {company}\nLocation: {location}\nTags: {tags}\nRemote: {job.get('remote')}\n\n{body}"
            out.append(
                ResolvedResult(
                    url=job.get("url") or "",
                    title=title,
                    snippet=body[:300],
                    raw_content=raw[:8000],
                )
            )
            if len(out) >= MAX_RESULTS:
                break
        page += 1

    return out