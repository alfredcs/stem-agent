import { type MCPServerConfig, type Logger } from "@stem-agent/shared";
import { type Readable } from "node:stream";
import { resolve, normalize } from "node:path";
import { BaseMCPServer } from "./base-server.js";

/** Metadata about a file or directory entry. */
export interface FileEntry {
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: Date;
}

/** Disposable watcher handle returned by watch(). */
export interface FileWatcher {
  close(): void;
}

/**
 * Adapter interface for filesystem backends (local FS, S3-compatible, etc.).
 */
export interface IFileSystemAdapter {
  /** Read the full contents of a file as a string. */
  read(path: string): Promise<string>;

  /** Write string content to a file (creates or overwrites). */
  write(path: string, content: string): Promise<void>;

  /** List entries in a directory. */
  list(dirPath: string): Promise<FileEntry[]>;

  /** Get metadata for a single path. */
  stat(path: string): Promise<FileEntry>;

  /** Delete a file or directory. */
  delete(path: string): Promise<void>;

  /** Search for files matching a glob pattern under a directory. */
  search(dirPath: string, pattern: string): Promise<string[]>;

  /** Watch a path for changes. */
  watch(path: string, callback: (event: string, filename: string) => void): FileWatcher;

  /** Open a readable stream (for large files). */
  createReadStream(path: string): Readable;
}

/** Configuration specific to the file server. */
export interface FileServerConfig {
  /** Allowed root directories. All paths are sandboxed to these roots. */
  allowedRoots: string[];
}

/**
 * MCP server for filesystem operations.
 *
 * All paths are sandboxed to configured root directories.
 * Supports local FS and S3-compatible backends via {@link IFileSystemAdapter}.
 */
export class FileServer extends BaseMCPServer {
  private readonly fs: IFileSystemAdapter;
  private readonly fileConfig: FileServerConfig;
  private readonly watchers: FileWatcher[] = [];

  constructor(
    config: MCPServerConfig,
    fileConfig: FileServerConfig,
    fs: IFileSystemAdapter,
    logger?: Logger,
  ) {
    super(config, logger);
    this.fileConfig = fileConfig;
    this.fs = fs;
  }

  /** @inheritdoc */
  protected async initialize(): Promise<void> {
    this.registerTool(
      "fs_read",
      "Read the contents of a file",
      [{ name: "path", type: "string", description: "File path", required: true }],
      async (args) => {
        const safePath = this.resolveSandboxed(args["path"] as string);
        return this.fs.read(safePath);
      },
    );

    this.registerTool(
      "fs_write",
      "Write content to a file (creates or overwrites)",
      [
        { name: "path", type: "string", description: "File path", required: true },
        { name: "content", type: "string", description: "File content", required: true },
      ],
      async (args) => {
        const safePath = this.resolveSandboxed(args["path"] as string);
        await this.fs.write(safePath, args["content"] as string);
        return { written: safePath };
      },
    );

    this.registerTool(
      "fs_list",
      "List files and directories at a path",
      [{ name: "path", type: "string", description: "Directory path", required: true }],
      async (args) => {
        const safePath = this.resolveSandboxed(args["path"] as string);
        return this.fs.list(safePath);
      },
    );

    this.registerTool(
      "fs_search",
      "Search for files matching a glob pattern",
      [
        { name: "path", type: "string", description: "Directory to search in", required: true },
        { name: "pattern", type: "string", description: "Glob pattern", required: true },
      ],
      async (args) => {
        const safePath = this.resolveSandboxed(args["path"] as string);
        return this.fs.search(safePath, args["pattern"] as string);
      },
    );

    this.registerTool(
      "fs_watch",
      "Watch a path for filesystem changes",
      [{ name: "path", type: "string", description: "Path to watch", required: true }],
      async (args) => {
        const safePath = this.resolveSandboxed(args["path"] as string);
        const watcher = this.fs.watch(safePath, (event, filename) => {
          this.logger.info({ event, filename }, "fs change detected");
        });
        this.watchers.push(watcher);
        return { watching: safePath };
      },
    );

    this.registerTool(
      "fs_diff",
      "Compute a line-by-line diff between two files",
      [
        { name: "pathA", type: "string", description: "First file path", required: true },
        { name: "pathB", type: "string", description: "Second file path", required: true },
      ],
      async (args) => {
        const a = await this.fs.read(this.resolveSandboxed(args["pathA"] as string));
        const b = await this.fs.read(this.resolveSandboxed(args["pathB"] as string));
        return this.simpleDiff(a, b);
      },
    );

    this.registerTool(
      "fs_patch",
      "Apply line replacements to a file",
      [
        { name: "path", type: "string", description: "File path", required: true },
        {
          name: "replacements",
          type: "array",
          description: "Array of {oldText, newText} replacements",
          required: true,
        },
      ],
      async (args) => {
        const safePath = this.resolveSandboxed(args["path"] as string);
        let content = await this.fs.read(safePath);
        const replacements = args["replacements"] as Array<{
          oldText: string;
          newText: string;
        }>;
        for (const r of replacements) {
          content = content.replace(r.oldText, r.newText);
        }
        await this.fs.write(safePath, content);
        return { patched: safePath, replacementsApplied: replacements.length };
      },
    );
  }

  /** @inheritdoc */
  protected override async cleanup(): Promise<void> {
    for (const w of this.watchers) {
      w.close();
    }
    this.watchers.length = 0;
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Resolve a user-provided path and verify it falls within an allowed root.
   * Throws if the path escapes the sandbox.
   */
  private resolveSandboxed(userPath: string): string {
    const resolved = normalize(resolve(userPath));
    const allowed = this.fileConfig.allowedRoots.some((root) =>
      resolved.startsWith(normalize(resolve(root))),
    );
    if (!allowed) {
      throw new Error(
        `Path "${userPath}" is outside allowed roots: ${this.fileConfig.allowedRoots.join(", ")}`,
      );
    }
    return resolved;
  }

  /** Minimal line diff for the fs_diff tool. */
  private simpleDiff(a: string, b: string): { added: string[]; removed: string[] } {
    const linesA = new Set(a.split("\n"));
    const linesB = new Set(b.split("\n"));
    const added: string[] = [];
    const removed: string[] = [];
    for (const line of linesB) {
      if (!linesA.has(line)) added.push(line);
    }
    for (const line of linesA) {
      if (!linesB.has(line)) removed.push(line);
    }
    return { added, removed };
  }
}
