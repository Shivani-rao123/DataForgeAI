"""
LangGraph wiring: Planner Agent -> Source-Discovery Agent.

This is the graph-based equivalent of the manual "call planner, then pass its
output to source_discovery" flow in the Node version — LangGraph tracks the
shared state across nodes for us instead of us threading it through by hand.
"""
from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from app.agents.planner import plan_workflow
from app.agents.source_discovery import discover_sources
from app.schemas import ResolvedWorkflowSpec, WorkflowSpec


class GraphState(TypedDict):
    prompt: str
    spec: Optional[WorkflowSpec]
    resolved_spec: Optional[ResolvedWorkflowSpec]
    error: Optional[str]


def planner_node(state: GraphState) -> GraphState:
    try:
        spec = plan_workflow(state["prompt"])
        return {**state, "spec": spec}
    except Exception as err:  # noqa: BLE001 — surface any planner failure into state
        return {**state, "error": f"Planner failed: {err}"}


def source_discovery_node(state: GraphState) -> GraphState:
    if state.get("error"):
        return state  # short-circuit if planner already failed
    try:
        resolved = discover_sources(state["spec"])
        return {**state, "resolved_spec": resolved}
    except Exception as err:  # noqa: BLE001
        return {**state, "error": f"Source-Discovery failed: {err}"}


def build_graph():
    graph = StateGraph(GraphState)
    graph.add_node("planner", planner_node)
    graph.add_node("source_discovery", source_discovery_node)

    graph.set_entry_point("planner")
    graph.add_edge("planner", "source_discovery")
    graph.add_edge("source_discovery", END)

    return graph.compile()


# Compiled once at import time, reused across requests.
workflow_graph = build_graph()


def run_workflow(prompt: str) -> GraphState:
    """Runs the full Planner -> Source-Discovery pipeline for a given prompt."""
    return workflow_graph.invoke({"prompt": prompt, "spec": None, "resolved_spec": None, "error": None})
