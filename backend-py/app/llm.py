"""
Single place for every LLM call (planner, extraction, critic).

Pick the provider in .env:
  LLM_PROVIDER=gemini   -> Google Gemini (free tier, big token limits)   needs GEMINI_API_KEY
  LLM_PROVIDER=groq     -> Groq (default; free tier is capped at 8K tokens/min) needs GROQ_API_KEY
Optional: GEMINI_MODEL (default gemini-2.5-flash), GROQ_MODEL (default openai/gpt-oss-20b)
"""
import functools
import os

import httpx
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def provider() -> str:
    return os.environ.get("LLM_PROVIDER", "groq").strip().lower()


def _is_rate_limit_error(err: BaseException) -> bool:
    text = str(err).lower()
    return (
        "429" in text
        or "rate_limit" in text
        or "rate limit" in text
        or "resource_exhausted" in text
        or "503" in text
        or "unavailable" in text
        or "overloaded" in text
    )


def _is_quota_exhausted(err: BaseException) -> bool:
    """Daily/free-tier quota is spent — retrying the SAME provider is pointless, so we
    fail fast and fall back to the other provider instead of backing off in place."""
    text = str(err).lower()
    return "exceeded your current quota" in text or "perday" in text or "per day" in text or "quota exceeded" in text


def _should_retry_same_provider(err: BaseException) -> bool:
    return _is_rate_limit_error(err) and not _is_quota_exhausted(err)


@functools.lru_cache(maxsize=1)
def _groq_client():
    from langchain_groq import ChatGroq

    model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
    extra = {"reasoning_effort": "low"} if model.startswith("openai/gpt-oss") else {}
    return ChatGroq(
        model=model,
        api_key=os.environ["GROQ_API_KEY"],
        max_tokens=3000,
        max_retries=0,
        timeout=60,
        **extra,
    )


def _groq_chat(messages: list, max_tokens: int | None) -> str:
    llm = _groq_client()
    if max_tokens:
        llm = llm.bind(max_tokens=max_tokens)
    return llm.invoke(messages).content


def _gemini_chat(messages: list, max_tokens: int | None) -> str:
    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    contents = [
        {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
        for m in messages
        if m["role"] != "system"
    ]
    generation_config = {"temperature": 0, "maxOutputTokens": max_tokens or 8192}
    if "flash" in model and "image" not in model and "tts" not in model:
        generation_config["thinkingConfig"] = {"thinkingBudget": 0}  # no hidden reasoning tokens eating the answer
    body = {"contents": contents, "generationConfig": generation_config}
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}

    resp = httpx.post(
        GEMINI_URL.format(model=model),
        headers={"x-goog-api-key": os.environ["GEMINI_API_KEY"], "Content-Type": "application/json"},
        json=body,
        timeout=90,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"Gemini error {resp.status_code}: {resp.text[:300]}")
    candidates = resp.json().get("candidates") or [{}]
    parts = (candidates[0].get("content") or {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts)


_retry_provider = retry(
    retry=retry_if_exception(_should_retry_same_provider),
    wait=wait_exponential(multiplier=2, min=2, max=30),
    stop=stop_after_attempt(5),
    reraise=True,
)


@_retry_provider
def _gemini_with_retry(messages: list, max_tokens: int | None) -> str:
    return _gemini_chat(messages, max_tokens)


@_retry_provider
def _groq_with_retry(messages: list, max_tokens: int | None) -> str:
    return _groq_chat(messages, max_tokens)


def chat(messages: list, max_tokens: int | None = None) -> str:
    """messages: [{"role": "system"|"user"|"assistant", "content": str}, ...] -> reply text.
    Each provider retries with backoff on transient rate limits (429/503). If the primary
    provider is Gemini and it fails (quota spent or errors persist), we fall back to Groq."""
    if provider() == "gemini":
        try:
            return _gemini_with_retry(messages, max_tokens)
        except Exception as err:  # noqa: BLE001 — fall back to the other provider
            print(f"[llm] Gemini unavailable ({str(err)[:140]}); falling back to Groq")
            return _groq_with_retry(messages, max_tokens)
    return _groq_with_retry(messages, max_tokens)