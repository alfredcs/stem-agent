"""
Example 01 — Quickstart

The simplest STEM Agent interaction: check health, inspect the agent card,
send a single message, and display the response with its reasoning trace.

Prerequisites:
    pip install httpx
    # Start the STEM Agent server (see README.md)

Usage:
    python 01_quickstart.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import StemAgentClient, print_response


def main() -> None:
    client = StemAgentClient()

    # ── Step 1: Health check ──────────────────────────────────────────────
    print("=" * 60)
    print("STEP 1: Health Check")
    print("=" * 60)

    if not client.ensure_running():
        return

    # ── Step 2: Agent card (undifferentiated stem cell) ───────────────────
    print("=" * 60)
    print("STEP 2: Agent Card (the undifferentiated stem cell)")
    print("=" * 60)

    card = client.agent_card()
    print(f"  Agent:    {card.get('name', 'unknown')}")
    print(f"  Version:  {card.get('version', '?')}")
    print(f"  Protocol: {card.get('protocolVersion', '?')}")
    skills = card.get("skills", [])
    print(f"  Skills:   {len(skills)} available")
    for skill in skills[:5]:
        print(f"    - {skill.get('name', '?')}: {skill.get('description', '')[:60]}")
    if len(skills) > 5:
        print(f"    ... and {len(skills) - 5} more")
    print()

    # ── Step 3: Send a message ────────────────────────────────────────────
    print("=" * 60)
    print("STEP 3: Send a Message")
    print("=" * 60)

    question = "What are the three laws of thermodynamics? Explain briefly."
    print(f"  Question: {question}\n")

    response = client.chat(question)
    print_response(response)

    # ── Step 4: Behavior parameters ───────────────────────────────────────
    print("=" * 60)
    print("STEP 4: Default Behavior Parameters")
    print("=" * 60)
    print("  These are the agent's current behavior settings.")
    print("  They change when the agent is differentiated with a persona.\n")

    try:
        behavior = client.get_behavior()
        for key, value in sorted(behavior.items()):
            print(f"    {key:30s} = {value}")
    except Exception as e:
        print(f"  (Could not fetch behavior: {e})")

    print()

    # ── Step 5: Available tools ───────────────────────────────────────────
    print("=" * 60)
    print("STEP 5: Available MCP Tools")
    print("=" * 60)

    try:
        tools = client.list_tools()
        print(f"  {len(tools)} tool(s) discovered:\n")
        for tool in tools:
            print(f"    - {tool.get('name', '?')}: {tool.get('description', '')[:60]}")
    except Exception as e:
        print(f"  (Could not list tools: {e})")

    print("\n  Done! Try the other examples to see cell differentiation in action.")


if __name__ == "__main__":
    main()
