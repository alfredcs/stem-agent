/**
 * Base error class for all STEM Agent errors.
 * All packages extend this for domain-specific errors.
 */
export class BaseError extends Error {
    code;
    statusCode;
    details;
    constructor(message, opts = {}) {
        super(message, { cause: opts.cause });
        this.name = this.constructor.name;
        this.code = opts.code ?? "STEM_ERROR";
        this.statusCode = opts.statusCode ?? 500;
        this.details = opts.details ?? {};
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
        };
    }
}
// -- Common error subclasses used across layers --------------------------
export class NotFoundError extends BaseError {
    constructor(resource, id) {
        super(`${resource} not found: ${id}`, {
            code: "NOT_FOUND",
            statusCode: 404,
            details: { resource, id },
        });
    }
}
export class ValidationError extends BaseError {
    constructor(message, details) {
        super(message, { code: "VALIDATION_ERROR", statusCode: 400, details });
    }
}
export class AuthenticationError extends BaseError {
    constructor(message = "Authentication failed") {
        super(message, { code: "AUTH_ERROR", statusCode: 401 });
    }
}
export class AuthorizationError extends BaseError {
    constructor(message = "Forbidden") {
        super(message, { code: "FORBIDDEN", statusCode: 403 });
    }
}
export class BudgetExceededError extends BaseError {
    constructor(message) {
        super(message, { code: "BUDGET_EXCEEDED", statusCode: 429 });
    }
}
export class MCPError extends BaseError {
    constructor(message, details) {
        super(message, { code: "MCP_ERROR", statusCode: 502, details });
    }
}
export class TimeoutError extends BaseError {
    constructor(operation, timeoutMs) {
        super(`${operation} timed out after ${timeoutMs}ms`, {
            code: "TIMEOUT",
            statusCode: 504,
            details: { operation, timeoutMs },
        });
    }
}
//# sourceMappingURL=errors.js.map