"""
STEM Agent Python Client

Lightweight httpx-based client for the STEM Agent REST API.
Used by all examples in this directory.

Usage:
    from stem_client import StemAgentClient

    client = StemAgentClient()
    if client.ensure_running():
        response = client.chat("Hello, STEM Agent!")
        print_response(response)

Environment:
    STEM_AGENT_URL  — Agent base URL (default: http://localhost:8000)
    STEM_CALLER_ID  — Default caller identity (default: python-examples)
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import time
from contextlib import contextmanager
from typing import Any, Generator, Iterator
from uuid import uuid4

import httpx


# ---------------------------------------------------------------------------
# Client
# ---------------------------------------------------------------------------

class StemAgentClient:
    """Synchronous + async client for the STEM Agent REST API."""

    def __init__(
        self,
        base_url: str | None = None,
        caller_id: str | None = None,
        session_id: str | None = None,
        timeout: float = 120,
    ) -> None:
        self.base_url = (base_url or os.getenv("STEM_AGENT_URL", "http://localhost:8000")).rstrip("/")
        self.caller_id = caller_id or os.getenv("STEM_CALLER_ID", "python-examples")
        self.session_id = session_id or str(uuid4())
        self.timeout = timeout

    # -- Health & discovery ---------------------------------------------------

    def health(self) -> dict:
        """GET /api/v1/health"""
        r = httpx.get(f"{self.base_url}/api/v1/health", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def agent_card(self) -> dict:
        """GET /.well-known/agent.json — A2A agent card."""
        r = httpx.get(f"{self.base_url}/.well-known/agent.json", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def list_tools(self) -> list[dict]:
        """GET /api/v1/mcp/tools — available MCP tools."""
        r = httpx.get(f"{self.base_url}/api/v1/mcp/tools", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def get_behavior(self) -> dict:
        """GET /api/v1/behavior — current behavior parameters."""
        r = httpx.get(f"{self.base_url}/api/v1/behavior", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def get_profile(self, caller_id: str | None = None) -> dict:
        """GET /api/v1/profile/:id — caller profile."""
        cid = caller_id or self.caller_id
        r = httpx.get(f"{self.base_url}/api/v1/profile/{cid}", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    # -- Chat -----------------------------------------------------------------

    def chat(
        self,
        message: str,
        *,
        caller_id: str | None = None,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> dict:
        """POST /api/v1/chat — synchronous one-shot chat."""
        body: dict[str, Any] = {
            "message": message,
            "callerId": caller_id or self.caller_id,
            "sessionId": session_id or self.session_id,
        }
        if metadata:
            body["metadata"] = metadata
        r = httpx.post(f"{self.base_url}/api/v1/chat", json=body, timeout=timeout or self.timeout)
        r.raise_for_status()
        return r.json()

    def stream(
        self,
        message: str,
        *,
        caller_id: str | None = None,
    ) -> Iterator[dict]:
        """POST /api/v1/chat/stream — SSE streaming. Yields parsed events."""
        body: dict[str, Any] = {
            "message": message,
            "callerId": caller_id or self.caller_id,
            "sessionId": self.session_id,
        }
        with httpx.stream("POST", f"{self.base_url}/api/v1/chat/stream", json=body, timeout=self.timeout) as r:
            r.raise_for_status()
            for line in r.iter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        return
                    try:
                        yield json.loads(data)
                    except json.JSONDecodeError:
                        continue

    # -- Tasks ----------------------------------------------------------------

    def create_task(self, message: str, **kwargs: Any) -> dict:
        """POST /api/v1/tasks — create async task."""
        body: dict[str, Any] = {"message": message, "callerId": self.caller_id, **kwargs}
        r = httpx.post(f"{self.base_url}/api/v1/tasks", json=body, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def get_task(self, task_id: str) -> dict:
        """GET /api/v1/tasks/:id"""
        r = httpx.get(f"{self.base_url}/api/v1/tasks/{task_id}", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def list_tasks(self, *, status: str | None = None, limit: int = 20) -> list[dict]:
        """GET /api/v1/tasks — list tasks with optional filter."""
        params: dict[str, Any] = {"limit": limit}
        if status:
            params["status"] = status
        r = httpx.get(f"{self.base_url}/api/v1/tasks", params=params, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    def cancel_task(self, task_id: str) -> dict:
        """POST /api/v1/tasks/:id/cancel"""
        r = httpx.post(f"{self.base_url}/api/v1/tasks/{task_id}/cancel", timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    # -- A2A protocol --------------------------------------------------------

    def a2a_send(self, method: str, params: dict) -> dict:
        """POST /a2a — JSON-RPC 2.0 agent-to-agent call."""
        body = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": method,
            "params": params,
        }
        r = httpx.post(f"{self.base_url}/a2a", json=body, timeout=self.timeout)
        r.raise_for_status()
        return r.json()

    # -- Async variants -------------------------------------------------------

    async def achat(
        self,
        message: str,
        *,
        caller_id: str | None = None,
        session_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict:
        """Async version of chat()."""
        body: dict[str, Any] = {
            "message": message,
            "callerId": caller_id or self.caller_id,
            "sessionId": session_id or self.session_id,
        }
        if metadata:
            body["metadata"] = metadata
        async with httpx.AsyncClient(timeout=self.timeout) as c:
            r = await c.post(f"{self.base_url}/api/v1/chat", json=body)
            r.raise_for_status()
            return r.json()

    async def acreate_task(self, message: str, **kwargs: Any) -> dict:
        """Async version of create_task()."""
        body: dict[str, Any] = {"message": message, "callerId": self.caller_id, **kwargs}
        async with httpx.AsyncClient(timeout=self.timeout) as c:
            r = await c.post(f"{self.base_url}/api/v1/tasks", json=body)
            r.raise_for_status()
            return r.json()

    async def aget_task(self, task_id: str) -> dict:
        """Async version of get_task()."""
        async with httpx.AsyncClient(timeout=self.timeout) as c:
            r = await c.get(f"{self.base_url}/api/v1/tasks/{task_id}")
            r.raise_for_status()
            return r.json()

    # -- Connection helpers ---------------------------------------------------

    def ensure_running(self) -> bool:
        """Check if the STEM agent server is reachable. Print help if not."""
        try:
            self.health()
            print(f"[OK] STEM Agent is running at {self.base_url}")
            return True
        except (httpx.ConnectError, httpx.TimeoutException):
            print(f"[ERROR] Cannot reach STEM Agent at {self.base_url}")
            print()
            print("Start the server with one of:")
            print("  cd stem-agent && npm run build && npm start")
            print("  cd stem-agent && docker compose --profile prod up -d")
            print()
            print("Or set STEM_AGENT_URL to point to a running instance:")
            print("  export STEM_AGENT_URL=http://your-host:8000")
            return False

    def wait_for_server(self, max_retries: int = 10, delay: float = 2.0) -> bool:
        """Block until the server is reachable or retries exhausted."""
        for i in range(max_retries):
            try:
                self.health()
                return True
            except (httpx.ConnectError, httpx.TimeoutException):
                if i < max_retries - 1:
                    time.sleep(delay)
        return False


# ---------------------------------------------------------------------------
# Display utilities
# ---------------------------------------------------------------------------

def print_response(response: dict, *, show_trace: bool = True, max_content: int = 500) -> None:
    """Pretty-print a STEM Agent chat response."""
    status = response.get("status", "unknown")
    content = str(response.get("content", ""))
    trace = response.get("reasoningTrace") or response.get("reasoning_trace") or []

    status_icon = {"completed": "+", "failed": "!", "in_progress": "~"}.get(status, "?")
    print(f"[{status_icon}] Status: {status}")
    print(f"    Content: {content[:max_content]}{'...' if len(content) > max_content else ''}")

    if show_trace and trace:
        print(f"    Trace ({len(trace)} steps):")
        for step in trace[:5]:
            print(f"      - {step}")
        if len(trace) > 5:
            print(f"      ... and {len(trace) - 5} more")
    print()


def print_persona(persona: dict) -> None:
    """Pretty-print a DomainPersona configuration."""
    print(f"  Name:             {persona['name']}")
    print(f"  Strategy:         {persona.get('preferredStrategy', 'auto')}")
    behavior = persona.get("defaultBehavior", {})
    print(f"  Reasoning Depth:  {behavior.get('reasoningDepth', '-')}")
    print(f"  Creativity:       {behavior.get('creativityLevel', '-')}")
    print(f"  Tool Preference:  {behavior.get('toolUsePreference', '-')}")
    print(f"  Verbosity:        {behavior.get('verbosityLevel', '-')}")
    print(f"  Confidence:       {behavior.get('confidenceThreshold', '-')}")
    tags = persona.get("domainTags", [])
    print(f"  Domain Tags:      {', '.join(tags)}")
    forbidden = persona.get("forbiddenTopics", [])
    if forbidden:
        print(f"  Forbidden Topics: {', '.join(forbidden)}")
    tools = persona.get("toolAllowlist", [])
    if tools:
        print(f"  Tool Allowlist:   {', '.join(tools)}")
    print()


def print_stream_events(events: Iterator[dict]) -> str:
    """Display streaming SSE events with phase markers. Returns final content."""
    content_parts = []
    current_phase = None
    for event in events:
        phase = event.get("phase", "")
        if phase and phase != current_phase:
            current_phase = phase
            print(f"\n  [{phase.upper()}]", end=" ", flush=True)
        chunk = event.get("content") or event.get("delta", "")
        if chunk:
            content_parts.append(chunk)
            print(".", end="", flush=True)
    print()
    return "".join(content_parts)


def compare_responses(responses: list[dict], labels: list[str]) -> None:
    """Side-by-side comparison of multiple agent responses."""
    print("=" * 70)
    print("RESPONSE COMPARISON")
    print("=" * 70)
    for label, resp in zip(labels, responses):
        content = str(resp.get("content", ""))[:300]
        status = resp.get("status", "?")
        trace_len = len(resp.get("reasoningTrace") or resp.get("reasoning_trace") or [])
        word_count = len(str(resp.get("content", "")).split())
        print(f"\n--- {label} [{status}] ({trace_len} reasoning steps, {word_count} words) ---")
        print(content)
        if len(str(resp.get("content", ""))) > 300:
            print("...")
    print("\n" + "=" * 70)


def bar_chart(data: dict[str, dict[str, float]], width: int = 30) -> None:
    """ASCII bar chart comparing numeric fields across categories."""
    if not data:
        return
    categories = list(data.keys())
    fields = list(next(iter(data.values())).keys())

    for field in fields:
        print(f"\n  {field}:")
        max_val = max(data[cat].get(field, 0) for cat in categories)
        if max_val == 0:
            max_val = 1
        for cat in categories:
            val = data[cat].get(field, 0)
            bar_len = int((val / max_val) * width)
            bar = "#" * bar_len
            print(f"    {cat:22s} |{bar:<{width}s}| {val:.2f}")


def radar_text(persona: dict, width: int = 20) -> None:
    """Text-based radar chart showing persona behavior dimensions."""
    behavior = persona.get("defaultBehavior", {})
    dims = [
        ("Depth", behavior.get("reasoningDepth", 0) / 5),
        ("Confidence", behavior.get("confidenceThreshold", 0)),
        ("Creativity", behavior.get("creativityLevel", 0)),
        ("Tool Use", behavior.get("toolUsePreference", 0)),
        ("Verbosity", behavior.get("verbosityLevel", 0)),
    ]
    print(f"  {persona['name']}  [{persona.get('preferredStrategy', 'auto')}]")
    for label, val in dims:
        filled = int(val * width)
        empty = width - filled
        print(f"    {label:14s} [{'#' * filled}{'.' * empty}] {val:.1%}")


def print_task_status(task: dict) -> None:
    """Pretty-print a task's current state."""
    status = task.get("status", "unknown")
    task_id = task.get("id", task.get("taskId", "?"))
    icon = {"completed": "+", "failed": "!", "in_progress": "~", "pending": " ", "cancelled": "x"}.get(status, "?")
    content = str(task.get("content", task.get("message", "")))[:80]
    print(f"  [{icon}] {task_id[:8]}  {status:12s}  {content}")


@contextmanager
def timed(label: str) -> Generator[None, None, None]:
    """Context manager that prints elapsed time."""
    start = time.perf_counter()
    yield
    elapsed = time.perf_counter() - start
    print(f"  [{label}] {elapsed:.2f}s")


def timing_chart(results: list[dict], name_key: str = "name", time_key: str = "elapsed") -> None:
    """Horizontal bar chart of timing results."""
    if not results:
        return
    max_t = max(r[time_key] for r in results)
    if max_t == 0:
        max_t = 1
    for r in results:
        bar_len = int((r[time_key] / max_t) * 30)
        bar = "#" * bar_len
        print(f"    {r[name_key]:22s} |{bar:<30s}| {r[time_key]:.2f}s")
