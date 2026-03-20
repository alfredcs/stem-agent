import pino from "pino";
/**
 * Structured logger factory using pino.
 * All packages use this for consistent logging with correlation IDs.
 */
export function createLogger(name, opts = {}) {
    return pino({
        name,
        level: opts.level ?? process.env["LOG_LEVEL"] ?? "info",
        ...(opts.correlationId
            ? { mixin: () => ({ correlationId: opts.correlationId }) }
            : {}),
    });
}
/** Child logger with an attached correlation ID. */
export function withCorrelationId(logger, correlationId) {
    return logger.child({ correlationId });
}
//# sourceMappingURL=logger.js.map