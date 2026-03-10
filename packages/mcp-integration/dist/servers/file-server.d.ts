import { type MCPServerConfig, type Logger } from "@stem-agent/shared";
import { type Readable } from "node:stream";
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
export declare class FileServer extends BaseMCPServer {
    private readonly fs;
    private readonly fileConfig;
    private readonly watchers;
    constructor(config: MCPServerConfig, fileConfig: FileServerConfig, fs: IFileSystemAdapter, logger?: Logger);
    /** @inheritdoc */
    protected initialize(): Promise<void>;
    /** @inheritdoc */
    protected cleanup(): Promise<void>;
    /**
     * Resolve a user-provided path and verify it falls within an allowed root.
     * Throws if the path escapes the sandbox.
     */
    private resolveSandboxed;
    /** Minimal line diff for the fs_diff tool. */
    private simpleDiff;
}
//# sourceMappingURL=file-server.d.ts.map