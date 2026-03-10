"""
STEM Agent — LangGraph Integration Example

Demonstrates how to use the STEM Agent as a tool node within a LangGraph
stateful graph (LangGraph >= 1.0).

Prerequisites:
    pip install langgraph langchain-core httpx

Usage:
    export STEM_AGENT_URL=http://localhost:8000
    python example-langgraph.py
"""

import asyncio
import os

import httpx

# STEM Agent endpoint
STEM_URL = os.getenv("STEM_AGENT_URL", "http://localhost:8000")


# ---------------------------------------------------------------------------
# 1. Async STEM Agent wrapper
# ---------------------------------------------------------------------------

async def call_stem_agent(message: str, caller_id: str = "langgraph") -> str:
    """Send a task to the STEM Agent and return the response content."""
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{STEM_URL}/api/v1/chat",
            json={"message": message, "caller_id": caller_id},
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data.get("content", ""))


# ---------------------------------------------------------------------------
# 2. LangGraph integration
# ---------------------------------------------------------------------------

async def main() -> None:
    try:
        from langgraph.graph import StateGraph, START, END
        from typing import TypedDict
    except ImportError:
        print("LangGraph not installed. Install with:")
        print("  pip install langgraph langchain-core")
        print()
        print("Running STEM agent call directly instead...")
        result = await call_stem_agent("Explain the CAP theorem.")
        print(f"STEM Agent response: {result}")
        return

    # Define state schema
    class GraphState(TypedDict):
        query: str
        stem_response: str
        summary: str

    # Node: call STEM Agent
    async def stem_node(state: GraphState) -> GraphState:
        response = await call_stem_agent(state["query"])
        return {**state, "stem_response": response}

    # Node: summarize (in practice, you'd use an LLM here)
    async def summarize_node(state: GraphState) -> GraphState:
        # Simple passthrough — replace with LLM summarization
        summary = f"Summary of STEM Agent response:\n{state['stem_response'][:500]}"
        return {**state, "summary": summary}

    # Build the graph
    graph = StateGraph(GraphState)
    graph.add_node("stem_agent", stem_node)
    graph.add_node("summarize", summarize_node)
    graph.add_edge(START, "stem_agent")
    graph.add_edge("stem_agent", "summarize")
    graph.add_edge("summarize", END)

    app = graph.compile()

    # Run
    result = await app.ainvoke({
        "query": "Explain the CAP theorem and its implications for distributed databases.",
        "stem_response": "",
        "summary": "",
    })

    print("=== LangGraph + STEM Agent Result ===")
    print(result["summary"])


if __name__ == "__main__":
    asyncio.run(main())
