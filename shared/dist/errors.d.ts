/**
 * Base error class for all STEM Agent errors.
 * All packages extend this for domain-specific errors.
 */
export declare class BaseError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly details: Record<string, unknown>;
    constructor(message: string, opts?: {
        code?: string;
        statusCode?: number;
        details?: Record<string, unknown>;
        cause?: Error;
    });
    toJSON(): Record<string, unknown>;
}
export declare class NotFoundError extends BaseError {
    constructor(resource: string, id: string);
}
export declare class ValidationError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class AuthenticationError extends BaseError {
    constructor(message?: string);
}
export declare class AuthorizationError extends BaseError {
    constructor(message?: string);
}
export declare class BudgetExceededError extends BaseError {
    constructor(message: string);
}
export declare class MCPError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class TimeoutError extends BaseError {
    constructor(operation: string, timeoutMs: number);
}
//# sourceMappingURL=errors.d.ts.map