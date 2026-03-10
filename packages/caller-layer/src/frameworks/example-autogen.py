"""
STEM Agent — AutoGen Integration Example

Demonstrates how to use the STEM Agent as a tool within a Microsoft AutoGen
multi-agent workflow (AutoGen >= 0.7).

Prerequisites:
    pip install autogen-agentchat autogen-ext httpx

Usage:
    export STEM_AGENT_URL=http://localhost:8000
    python example-autogen.py
"""

import asyncio
import os

import httpx

# STEM Agent endpoint
STEM_URL = os.getenv("STEM_AGENT_URL", "http://localhost:8000")


# ---------------------------------------------------------------------------
# 1. Define a simple wrapper that calls the STEM agent REST API
# ---------------------------------------------------------------------------

async def call_stem_agent(message: str, caller_id: str = "autogen") -> str:
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
# 2. AutoGen integration (requires autogen-agentchat >= 0.7)
# ---------------------------------------------------------------------------

async def main() -> None:
    try:
        from autogen_agentchat.agents import AssistantAgent
        from autogen_agentchat.teams import RoundRobinGroupChat
        from autogen_agentchat.conditions import TextMentionTermination
        from autogen_ext.models.openai import OpenAIChatCompletionClient
    except ImportError:
        print("AutoGen not installed. Install with:")
        print("  pip install autogen-agentchat autogen-ext")
        print()
        print("Running STEM agent call directly instead...")
        result = await call_stem_agent("What is 2 + 2?")
        print(f"STEM Agent response: {result}")
        return

    # Create a model client (or use any LLM backend)
    model_client = OpenAIChatCompletionClient(model="gpt-4o-mini")

    # Create an assistant that delegates complex tasks to STEM Agent
    assistant = AssistantAgent(
        name="coordinator",
        model_client=model_client,
        system_message=(
            "You coordinate tasks. For complex analysis, call the "
            "stem_agent tool. Summarize the results."
        ),
        tools=[call_stem_agent],
    )

    # Run a simple single-turn interaction
    termination = TextMentionTermination("TERMINATE")
    team = RoundRobinGroupChat([assistant], termination_condition=termination)

    result = await team.run(task="Analyze the pros and cons of microservices architecture.")
    print("=== AutoGen + STEM Agent Result ===")
    for msg in result.messages:
        print(f"[{msg.source}] {msg.content[:200]}")


if __name__ == "__main__":
    asyncio.run(main())
