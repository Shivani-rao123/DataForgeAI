"""
Job connectors — resolve a ConnectorParams into real job postings via legitimate
public APIs (no scraping of gated sites). Each connector returns a list of
ResolvedResult where raw_content holds the full posting text, so the Extraction
Agent can verify the user's criteria (experience, location, etc.) against the
actual posting rather than a search snippet.
"""
from app.schemas import ConnectorParams, ResolvedResult

from . import adzuna, arbeitnow, greenhouse, lever, remoteok, usajobs

_PROVIDERS = {
    "adzuna": adzuna.fetch,
    "greenhouse": greenhouse.fetch,
    "lever": lever.fetch,
    "remoteok": remoteok.fetch,
    "arbeitnow": arbeitnow.fetch,
    "usajobs": usajobs.fetch,
}


def fetch_postings(params: ConnectorParams) -> list[ResolvedResult]:
    """Dispatch to the right provider. Never raises — a failing connector returns []."""
    fn = _PROVIDERS.get(params.provider)
    if fn is None:
        print(f"[connector] unknown provider: {params.provider!r}")
        return []
    try:
        results = fn(params)
        print(f"[connector] {params.provider} -> {len(results)} postings")
        return results
    except Exception as err:  # noqa: BLE001 — a broken connector must not kill the run
        print(f"[connector] {params.provider} failed: {str(err)[:160]}")
        return []