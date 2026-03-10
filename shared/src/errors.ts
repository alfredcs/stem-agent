/**
 * Base error class for all STEM Agent errors.
 * All packages extend this for domain-specific errors.
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown>;

  constructor(
    message: string,
    opts: {
      code?: string;
      statusCode?: number;
      details?: Record<string, unknown>;
      cause?: Error;
    } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = this.constructor.name;
    this.code = opts.code ?? "STEM_ERROR";
    this.statusCode = opts.statusCode ?? 500;
    this.details = opts.details ?? {};
  }

  toJSON(): Record<string, unknown> {
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
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, {
      code: "NOT_FOUND",
      statusCode: 404,
      details: { resource, id },
    });
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
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
  constructor(message: string) {
    super(message, { code: "BUDGET_EXCEEDED", statusCode: 429 });
  }
}

export class MCPError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: "MCP_ERROR", statusCode: 502, details });
  }
}

export class TimeoutError extends BaseError {
  constructor(operation: string, timeoutMs: number) {
    super(`${operation} timed out after ${timeoutMs}ms`, {
      code: "TIMEOUT",
      statusCode: 504,
      details: { operation, timeoutMs },
    });
  }
}
