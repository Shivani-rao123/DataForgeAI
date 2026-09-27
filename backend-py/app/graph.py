"""
LangGraph wiring, extended with the Data-agent stage:
Planner -> Source-Discovery -> Extraction -> Critic (heals failing sources) -> Validator -> END
"""
from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from app.agents.critic import check_health, heal_and_retry
from app.agents.extraction import extract_all
from app.agents.planner import plan_workflow
from app.agents.source_discovery import discover_sources
from app.agents.validator import validate_and_dedupe
from app.schemas import ResolvedWorkflowSpec, SourceExtractionResult, ValidatedResult, WorkflowSpec


class GraphState(TypedDict):
    prompt: str
    spec: Optional[WorkflowSpec]
    resolved_spec: Optional[ResolvedWorkflowSpec]
    extraction_results: Optional[list]
    validated_result: Optional[ValidatedResult]
    error: Optional[str]


def planner_node(state: GraphState) -> GraphState:
    try:
        spec = plan_workflow(state["prompt"])
        return {**state, "spec": spec}
    except Exception as err:  # noqa: BLE001
        return {**state, "error": f"Planner failed: {err}"}


def source_discovery_node(state: GraphState) -> GraphState:
    if state.get("error"):
        return state
    try:
        resolved = discover_sources(state["spec"])
        return {**state, "resolved_spec": resolved}
    except Exception as err:  # noqa: BLE001
        return {**state, "error": f"Source-Discovery failed: {err}"}


def extraction_node(state: GraphState) -> GraphState:
    if state.get("error"):
        return state
    try:
        results = extract_all(state["resolved_spec"])
        return {**state, "extraction_results": results}
    except Exception as err:  # noqa: BLE001
        return {**state, "error": f"Extraction failed: {err}"}


def critic_node(state: GraphState) -> GraphState:
    """Checks each source's health; heals + retries once for any source that's failing."""
    if state.get("error") or not state.get("extraction_results"):
        return state

    fields = state["spec"].fields
    resolved_sources = state["resolved_spec"].sources  # same order/length as extraction_results
    healed_results: list[SourceExtractionResult] = []

    for result, resolved_source in zip(state["extraction_results"], resolved_sources):
        report = check_health(result, fields)
        if not report.needs_healing or not resolved_source.resolved:
            healed_results.append(result)
            continue

        # Retry against a real URL we actually fetched for this source —
        # query_or_url is the search query text, not a fetchable page.
        retry_url = resolved_source.resolved[0].url
        healing = heal_and_retry(retry_url, fields, result.records)
        healed_results.append(
            SourceExtractionResult(
                query_or_url=result.query_or_url,
                records=result.records + healing.recovered_records,
                fetch_errors=result.fetch_errors + ([healing.diagnosis] if healing.diagnosis else []),
            )
        )

    return {**state, "extraction_results": healed_results}


def validator_node(state: GraphState) -> GraphState:
    if state.get("error") or not state.get("extraction_results"):
        return state
    try:
        all_records = [r for result in state["extraction_results"] for r in result.records]
        validated = validate_and_dedupe(all_records, state["spec"].validation_rules)
        return {**state, "validated_result": validated}
    except Exception as err:  # noqa: BLE001
        return {**state, "error": f"Validator failed: {err}"}


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("planner", planner_node)
    graph.add_node("source_discovery", source_discovery_node)
    graph.add_node("extraction", extraction_node)
    graph.add_node("critic", critic_node)
    graph.add_node("validator", validator_node)

    graph.set_entry_point("planner")
    graph.add_edge("planner", "source_discovery")
    graph.add_edge("source_discovery", "extraction")
    graph.add_edge("extraction", "critic")
    graph.add_edge("critic", "validator")
    graph.add_edge("validator", END)

    return graph.compile()


workflow_graph = build_graph()


def run_workflow(prompt: str) -> GraphState:
    """Runs the full Planner -> Source-Discovery -> Extraction -> Critic -> Validator pipeline."""
    return workflow_graph.invoke(
        {
            "prompt": prompt,
            "spec": None,
            "resolved_spec": None,
            "extraction_results": None,
            "validated_result": None,
            "error": None,
        }
    )