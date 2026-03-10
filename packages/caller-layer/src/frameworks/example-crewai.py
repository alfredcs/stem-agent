"""
STEM Agent — CrewAI Integration Example

Demonstrates how to use the STEM Agent as a tool within a CrewAI crew
(CrewAI >= 1.9).

Prerequisites:
    pip install crewai httpx

Usage:
    export STEM_AGENT_URL=http://localhost:8000
    python example-crewai.py
"""

import os

import httpx

# STEM Agent endpoint
STEM_URL = os.getenv("STEM_AGENT_URL", "http://localhost:8000")


# ---------------------------------------------------------------------------
# 1. Define a simple synchronous wrapper for the STEM Agent
# ---------------------------------------------------------------------------

def call_stem_agent(message: str, caller_id: str = "crewai") -> str:
    """Send a task to the STEM Agent and return the response content."""
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            f"{STEM_URL}/api/v1/chat",
            json={"message": message, "caller_id": caller_id},
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data.get("content", ""))


# ---------------------------------------------------------------------------
# 2. CrewAI integration
# ---------------------------------------------------------------------------

def main() -> None:
    try:
        from crewai import Agent, Task, Crew
        from crewai.tools import tool
    except ImportError:
        print("CrewAI not installed. Install with:")
        print("  pip install crewai")
        print()
        print("Running STEM agent call directly instead...")
        result = call_stem_agent("Summarize best practices for API design.")
        print(f"STEM Agent response: {result}")
        return

    # Wrap the STEM Agent call as a CrewAI tool
    @tool("stem_agent")
    def stem_agent_tool(query: str) -> str:
        """Query the STEM Agent for analysis, research, or complex tasks."""
        return call_stem_agent(query)

    # Create an agent that uses the STEM Agent as a tool
    researcher = Agent(
        role="Research Analyst",
        goal="Produce detailed, evidence-based analysis",
        backstory="You are an experienced analyst who delegates deep research to the STEM Agent.",
        tools=[stem_agent_tool],
    )

    # Define a task
    research_task = Task(
        description="Research and summarize best practices for API design in 2025.",
        expected_output="A structured summary with key recommendations.",
        agent=researcher,
    )

    # Run the crew
    crew = Crew(agents=[researcher], tasks=[research_task], verbose=True)
    result = crew.kickoff()

    print("=== CrewAI + STEM Agent Result ===")
    print(result)


if __name__ == "__main__":
    main()
