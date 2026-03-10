import { type MCPServerConfig, type Logger } from "@stem-agent/shared";
import { BaseMCPServer } from "./base-server.js";
/** Definition of a CLI tool that can be executed. */
export interface IToolDefinition {
    /** Unique tool name. */
    name: string;
    /** Human-readable description. */
    description: string;
    /** The command to execute. */
    command: string;
    /** Argument template — use {{paramName}} for substitution. */
    argsTemplate?: string[];
    /** Timeout in milliseconds. */
    timeoutMs?: number;
    /** Maximum stdout+stderr output in bytes. */
    maxOutputBytes?: number;
    /** Extra environment variables. */
    env?: Record<string, string>;
}
/** Result of a CLI tool execution. */
export interface ToolExecResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}
/**
 * Interface for executing child processes.
 * Injected so tests can mock it without spawning real processes.
 */
export interface IProcessExecutor {
    exec(opts: {
        command: string;
        args: string[];
        env?: Record<string, string>;
        timeoutMs?: number;
        maxOutputBytes?: number;
    }): Promise<ToolExecResult>;
}
/** Configuration specific to the tool server. */
export interface ToolServerConfig {
    /** Tool definitions to register. */
    tools: IToolDefinition[];
}
/**
 * MCP server that wraps CLI tools and scripts.
 *
 * Each tool definition specifies a command, argument template, and
 * resource limits. Execution is sandboxed via the injected
 * {@link IProcessExecutor}.
 */
export declare class ToolServer extends BaseMCPServer {
    private readonly executor;
    private readonly toolDefs;
    constructor(config: MCPServerConfig, toolConfig: ToolServerConfig, executor: IProcessExecutor, logger?: Logger);
    /** @inheritdoc */
    protected initialize(): Promise<void>;
    private runTool;
}
//# sourceMappingURL=tool-server.d.ts.map