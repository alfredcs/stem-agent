import { BaseError } from "@stem-agent/shared";

/** Base error for all memory-system operations. */
export class MemoryError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: "MEMORY_ERROR", statusCode: 500, details });
  }
}

/** Thrown when a requested memory record is not found. */
export class MemoryNotFoundError extends BaseError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, {
      code: "MEMORY_NOT_FOUND",
      statusCode: 404,
      details: { resource, id },
    });
  }
}

/** Thrown when embedding generation fails. */
export class EmbeddingError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, { code: "EMBEDDING_ERROR", statusCode: 502, details });
  }
}
