"""
Greenhouse connector — public job-board API, no key required.
GET https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true
`company` is the board slug (e.g. "stripe", "airbnb"). Returns [] if none given.
"""
import html
import re

import httpx

from app.schemas import ConnectorParams, ResolvedResult

MAX_RESULTS = 25
_TAG_RE = re.compile(r"<[^>]+>")
_STOP = {"entry", "level", "junior", "senior", "the", "and", "for", "with", "job", "jobs", "role"}


def _strip_html(fragment: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", _TAG_RE.sub("", html.unescape(fragment or ""))).strip()


def _title_matches(title: str, keywords: str) -> bool:
    """Loose token match: keep if any meaningful keyword token appears in the title.
    Precise filtering (experience, etc.) happens later in the LLM verification step."""
    tokens = [t for t in re.findall(r"[a-z0-9]+", keywords.lower()) if len(t) >= 3 and t not in _STOP]
    if not tokens:
        return True
    low = title.lower()
    return any(t in low for t in tokens)


def fetch(params: ConnectorParams) -> list[ResolvedResult]:
    company = params.company.strip()
    if not company:
        print("[connector] greenhouse skipped: no company slug")
        return []

    url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs"
    resp = httpx.get(url, params={"content": "true"}, timeout=30)
    resp.raise_for_status()

    out: list[ResolvedResult] = []
    for job in resp.json().get("jobs", []):
        title = job.get("title") or ""
        if not _title_matches(title, params.keywords):
            continue  # loose title pre-filter when the user gave keywords
        loc = (job.get("location") or {}).get("name") or ""
        body = _strip_html(job.get("content", ""))
        raw = f"Title: {title}\nCompany: {company}\nLocation: {loc}\n\n{body}"
        out.append(
            ResolvedResult(
                url=job.get("absolute_url") or "",
                title=title,
                snippet=body[:300],
                raw_content=raw,
            )
        )
        if len(out) >= MAX_RESULTS:
            break
    return out
