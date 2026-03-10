import pino from "pino";
/**
 * Structured logger factory using pino.
 * All packages use this for consistent logging with correlation IDs.
 */
export declare function createLogger(name: string, opts?: {
    level?: string;
    correlationId?: string;
}): pino.Logger;
/** Child logger with an attached correlation ID. */
export declare function withCorrelationId(logger: pino.Logger, correlationId: string): pino.Logger;
export type Logger = pino.Logger;
//# sourceMappingURL=logger.d.ts.map