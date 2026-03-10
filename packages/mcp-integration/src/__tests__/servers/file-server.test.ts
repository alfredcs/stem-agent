import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MCPServerConfig } from "@stem-agent/shared";
import {
  FileServer,
  type IFileSystemAdapter,
  type FileServerConfig,
} from "../../servers/file-server.js";
import { Readable } from "node:stream";

function makeMCPConfig(): MCPServerConfig {
  return {
    name: "test-fs",
    transport: "stdio",
    args: [],
    capabilities: [],
    autoConnect: true,
    env: {},
  };
}

function makeFileConfig(): FileServerConfig {
  return { allowedRoots: ["/workspace", "/tmp"] };
}

function makeMockFs(): IFileSystemAdapter {
  return {
    read: vi.fn().mockResolvedValue("file content"),
    write: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([
      { path: "/workspace/a.txt", isDirectory: false, size: 100, modifiedAt: new Date() },
    ]),
    stat: vi.fn().mockResolvedValue({
      path: "/workspace/a.txt",
      isDirectory: false,
      size: 100,
      modifiedAt: new Date(),
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(["/workspace/a.txt"]),
    watch: vi.fn().mockReturnValue({ close: vi.fn() }),
    createReadStream: vi.fn().mockReturnValue(Readable.from(["data"])),
  };
}

describe("FileServer", () => {
  let server: FileServer;
  let fs: IFileSystemAdapter;

  beforeEach(async () => {
    fs = makeMockFs();
    server = new FileServer(makeMCPConfig(), makeFileConfig(), fs);
    await server.start();
  });

  it("registers all 7 tools", () => {
    const names = server.listTools().map((t) => t.name);
    expect(names).toEqual([
      "fs_read",
      "fs_write",
      "fs_list",
      "fs_search",
      "fs_watch",
      "fs_diff",
      "fs_patch",
    ]);
  });

  it("fs_read reads a file within sandbox", async () => {
    const result = await server.executeTool("fs_read", { path: "/workspace/a.txt" });
    expect(result.success).toBe(true);
    expect(result.data).toBe("file content");
  });

  it("fs_read rejects paths outside sandbox", async () => {
    const result = await server.executeTool("fs_read", { path: "/etc/passwd" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("outside allowed roots");
  });

  it("fs_write writes to a sandboxed path", async () => {
    const result = await server.executeTool("fs_write", {
      path: "/workspace/b.txt",
      content: "hello",
    });
    expect(result.success).toBe(true);
    expect(fs.write).toHaveBeenCalled();
  });

  it("fs_list lists directory entries", async () => {
    const result = await server.executeTool("fs_list", { path: "/workspace" });
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("fs_search searches with glob pattern", async () => {
    const result = await server.executeTool("fs_search", {
      path: "/workspace",
      pattern: "*.txt",
    });
    expect(result.success).toBe(true);
    expect(fs.search).toHaveBeenCalledWith("/workspace", "*.txt");
  });

  it("fs_watch registers a watcher", async () => {
    const result = await server.executeTool("fs_watch", { path: "/workspace" });
    expect(result.success).toBe(true);
    expect(fs.watch).toHaveBeenCalled();
  });

  it("fs_diff computes diff between two files", async () => {
    (fs.read as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce("line1\nline2\nline3")
      .mockResolvedValueOnce("line1\nline2_modified\nline3");
    const result = await server.executeTool("fs_diff", {
      pathA: "/workspace/a.txt",
      pathB: "/workspace/b.txt",
    });
    expect(result.success).toBe(true);
    const data = result.data as { added: string[]; removed: string[] };
    expect(data.added).toContain("line2_modified");
    expect(data.removed).toContain("line2");
  });

  it("fs_patch applies replacements", async () => {
    (fs.read as ReturnType<typeof vi.fn>).mockResolvedValueOnce("hello world");
    const result = await server.executeTool("fs_patch", {
      path: "/workspace/a.txt",
      replacements: [{ oldText: "world", newText: "earth" }],
    });
    expect(result.success).toBe(true);
    expect(fs.write).toHaveBeenCalledWith("/workspace/a.txt", "hello earth");
  });

  it("cleanup closes all watchers", async () => {
    await server.executeTool("fs_watch", { path: "/workspace" });
    const watcher = (fs.watch as ReturnType<typeof vi.fn>).mock.results[0]!.value as {
      close: ReturnType<typeof vi.fn>;
    };
    await server.stop();
    expect(watcher.close).toHaveBeenCalled();
  });
});
