import pino from "pino";
/**
 * Structured logger factory using pino.
 * All packages use this for consistent logging with correlation IDs.
 */
export function createLogger(name, opts = {}) {
    // Logs must go to stderr: fd 1 is reserved for MCP stdio JSON-RPC frames
    // in mcp-entrypoint.ts, and stderr is also the right default for server
    // logs regardless of transport.
    return pino({
        name,
        level: opts.level ?? process.env["LOG_LEVEL"] ?? "info",
        ...(opts.correlationId
            ? { mixin: () => ({ correlationId: opts.correlationId }) }
            : {}),
    }, pino.destination(2));
}
/** Child logger with an attached correlation ID. */
export function withCorrelationId(logger, correlationId) {
    return logger.child({ correlationId });
}
//# sourceMappingURL=logger.js.map