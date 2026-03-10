import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MCPServerConfig } from "@stem-agent/shared";
import {
  CustomServer,
  AbstractCustomServer,
  type ToolRegistration,
} from "../../servers/custom-server.js";

function makeMCPConfig(): MCPServerConfig {
  return {
    name: "test-custom",
    transport: "stdio",
    args: [],
    capabilities: [],
    autoConnect: true,
    env: {},
  };
}

class TestPlugin extends AbstractCustomServer {
  readonly name = "test-plugin";

  onInitCalled = false;
  onStartCalled = false;
  onStopCalled = false;

  async onInit(): Promise<ToolRegistration[]> {
    this.onInitCalled = true;
    return [
      {
        name: "custom_greet",
        description: "Greet someone",
        parameters: [
          { name: "name", type: "string", description: "Name to greet", required: true },
        ],
        handler: async (args) => `Hello, ${args["name"]}!`,
      },
    ];
  }

  override async onStart(): Promise<void> {
    this.onStartCalled = true;
  }

  override async onStop(): Promise<void> {
    this.onStopCalled = true;
  }

  override async onHealthCheck(): Promise<boolean> {
    return true;
  }
}

describe("CustomServer", () => {
  let server: CustomServer;
  let plugin: TestPlugin;

  beforeEach(async () => {
    plugin = new TestPlugin();
    server = new CustomServer(makeMCPConfig(), plugin);
    await server.start();
  });

  it("calls plugin onInit and onStart on start()", () => {
    expect(plugin.onInitCalled).toBe(true);
    expect(plugin.onStartCalled).toBe(true);
  });

  it("registers tools from plugin", () => {
    const names = server.listTools().map((t) => t.name);
    expect(names).toEqual(["custom_greet"]);
  });

  it("executes plugin tool handler", async () => {
    const result = await server.executeTool("custom_greet", { name: "World" });
    expect(result.success).toBe(true);
    expect(result.data).toBe("Hello, World!");
  });

  it("delegates healthCheck to plugin", async () => {
    expect(await server.healthCheck()).toBe(true);
  });

  it("calls plugin onStop on stop()", async () => {
    await server.stop();
    expect(plugin.onStopCalled).toBe(true);
  });

  it("healthCheck returns false when server is not running", async () => {
    await server.stop();
    expect(await server.healthCheck()).toBe(false);
  });
});

describe("AbstractCustomServer defaults", () => {
  it("default onStart/onStop/onHealthCheck do not throw", async () => {
    class MinimalPlugin extends AbstractCustomServer {
      readonly name = "minimal";
      async onInit(): Promise<ToolRegistration[]> {
        return [];
      }
    }

    const plugin = new MinimalPlugin();
    await expect(plugin.onStart()).resolves.not.toThrow();
    await expect(plugin.onStop()).resolves.not.toThrow();
    expect(await plugin.onHealthCheck()).toBe(true);
  });
});
