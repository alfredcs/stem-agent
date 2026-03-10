import pino from "pino";

/**
 * Structured logger factory using pino.
 * All packages use this for consistent logging with correlation IDs.
 */
export function createLogger(
  name: string,
  opts: { level?: string; correlationId?: string } = {},
): pino.Logger {
  return pino({
    name,
    level: opts.level ?? process.env["LOG_LEVEL"] ?? "info",
    ...(opts.correlationId
      ? { mixin: () => ({ correlationId: opts.correlationId }) }
      : {}),
  });
}

/** Child logger with an attached correlation ID. */
export function withCorrelationId(
  logger: pino.Logger,
  correlationId: string,
): pino.Logger {
  return logger.child({ correlationId });
}

export type Logger = pino.Logger;
