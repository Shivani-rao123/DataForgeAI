"""
Source-Discovery Agent — resolves each "web_search" source in a WorkflowSpec into
real URLs using Tavily (free tier), and passes "site" sources through as-is.
"""
import os

from tavily import TavilyClient

from app.schemas import ResolvedResult, ResolvedSource, ResolvedWorkflowSpec, WorkflowSpec

MAX_RESULTS_PER_SOURCE = 5


def _get_client() -> TavilyClient:
    return TavilyClient(api_key=os.environ["TAVILY_API_KEY"])


def discover_sources(spec: WorkflowSpec) -> ResolvedWorkflowSpec:
    """
    Takes a WorkflowSpec (from the Planner Agent) and returns a ResolvedWorkflowSpec
    where every source has a "resolved" list of real URLs, titles, and snippets.
    """
    client = _get_client()
    resolved_sources = []

    for source in spec.sources:
        if source.type == "site":
            resolved = [ResolvedResult(url=source.query_or_url)]
        else:
            resolved = _tavily_search(client, source.query_or_url)

        resolved_sources.append(
            ResolvedSource(
                type=source.type,
                query_or_url=source.query_or_url,
                notes=source.notes,
                resolved=resolved,
            )
        )

    # Re-validates the whole enriched spec against the schema before returning.
    return ResolvedWorkflowSpec(
        goal=spec.goal,
        fields=spec.fields,
        sources=resolved_sources,
        validation_rules=spec.validation_rules,
        dedupe_strategy=spec.dedupe_strategy,
    )


def _tavily_search(client: TavilyClient, query: str) -> list[ResolvedResult]:
    response = client.search(query=query, max_results=MAX_RESULTS_PER_SOURCE)
    results = response.get("results", [])
    return [
        ResolvedResult(url=r["url"], title=r.get("title"), snippet=r.get("content"))
        for r in results
    ]
