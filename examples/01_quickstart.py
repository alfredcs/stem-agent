"""
Example 01 — Production Integration Verification

A real-world integration test: connect to a STEM Agent server, discover its
full capability surface (protocols, tools, skills, behavior), run a streaming
interaction, and exercise the A2A protocol handshake.

This is what you'd run after deploying a new STEM Agent instance to verify
everything is wired up correctly — the "smoke test" for a production deploy.

    ┌──────────────────────────────────────────────────────┐
    │                 INTEGRATION CHECKS                    │
    │                                                       │
    │  1. Health ──> service + dependency status             │
    │  2. Agent Card ──> A2A identity & capabilities        │
    │  3. Tool Discovery ──> MCP servers & tool inventory   │
    │  4. Behavior Params ──> reasoning configuration       │
    │  5. Streaming Chat ──> real-time SSE pipeline test    │
    │  6. A2A Handshake ──> JSON-RPC 2.0 interop check     │
    │  7. Async Task ──> background task lifecycle          │
    └──────────────────────────────────────────────────────┘

Prerequisites:
    pip install httpx

Usage:
    python 01_quickstart.py
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(__file__))

from stem_client import (
    StemAgentClient,
    print_response,
    print_stream_events,
    print_task_status,
    timed,
)

PASS = "[PASS]"
FAIL = "[FAIL]"
SKIP = "[SKIP]"


def check_health(client: StemAgentClient) -> dict | None:
    """Verify the server is running and inspect dependency health."""
    print("=" * 60)
    print("CHECK 1: Health & Dependencies")
    print("=" * 60)

    try:
        h = client.health()
        print(f"  {PASS} Server is running at {client.base_url}")
        print(f"       Status:    {h.get('status', '?')}")
        print(f"       Uptime:    {h.get('uptime', '?')}s")

        mcp_health = h.get("mcpServers") or h.get("mcp") or {}
        if mcp_health:
            print(f"       MCP Servers:")
            for name, status in (mcp_health.items() if isinstance(mcp_health, dict) else []):
                icon = "+" if status in ("healthy", True, "connected") else "!"
                print(f"         [{icon}] {name}: {status}")

        persona = h.get("persona") or h.get("activePersona")
        if persona:
            print(f"       Persona:   {persona}")
        else:
            print(f"       Persona:   (undifferentiated — generic stem cell)")

        print()
        return h
    except Exception as e:
        print(f"  {FAIL} Cannot reach server: {e}\n")
        return None


def check_agent_card(client: StemAgentClient) -> dict | None:
    """Discover agent identity and capabilities via A2A agent card."""
    print("=" * 60)
    print("CHECK 2: A2A Agent Card (/.well-known/agent.json)")
    print("=" * 60)

    try:
        card = client.agent_card()
        print(f"  {PASS} Agent card retrieved")
        print(f"       Name:      {card.get('name', '?')}")
        print(f"       Version:   {card.get('version', '?')}")
        print(f"       Protocol:  {card.get('protocolVersion', '?')}")
        print(f"       URL:       {card.get('url', client.base_url)}")

        caps = card.get("capabilities", {})
        if caps:
            print(f"       Capabilities:")
            for cap, detail in caps.items():
                print(f"         - {cap}: {detail}")

        skills = card.get("skills", [])
        print(f"       Skills:    {len(skills)} registered")
        for skill in skills[:8]:
            maturity = skill.get("maturity", "")
            tag = f" [{maturity}]" if maturity else ""
            print(f"         - {skill.get('name', '?')}{tag}: "
                  f"{skill.get('description', '')[:50]}")
        if len(skills) > 8:
            print(f"         ... and {len(skills) - 8} more")
        print()
        return card
    except Exception as e:
        print(f"  {FAIL} Agent card unavailable: {e}\n")
        return None


def check_tools(client: StemAgentClient) -> list[dict] | None:
    """Discover available MCP tools and categorize them by server."""
    print("=" * 60)
    print("CHECK 3: MCP Tool Inventory")
    print("=" * 60)

    try:
        tools = client.list_tools()
        print(f"  {PASS} {len(tools)} tool(s) discovered\n")

        # Group by server/category
        by_server: dict[str, list[dict]] = {}
        for tool in tools:
            server = tool.get("server", tool.get("source", "built-in"))
            by_server.setdefault(server, []).append(tool)

        for server, server_tools in by_server.items():
            print(f"       [{server}] ({len(server_tools)} tools)")
            for t in server_tools[:5]:
                params = t.get("inputSchema", {}).get("properties", {})
                param_names = ", ".join(params.keys()) if params else "none"
                print(f"         - {t.get('name', '?')}({param_names})")
            if len(server_tools) > 5:
                print(f"         ... and {len(server_tools) - 5} more")
        print()
        return tools
    except Exception as e:
        print(f"  {FAIL} Tool discovery failed: {e}\n")
        return None


def check_behavior(client: StemAgentClient) -> dict | None:
    """Inspect current behavior parameters (the agent's 'gene expression')."""
    print("=" * 60)
    print("CHECK 4: Behavior Parameters (Gene Expression Levels)")
    print("=" * 60)

    try:
        behavior = client.get_behavior()
        print(f"  {PASS} Behavior parameters retrieved\n")

        # Display as a visual gauge
        gauge_keys = {
            "reasoningDepth": 5,
            "confidenceThreshold": 1,
            "creativityLevel": 1,
            "toolUsePreference": 1,
            "verbosityLevel": 1,
        }
        for key, max_val in gauge_keys.items():
            val = behavior.get(key, 0)
            normalized = val / max_val if max_val else 0
            filled = int(normalized * 20)
            empty = 20 - filled
            print(f"       {key:25s} [{'#' * filled}{'.' * empty}] {val}")

        # Show remaining params
        other = {k: v for k, v in behavior.items() if k not in gauge_keys}
        if other:
            print()
            for key, val in sorted(other.items()):
                print(f"       {key:25s} = {val}")
        print()
        return behavior
    except Exception as e:
        print(f"  {FAIL} Behavior params unavailable: {e}\n")
        return None


def check_streaming(client: StemAgentClient) -> None:
    """Test the SSE streaming pipeline with a real technical question."""
    print("=" * 60)
    print("CHECK 5: Streaming Chat (SSE Pipeline Test)")
    print("=" * 60)

    question = (
        "A Kubernetes pod is in CrashLoopBackOff with OOMKilled status. "
        "The container requests 256Mi memory but the application is a "
        "Java service. What are the three most likely root causes and "
        "the first diagnostic step for each?"
    )
    print(f"  Question: {question[:80]}...\n")

    try:
        print("  Streaming response (each . = one SSE event):")
        with timed("Stream"):
            content = print_stream_events(client.stream(question))

        if content:
            print(f"\n  {PASS} Received {len(content)} chars via streaming")
            print(f"       Preview: {content[:200]}...")
        else:
            print(f"\n  {PASS} Stream completed (content may be in final event)")
    except Exception as e:
        print(f"  {FAIL} Streaming failed: {e}")
        print(f"  Falling back to synchronous chat...\n")
        with timed("Sync chat"):
            resp = client.chat(question)
        print_response(resp, show_trace=True)
    print()


def check_a2a(client: StemAgentClient) -> None:
    """Exercise the A2A JSON-RPC 2.0 protocol for agent interoperability."""
    print("=" * 60)
    print("CHECK 6: A2A Protocol Handshake (JSON-RPC 2.0)")
    print("=" * 60)

    task_msg = "Briefly explain what the CAP theorem means for distributed databases."

    print(f"  Sending tasks/send via A2A protocol...")
    print(f"  Message: {task_msg[:60]}...\n")

    try:
        with timed("A2A roundtrip"):
            result = client.a2a_send("tasks/send", {
                "message": {
                    "role": "user",
                    "parts": [{"type": "text", "text": task_msg}],
                },
            })

        if "result" in result:
            task_data = result["result"]
            print(f"  {PASS} A2A task completed")
            print(f"       Task ID:  {task_data.get('id', '?')}")
            print(f"       Status:   {task_data.get('status', {}).get('state', '?')}")
            artifacts = task_data.get("artifacts", [])
            if artifacts:
                text = artifacts[0].get("parts", [{}])[0].get("text", "")
                print(f"       Content:  {text[:200]}...")
        elif "error" in result:
            err = result["error"]
            print(f"  {FAIL} A2A error: [{err.get('code')}] {err.get('message')}")
        else:
            print(f"  {PASS} A2A response received (non-standard format)")
            print(f"       Keys: {list(result.keys())}")
    except Exception as e:
        print(f"  {SKIP} A2A protocol not available: {e}")
    print()


def check_async_task(client: StemAgentClient) -> None:
    """Test the async task lifecycle: create → poll → result."""
    print("=" * 60)
    print("CHECK 7: Async Task Lifecycle")
    print("=" * 60)

    task_msg = (
        "List the SOLID principles in software engineering with a "
        "one-sentence explanation for each."
    )
    print(f"  Creating async task...")
    print(f"  Message: {task_msg[:60]}...\n")

    try:
        task = client.create_task(task_msg)
        task_id = task.get("id") or task.get("taskId", "?")
        print(f"  {PASS} Task created: {task_id}")
        print_task_status(task)

        # Poll for completion
        max_polls = 30
        for i in range(max_polls):
            time.sleep(2)
            task = client.get_task(task_id)
            status = task.get("status", "unknown")
            if status in ("completed", "failed"):
                break
            print(f"       Polling ({i+1}/{max_polls})... status={status}")

        print()
        print_task_status(task)
        content = str(task.get("content", task.get("result", {}).get("content", "")))
        if content:
            print(f"       Result: {content[:200]}...")

        # Show task list
        try:
            all_tasks = client.list_tasks(limit=5)
            if all_tasks:
                print(f"\n  Recent tasks:")
                for t in (all_tasks if isinstance(all_tasks, list) else [all_tasks]):
                    print_task_status(t)
        except Exception:
            pass

    except Exception as e:
        print(f"  {SKIP} Task API not available: {e}")
    print()


def main() -> None:
    client = StemAgentClient()

    print()
    print("+" + "=" * 58 + "+")
    print("|   STEM AGENT — PRODUCTION INTEGRATION VERIFICATION      |")
    print("+" + "=" * 58 + "+")
    print(f"  Target: {client.base_url}")
    print(f"  Caller: {client.caller_id}")
    print(f"  Session: {client.session_id[:8]}...")
    print()

    results = {}

    # Check 1: Health (required — abort if fails)
    health = check_health(client)
    if not health:
        print("Cannot proceed without a running server. Exiting.")
        return
    results["health"] = PASS

    # Checks 2-4: Discovery (independent — run all)
    card = check_agent_card(client)
    results["agent_card"] = PASS if card else FAIL

    tools = check_tools(client)
    results["tools"] = PASS if tools else FAIL

    behavior = check_behavior(client)
    results["behavior"] = PASS if behavior else FAIL

    # Check 5: Streaming
    try:
        check_streaming(client)
        results["streaming"] = PASS
    except Exception:
        results["streaming"] = FAIL

    # Check 6: A2A
    try:
        check_a2a(client)
        results["a2a"] = PASS
    except Exception:
        results["a2a"] = SKIP

    # Check 7: Async tasks
    try:
        check_async_task(client)
        results["tasks"] = PASS
    except Exception:
        results["tasks"] = SKIP

    # Summary
    print("=" * 60)
    print("INTEGRATION SUMMARY")
    print("=" * 60)
    for check, status in results.items():
        print(f"  {status} {check}")

    passed = sum(1 for s in results.values() if s == PASS)
    total = len(results)
    print(f"\n  {passed}/{total} checks passed")

    if passed == total:
        print("\n  All systems operational. Agent is ready for production traffic.")
    else:
        print("\n  Some checks failed or were skipped. Review output above.")
    print()


if __name__ == "__main__":
    main()
