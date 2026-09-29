"""
Adzuna connector — free job-search aggregator API (needs ADZUNA_APP_ID + ADZUNA_APP_KEY).
Docs: https://developer.adzuna.com/  Returns [] gracefully when keys are missing.
"""
import os

import httpx

from app.schemas import ConnectorParams, ResolvedResult

MAX_RESULTS = 10
DEFAULT_COUNTRY = os.environ.get("ADZUNA_COUNTRY", "in")  # 'in' = India; 'gb','us', etc.


def fetch(params: ConnectorParams) -> list[ResolvedResult]:
    app_id = os.environ.get("ADZUNA_APP_ID", "").strip()
    app_key = os.environ.get("ADZUNA_APP_KEY", "").strip()
    if not app_id or not app_key:
        print("[connector] adzuna skipped: ADZUNA_APP_ID / ADZUNA_APP_KEY not set")
        return []

    query = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": MAX_RESULTS,
        "content-type": "application/json",
    }
    if params.keywords:
        query["what"] = params.keywords
    if params.location:
        query["where"] = params.location

    url = f"https://api.adzuna.com/v1/api/jobs/{DEFAULT_COUNTRY}/search/1"
    resp = httpx.get(url, params=query, timeout=30)
    resp.raise_for_status()

    out: list[ResolvedResult] = []
    for job in resp.json().get("results", []):
        title = job.get("title") or ""
        company = (job.get("company") or {}).get("display_name") or ""
        loc = (job.get("location") or {}).get("display_name") or ""
        desc = job.get("description") or ""
        # Fold the structured fields into raw_content so short descriptions still
        # carry title/company/location for extraction and verification.
        raw = f"Title: {title}\nCompany: {company}\nLocation: {loc}\n\n{desc}"
        out.append(
            ResolvedResult(
                url=job.get("redirect_url") or "",
                title=title,
                snippet=desc[:300],
                raw_content=raw,
            )
        )
    return out
