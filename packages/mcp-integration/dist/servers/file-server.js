import { resolve, normalize } from "node:path";
import { BaseMCPServer } from "./base-server.js";
/**
 * MCP server for filesystem operations.
 *
 * All paths are sandboxed to configured root directories.
 * Supports local FS and S3-compatible backends via {@link IFileSystemAdapter}.
 */
export class FileServer extends BaseMCPServer {
    fs;
    fileConfig;
    watchers = [];
    constructor(config, fileConfig, fs, logger) {
        super(config, logger);
        this.fileConfig = fileConfig;
        this.fs = fs;
    }
    /** @inheritdoc */
    async initialize() {
        this.registerTool("fs_read", "Read the contents of a file", [{ name: "path", type: "string", description: "File path", required: true }], async (args) => {
            const safePath = this.resolveSandboxed(args["path"]);
            return this.fs.read(safePath);
        });
        this.registerTool("fs_write", "Write content to a file (creates or overwrites)", [
            { name: "path", type: "string", description: "File path", required: true },
            { name: "content", type: "string", description: "File content", required: true },
        ], async (args) => {
            const safePath = this.resolveSandboxed(args["path"]);
            await this.fs.write(safePath, args["content"]);
            return { written: safePath };
        });
        this.registerTool("fs_list", "List files and directories at a path", [{ name: "path", type: "string", description: "Directory path", required: true }], async (args) => {
            const safePath = this.resolveSandboxed(args["path"]);
            return this.fs.list(safePath);
        });
        this.registerTool("fs_search", "Search for files matching a glob pattern", [
            { name: "path", type: "string", description: "Directory to search in", required: true },
            { name: "pattern", type: "string", description: "Glob pattern", required: true },
        ], async (args) => {
            const safePath = this.resolveSandboxed(args["path"]);
            return this.fs.search(safePath, args["pattern"]);
        });
        this.registerTool("fs_watch", "Watch a path for filesystem changes", [{ name: "path", type: "string", description: "Path to watch", required: true }], async (args) => {
            const safePath = this.resolveSandboxed(args["path"]);
            const watcher = this.fs.watch(safePath, (event, filename) => {
                this.logger.info({ event, filename }, "fs change detected");
            });
            this.watchers.push(watcher);
            return { watching: safePath };
        });
        this.registerTool("fs_diff", "Compute a line-by-line diff between two files", [
            { name: "pathA", type: "string", description: "First file path", required: true },
            { name: "pathB", type: "string", description: "Second file path", required: true },
        ], async (args) => {
            const a = await this.fs.read(this.resolveSandboxed(args["pathA"]));
            const b = await this.fs.read(this.resolveSandboxed(args["pathB"]));
            return this.simpleDiff(a, b);
        });
        this.registerTool("fs_patch", "Apply line replacements to a file", [
            { name: "path", type: "string", description: "File path", required: true },
            {
                name: "replacements",
                type: "array",
                description: "Array of {oldText, newText} replacements",
                required: true,
            },
        ], async (args) => {
            const safePath = this.resolveSandboxed(args["path"]);
            let content = await this.fs.read(safePath);
            const replacements = args["replacements"];
            for (const r of replacements) {
                content = content.replace(r.oldText, r.newText);
            }
            await this.fs.write(safePath, content);
            return { patched: safePath, replacementsApplied: replacements.length };
        });
    }
    /** @inheritdoc */
    async cleanup() {
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
    resolveSandboxed(userPath) {
        const resolved = normalize(resolve(userPath));
        const allowed = this.fileConfig.allowedRoots.some((root) => resolved.startsWith(normalize(resolve(root))));
        if (!allowed) {
            throw new Error(`Path "${userPath}" is outside allowed roots: ${this.fileConfig.allowedRoots.join(", ")}`);
        }
        return resolved;
    }
    /** Minimal line diff for the fs_diff tool. */
    simpleDiff(a, b) {
        const linesA = new Set(a.split("\n"));
        const linesB = new Set(b.split("\n"));
        const added = [];
        const removed = [];
        for (const line of linesB) {
            if (!linesA.has(line))
                added.push(line);
        }
        for (const line of linesA) {
            if (!linesB.has(line))
                removed.push(line);
        }
        return { added, removed };
    }
}
//# sourceMappingURL=file-server.js.map