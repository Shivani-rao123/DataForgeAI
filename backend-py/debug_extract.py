main.py"""
Debug helper: runs Planner -> Discovery -> Extraction for one prompt and prints
per-URL diagnostics, so you can see exactly where records get lost.

Usage (from backend-py, venv active):
    python debug_extract.py "your prompt here" [max_urls_per_source]
    python debug_extract.py --full "your prompt here"   # full pipeline + match_status per record
"""
import sys

from dotenv import load_dotenv

load_dotenv()

from app.agents import extraction as ex
from app.agents.planner import plan_workflow
from app.agents.source_discovery import discover_sources

args = [a for a in sys.argv[1:] if a != "--full"]
full_mode = "--full" in sys.argv
prompt = args[0]
max_urls = int(args[1]) if len(args) > 1 else 2

if full_mode:
    # Runs Planner -> Discovery -> Extraction -> Critic -> Validator and shows the
    # verified records, including the keep-if-unsure match_status/reason tags.
    from app.graph import run_workflow

    state = run_workflow(prompt)
    if state.get("error"):
        print("PIPELINE ERROR:", state["error"])
        sys.exit(1)
    spec = state["spec"]
    print("GOAL  :", spec.goal)
    print("FIELDS:", spec.fields)
    for s in spec.sources:
        c = s.connector
        print("SOURCE:", s.type, "|", (f"{c.provider}/{c.company or c.keywords}" if c else s.query_or_url))
    records = state["validated_result"].clean_records
    print(f"\n=== {len(records)} verified records "
          f"({sum(1 for r in records if r.match_status == 'unconfirmed')} unconfirmed)")
    for r in records:
        print(f"  [{r.match_status}] {r.data}")
        if r.match_reason:
            print(f"       reason: {r.match_reason}")
    sys.exit(0)


spec = plan_workflow(prompt)
print("GOAL  :", spec.goal)
print("FIELDS:", spec.fields)
for s in spec.sources:
    print("QUERY :", s.type, "|", s.query_or_url)

resolved = discover_sources(spec)
for src in resolved.sources:
    print("\n=== SOURCE:", src.query_or_url, f"({len(src.resolved)} urls)")
    for res in src.resolved[:max_urls]:
        print(f"\n--- {res.url}\n    tavily raw_content: {len(res.raw_content or '')} chars")
        try:
            text = ex.get_page_text(res)
        except Exception as err:  # noqa: BLE001
            print("    FETCH FAILED:", err)
            continue
        print(f"    text sent to LLM: {len(text)} chars")
        if not text.strip():
            print("    EMPTY TEXT")
            continue
        try:
            recs = ex.extract_records_from_text(text, spec.fields, spec.goal)
        except Exception as err:  # noqa: BLE001
            print("    LLM FAILED:", err)
            continue
        print(f"    LLM returned {len(recs)} records")
        for r in recs[:5]:
            data = ex._ground(r.get("data", {}), text)
            filled = sum(1 for f in spec.fields if data.get(f))
            print(f"      filled {filled}/{len(spec.fields)}:", data)