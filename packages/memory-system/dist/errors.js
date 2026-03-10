"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingError = exports.MemoryNotFoundError = exports.MemoryError = void 0;
const shared_1 = require("@stem-agent/shared");
/** Base error for all memory-system operations. */
class MemoryError extends shared_1.BaseError {
    constructor(message, details) {
        super(message, { code: "MEMORY_ERROR", statusCode: 500, details });
    }
}
exports.MemoryError = MemoryError;
/** Thrown when a requested memory record is not found. */
class MemoryNotFoundError extends shared_1.BaseError {
    constructor(resource, id) {
        super(`${resource} not found: ${id}`, {
            code: "MEMORY_NOT_FOUND",
            statusCode: 404,
            details: { resource, id },
        });
    }
}
exports.MemoryNotFoundError = MemoryNotFoundError;
/** Thrown when embedding generation fails. */
class EmbeddingError extends shared_1.BaseError {
    constructor(message, details) {
        super(message, { code: "EMBEDDING_ERROR", statusCode: 502, details });
    }
}
exports.EmbeddingError = EmbeddingError;
//# sourceMappingURL=errors.js.map