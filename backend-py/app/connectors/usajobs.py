"""
USAJOBS connector — official US federal government job-search API.
GET https://data.usajobs.gov/api/search
Needs a free API key: register at https://developer.usajobs.gov (key emailed same day).
Every request must also send the email the key was registered with.
Env: USAJOBS_API_KEY, USAJOBS_EMAIL. Returns [] gracefully when either is missing.
"""
import os

import httpx

from app.schemas import ConnectorParams, ResolvedResult

MAX_RESULTS = 25


def fetch(params: ConnectorParams) -> list[ResolvedResult]:
    api_key = os.environ.get("USAJOBS_API_KEY", "").strip()
    email = os.environ.get("USAJOBS_EMAIL", "").strip()
    if not api_key or not email:
        print("[connector] usajobs skipped: USAJOBS_API_KEY / USAJOBS_EMAIL not set")
        return []

    query = {"ResultsPerPage": MAX_RESULTS}
    if params.keywords:
        query["Keyword"] = params.keywords
    if params.location:
        query["LocationName"] = params.location

    resp = httpx.get(
        "https://data.usajobs.gov/api/search",
        params=query,
        headers={"Host": "data.usajobs.gov", "User-Agent": email, "Authorization-Key": api_key},
        timeout=30,
    )
    resp.raise_for_status()

    items = (resp.json().get("SearchResult") or {}).get("SearchResultItems", [])
    out: list[ResolvedResult] = []
    for item in items:
        job = item.get("MatchedObjectDescriptor", {})
        title = job.get("PositionTitle") or ""
        org = job.get("OrganizationName") or ""
        locations = ", ".join(
            loc.get("LocationName", "") for loc in job.get("PositionLocation", [])
        ) or "Not specified"
        pay = job.get("PositionRemuneration", [{}])
        salary = f"{pay[0].get('MinimumRange', '')}-{pay[0].get('MaximumRange', '')} {pay[0].get('RateIntervalCode', '')}" if pay else ""
        summary = job.get("UserArea", {}).get("Details", {}).get("JobSummary", "") or job.get("QualificationSummary", "")
        raw = f"Title: {title}\nAgency: {org}\nLocation: {locations}\nSalary: {salary}\n\n{summary}"
        out.append(
            ResolvedResult(
                url=job.get("PositionURI") or "",
                title=title,
                snippet=(summary or "")[:300],
                raw_content=raw[:8000],
            )
        )
    return out