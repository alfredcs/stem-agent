"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolServer = void 0;
const base_server_js_1 = require("./base-server.js");
/**
 * MCP server that wraps CLI tools and scripts.
 *
 * Each tool definition specifies a command, argument template, and
 * resource limits. Execution is sandboxed via the injected
 * {@link IProcessExecutor}.
 */
class ToolServer extends base_server_js_1.BaseMCPServer {
    executor;
    toolDefs;
    constructor(config, toolConfig, executor, logger) {
        super(config, logger);
        this.toolDefs = toolConfig.tools;
        this.executor = executor;
    }
    /** @inheritdoc */
    async initialize() {
        for (const def of this.toolDefs) {
            this.registerTool(def.name, def.description, [
                {
                    name: "args",
                    type: "object",
                    description: "Arguments to substitute into the command template",
                    required: false,
                },
            ], (args) => this.runTool(def, args["args"] ?? {}));
        }
    }
    /* ------------------------------------------------------------------ */
    /*  Private helpers                                                    */
    /* ------------------------------------------------------------------ */
    async runTool(def, templateArgs) {
        const resolvedArgs = (def.argsTemplate ?? []).map((tmpl) => tmpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
            if (key in templateArgs)
                return templateArgs[key];
            return `{{${key}}}`;
        }));
        return this.executor.exec({
            command: def.command,
            args: resolvedArgs,
            env: def.env,
            timeoutMs: def.timeoutMs,
            maxOutputBytes: def.maxOutputBytes,
        });
    }
}
exports.ToolServer = ToolServer;
//# sourceMappingURL=tool-server.js.map