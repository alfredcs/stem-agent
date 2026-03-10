"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.withCorrelationId = withCorrelationId;
const pino_1 = __importDefault(require("pino"));
/**
 * Structured logger factory using pino.
 * All packages use this for consistent logging with correlation IDs.
 */
function createLogger(name, opts = {}) {
    return (0, pino_1.default)({
        name,
        level: opts.level ?? process.env["LOG_LEVEL"] ?? "info",
        ...(opts.correlationId
            ? { mixin: () => ({ correlationId: opts.correlationId }) }
            : {}),
    });
}
/** Child logger with an attached correlation ID. */
function withCorrelationId(logger, correlationId) {
    return logger.child({ correlationId });
}
//# sourceMappingURL=logger.js.map