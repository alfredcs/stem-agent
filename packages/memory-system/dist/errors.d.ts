import { BaseError } from "@stem-agent/shared";
/** Base error for all memory-system operations. */
export declare class MemoryError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
/** Thrown when a requested memory record is not found. */
export declare class MemoryNotFoundError extends BaseError {
    constructor(resource: string, id: string);
}
/** Thrown when embedding generation fails. */
export declare class EmbeddingError extends BaseError {
    constructor(message: string, details?: Record<string, unknown>);
}
//# sourceMappingURL=errors.d.ts.map