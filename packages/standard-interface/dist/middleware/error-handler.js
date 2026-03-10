"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const shared_1 = require("@stem-agent/shared");
/**
 * Global error handler middleware.
 * Converts BaseError subclasses to structured JSON responses.
 * Unknown errors return 500.
 */
function errorHandler(err, _req, res, _next) {
    if (err instanceof shared_1.BaseError) {
        res.status(err.statusCode).json(err.toJSON());
        return;
    }
    res.status(500).json({
        name: "InternalServerError",
        code: "INTERNAL_ERROR",
        message: "Internal server error",
        statusCode: 500,
        details: {},
    });
}
//# sourceMappingURL=error-handler.js.map