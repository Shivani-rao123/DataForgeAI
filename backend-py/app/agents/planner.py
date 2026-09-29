"""
Planner Agent — turns a plain-English prompt into a structured WorkflowSpec,
using Groq (free tier) as the LLM.
"""
import json
import re

from app.llm import chat
from app.schemas import WorkflowSpec

SYSTEM_PROMPT = """You are the Planner Agent in a data-collection platform.
Given a user's plain-English request, output ONLY a JSON object (no prose, no markdown fences)
describing a workflow, in exactly this shape:

{
  "goal": string,
  "fields": string[],
  "sources": [
    { "type": "web_search" | "site" | "connector", "query_or_url": string, "notes": string,
      "connector": { "provider": "adzuna"|"greenhouse"|"lever"|"remoteok"|"arbeitnow"|"usajobs", "keywords": string, "location": string, "company": string } | null }
  ],
  "validation_rules": string[],
  "dedupe_strategy": string,
  "exclude_domains": string[]
}

Rules:
- "fields" are the data columns to extract per record (e.g. "company_name", "contact_email").
- Use "type": "web_search" when you need to find sources via a search query.
- Use "type": "site" only when the user named a specific website/URL directly.
- Use "type": "connector" for JOB-SEARCH requests, which return full job postings from legitimate APIs:
    * provider "adzuna": broad keyword job search. Set "keywords" (role/skills) and "location" (city/region). Leave "company" empty.
    * provider "greenhouse" or "lever": a specific company's official careers board. Set "company" to the company's lower-case board slug (e.g. "stripe"), plus "keywords". Use ONE of these per company the user names.
    * provider "remoteok": remote-only tech jobs. Set "keywords" (role/skills, used as RemoteOK tags). Leave "location"/"company" empty. Use when the user wants remote work, or as a general tech-job source.
    * provider "arbeitnow": broad job aggregator (Europe-heavy, many remote). Set "keywords" and "location". Leave "company" empty.
    * provider "usajobs": US federal government jobs ONLY. Set "keywords" and "location" (US city/state). Leave "company" empty. Only use when the user is clearly asking about US government/federal jobs.
  For a job request, emit an "adzuna" connector source, a "greenhouse"/"lever" connector for EACH company the user names, and ONE "web_search" source as a fallback. Add "remoteok" or "arbeitnow" instead of/alongside "adzuna" when they fit better (remote-only, or Europe). Only add "usajobs" for explicit US federal/government job requests. For a connector source, set "query_or_url" to a short human label and fill "connector"; for all other sources set "connector" to null.
  Emit AT MOST ONE greenhouse/lever source per company — their boards are not searchable by city, so never create per-location duplicates for the same company. Put any city/region ONLY in the "adzuna" connector's "location".
- Keep "sources" to 2-4 entries — focused, not exhaustive.
- Write "query_or_url" as a plain natural-language search query. Do NOT wrap phrases in quotes and do NOT use operators like site: or -site:.
- Make each source target a different angle (e.g. a different city or site type) so results don't overlap.
- "exclude_domains": bare domains (e.g. "example.com") ONLY if the user asked to avoid or exclude specific websites; otherwise an empty list [].
"""


def plan_workflow(prompt: str) -> WorkflowSpec:
    """
    Calls the LLM to turn a plain-English prompt into a validated WorkflowSpec.
    Raises ValueError if the LLM output isn't valid JSON or doesn't match the schema.
    """
    text = chat(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        max_tokens=3000,
    )
    cleaned = re.sub(r"```json|```", "", text).strip()

    try:
        parsed_json = json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise ValueError(f"Planner returned invalid JSON: {err}") from err

    # LLMs sometimes emit an individual source as a JSON *string* instead of an object;
    # coerce those back to dicts so schema validation doesn't reject the whole plan.
    sources = parsed_json.get("sources")
    if isinstance(sources, list):
        for i, src in enumerate(sources):
            if isinstance(src, str):
                try:
                    sources[i] = json.loads(src)
                except json.JSONDecodeError:
                    pass

    # Pydantic validates the shape here — throws a clear error if a field is missing/wrong type.
    return WorkflowSpec.model_validate(parsed_json)