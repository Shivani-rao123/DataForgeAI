"""
Lever connector — public postings API, no key required.
GET https://api.lever.co/v0/postings/{company}?mode=json
`company` is the board slug (e.g. "netflix", "figma"). Returns [] if none given.
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
        print("[connector] lever skipped: no company slug")
        return []

    url = f"https://api.lever.co/v0/postings/{company}"
    resp = httpx.get(url, params={"mode": "json"}, timeout=30)
    resp.raise_for_status()

    out: list[ResolvedResult] = []
    for job in resp.json():
        title = job.get("text") or ""
        if not _title_matches(title, params.keywords):
            continue
        loc = (job.get("categories") or {}).get("location") or ""
        body = _strip_html(job.get("descriptionPlain") or job.get("description", ""))
        raw = f"Title: {title}\nCompany: {company}\nLocation: {loc}\n\n{body}"
        out.append(
            ResolvedResult(
                url=job.get("hostedUrl") or job.get("applyUrl") or "",
                title=title,
                snippet=body[:300],
                raw_content=raw,
            )
        )
        if len(out) >= MAX_RESULTS:
            break
    return out
