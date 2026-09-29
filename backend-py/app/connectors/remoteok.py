"""
RemoteOK connector — official free public JSON feed, no key required.
GET https://remoteok.com/api?tags=a,b,c  (comma-separated RemoteOK tags; omit for the full feed)
The feed's first element is a "legal" notice object (no job fields), not a posting — skip it.
RemoteOK's API terms ask for a follow link back to the source URL; done via ResolvedResult.url.
"""
import html
import re

import httpx

from app.schemas import ConnectorParams, ResolvedResult

MAX_RESULTS = 25
_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(fragment: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", _TAG_RE.sub("", html.unescape(fragment or ""))).strip()


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def fetch(params: ConnectorParams) -> list[ResolvedResult]:
    tags = ",".join(t.strip() for t in _slugify_terms(params.keywords)) if params.keywords else ""
    resp = httpx.get(
        "https://remoteok.com/api",
        params={"tags": tags} if tags else None,
        headers={"User-Agent": "DataForgeAI/1.0 (job aggregator; +https://remoteok.com)"},
        timeout=30,
    )
    resp.raise_for_status()

    jobs = resp.json()
    if jobs and not jobs[0].get("id"):
        jobs = jobs[1:]  # first element is RemoteOK's legal/notice object, not a job

    out: list[ResolvedResult] = []
    for job in jobs:
        title = job.get("position") or job.get("title") or ""
        company = job.get("company") or ""
        location = job.get("location") or "Remote"
        salary = job.get("salary_min") and f"${job['salary_min']}–${job.get('salary_max', '')}"
        body = _strip_html(job.get("description", ""))[:3000]
        raw = f"Title: {title}\nCompany: {company}\nLocation: {location}\nSalary: {salary or 'not listed'}\n\n{body}"
        out.append(
            ResolvedResult(
                url=job.get("url") or f"https://remoteok.com/remote-jobs/{job.get('id', '')}",
                title=title,
                snippet=body[:300],
                raw_content=raw,
            )
        )
        if len(out) >= MAX_RESULTS:
            break
    return out


def _slugify_terms(keywords: str) -> list[str]:
    return [_slugify(t) for t in re.split(r"[,\s]+", keywords) if len(t) >= 3][:5]