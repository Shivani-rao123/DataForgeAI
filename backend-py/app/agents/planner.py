"""
Planner Agent — turns a plain-English prompt into a structured WorkflowSpec,
using Groq (free tier) as the LLM.
"""
import json
import os
import re

from langchain_groq import ChatGroq
from app.schemas import WorkflowSpec

SYSTEM_PROMPT = """You are the Planner Agent in a data-collection platform.
Given a user's plain-English request, output ONLY a JSON object (no prose, no markdown fences)
describing a workflow, in exactly this shape:

{
  "goal": string,
  "fields": string[],
  "sources": [
    { "type": "web_search" | "site", "query_or_url": string, "notes": string }
  ],
  "validation_rules": string[],
  "dedupe_strategy": string
}

Rules:
- "fields" are the data columns to extract per record (e.g. "company_name", "contact_email").
- Use "type": "web_search" when you need to find sources via a search query.
- Use "type": "site" only when the user named a specific website/URL directly.
- Keep "sources" to 2-4 entries — focused, not exhaustive.
"""


import functools


@functools.lru_cache(maxsize=1)
def _get_llm() -> ChatGroq:
    """
    Cached singleton: the underlying httpx/connection setup has a one-time
    ~60s cold-start cost on this network. Building a fresh ChatGroq client
    per call paid that cost every time; reusing one client for the whole
    process pays it once (ideally during the FastAPI startup warm-up).
    """
    return ChatGroq(
        model="openai/gpt-oss-20b",
        api_key=os.environ["GROQ_API_KEY"],
        max_tokens=1000,
        max_retries=0,
        timeout=30,
    )
def plan_workflow(prompt: str) -> WorkflowSpec:
    """
    Calls the LLM to turn a plain-English prompt into a validated WorkflowSpec.
    Raises ValueError if the LLM output isn't valid JSON or doesn't match the schema.
    """
    llm = _get_llm()
    response = llm.invoke(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    text = response.content
    cleaned = re.sub(r"```json|```", "", text).strip()

    try:
        parsed_json = json.loads(cleaned)
    except json.JSONDecodeError as err:
        raise ValueError(f"Planner returned invalid JSON: {err}") from err

    # Pydantic validates the shape here — throws a clear error if a field is missing/wrong type.
    return WorkflowSpec.model_validate(parsed_json)
