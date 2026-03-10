import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MCPServerConfig } from "@stem-agent/shared";
import {
  ToolServer,
  type IProcessExecutor,
  type ToolServerConfig,
} from "../../servers/tool-server.js";

function makeMCPConfig(): MCPServerConfig {
  return {
    name: "test-tools",
    transport: "stdio",
    args: [],
    capabilities: [],
    autoConnect: true,
    env: {},
  };
}

function makeToolConfig(): ToolServerConfig {
  return {
    tools: [
      {
        name: "run_lint",
        description: "Run the linter",
        command: "eslint",
        argsTemplate: ["{{path}}", "--format", "json"],
        timeoutMs: 30000,
        maxOutputBytes: 1024 * 1024,
      },
      {
        name: "run_test",
        description: "Run a test file",
        command: "vitest",
        argsTemplate: ["run", "{{file}}"],
        timeoutMs: 60000,
      },
    ],
  };
}

function makeMockExecutor(): IProcessExecutor {
  return {
    exec: vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: '{"ok": true}',
      stderr: "",
    }),
  };
}

describe("ToolServer", () => {
  let server: ToolServer;
  let executor: IProcessExecutor;

  beforeEach(async () => {
    executor = makeMockExecutor();
    server = new ToolServer(makeMCPConfig(), makeToolConfig(), executor);
    await server.start();
  });

  it("registers tools from definitions", () => {
    const names = server.listTools().map((t) => t.name);
    expect(names).toEqual(["run_lint", "run_test"]);
  });

  it("substitutes template args and executes", async () => {
    const result = await server.executeTool("run_lint", {
      args: { path: "./src" },
    });
    expect(result.success).toBe(true);
    expect(executor.exec).toHaveBeenCalledWith({
      command: "eslint",
      args: ["./src", "--format", "json"],
      env: undefined,
      timeoutMs: 30000,
      maxOutputBytes: 1024 * 1024,
    });
  });

  it("leaves unresolved placeholders as-is", async () => {
    await server.executeTool("run_lint", { args: {} });
    const call = (executor.exec as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
      args: string[];
    };
    expect(call.args[0]).toBe("{{path}}");
  });

  it("passes empty args when none provided", async () => {
    await server.executeTool("run_test", {});
    expect(executor.exec).toHaveBeenCalledWith(
      expect.objectContaining({
        command: "vitest",
        args: ["run", "{{file}}"],
      }),
    );
  });

  it("returns failure when executor throws", async () => {
    (executor.exec as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("timeout exceeded"),
    );
    const result = await server.executeTool("run_lint", { args: { path: "." } });
    expect(result.success).toBe(false);
    expect(result.error).toContain("timeout exceeded");
  });

  it("returns exit code and output from executor", async () => {
    (executor.exec as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      exitCode: 1,
      stdout: "",
      stderr: "lint errors found",
    });
    const result = await server.executeTool("run_lint", { args: { path: "." } });
    expect(result.success).toBe(true);
    expect((result.data as { exitCode: number }).exitCode).toBe(1);
  });
});
