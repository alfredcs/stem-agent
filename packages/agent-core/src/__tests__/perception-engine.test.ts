import { describe, it, expect, vi } from "vitest";
import { PerceptionEngine } from "../perception/perception-engine.js";
import { createMockMemory, createMessage } from "./helpers.js";

describe("PerceptionEngine", () => {
  const memory = createMockMemory();
  const engine = new PerceptionEngine(memory);

  describe("intent classification", () => {
    it("classifies questions", async () => {
      const result = await engine.perceive(createMessage("What is the weather today?"), []);
      expect(result.intent).toBe("question");
    });

    it("classifies commands", async () => {
      const result = await engine.perceive(createMessage("Create a new project and deploy it"), []);
      expect(result.intent).toBe("command");
    });

    it("classifies analysis requests", async () => {
      const result = await engine.perceive(createMessage("Analyze this code and compare performance"), []);
      expect(result.intent).toBe("analysis_request");
    });

    it("classifies debugging requests", async () => {
      const result = await engine.perceive(createMessage("There is a bug, the function fails with an error"), []);
      expect(result.intent).toBe("debugging");
    });

    it("classifies conversation", async () => {
      const result = await engine.perceive(createMessage("Hello there"), []);
      expect(result.intent).toBe("conversation");
    });

    it("classifies creative requests", async () => {
      const result = await engine.perceive(createMessage("Design a new architecture and brainstorm ideas"), []);
      expect(result.intent).toBe("creative_request");
    });
  });

  describe("complexity classification", () => {
    it("returns simple for short messages", async () => {
      const result = await engine.perceive(createMessage("Hi"), []);
      expect(result.complexity).toBe("simple");
    });

    it("returns complex for messages with code blocks", async () => {
      const content = "Fix this:\n```\nfunction foo() { return bar; }\n```";
      const result = await engine.perceive(createMessage(content), []);
      expect(result.complexity).toBe("complex");
    });

    it("returns medium for moderate-length messages", async () => {
      const content = "Please help me with " + "word ".repeat(60);
      const result = await engine.perceive(createMessage(content), []);
      expect(result.complexity).toBe("medium");
    });
  });

  describe("entity extraction", () => {
    it("extracts URLs", async () => {
      const result = await engine.perceive(
        createMessage("Check https://example.com for details"),
        [],
      );
      expect(result.entities.some((e) => e.type === "url")).toBe(true);
    });

    it("extracts code blocks", async () => {
      const result = await engine.perceive(
        createMessage("Here is code:\n```\nconsole.log('hi')\n```"),
        [],
      );
      expect(result.entities.some((e) => e.type === "code")).toBe(true);
    });

    it("extracts numbers", async () => {
      const result = await engine.perceive(
        createMessage("Set the value to 42"),
        [],
      );
      expect(result.entities.some((e) => e.type === "number" && e.value === 42)).toBe(true);
    });
  });

  describe("urgency detection", () => {
    it("detects high urgency", async () => {
      const result = await engine.perceive(createMessage("This is urgent, fix it immediately"), []);
      expect(result.urgency).toBe("high");
    });

    it("detects low urgency", async () => {
      const result = await engine.perceive(createMessage("Whenever you get a chance, no rush"), []);
      expect(result.urgency).toBe("low");
    });

    it("defaults to medium urgency", async () => {
      const result = await engine.perceive(createMessage("Please help me with this"), []);
      expect(result.urgency).toBe("medium");
    });
  });

  describe("memory enrichment", () => {
    it("includes memories in context when available", async () => {
      const memoryWithRecall = createMockMemory({
        recall: async () => [
          {
            id: "00000000-0000-0000-0000-000000000001",
            timestamp: Date.now(),
            actors: ["user"],
            actions: ["asked"],
            context: {},
            importance: 0.5,
            summary: "Previous interaction about weather",
          },
        ],
      });
      const eng = new PerceptionEngine(memoryWithRecall);
      const result = await eng.perceive(createMessage("What about weather?"), []);
      expect(result.context).toHaveProperty("relevantMemories");
    });

    it("handles memory recall failure gracefully", async () => {
      const failingMemory = createMockMemory({
        recall: async () => { throw new Error("DB down"); },
      });
      const eng = new PerceptionEngine(failingMemory);
      const result = await eng.perceive(createMessage("Hello"), []);
      expect(result.intent).toBe("conversation");
    });
  });

  describe("caller style signals", () => {
    it("detects formal style", async () => {
      const result = await engine.perceive(
        createMessage("Please kindly help me with this task, thank you"),
        [],
      );
      expect(result.callerStyleSignals.formality).toBeGreaterThan(0.5);
    });

    it("detects informal style", async () => {
      const result = await engine.perceive(
        createMessage("hey yo lol help me"),
        [],
      );
      expect(result.callerStyleSignals.formality).toBeLessThan(0.5);
    });
  });
});
