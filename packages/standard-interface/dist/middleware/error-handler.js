import { BaseError } from "@stem-agent/shared";
/**
 * Global error handler middleware.
 * Converts BaseError subclasses to structured JSON responses.
 * Unknown errors return 500.
 */
export function errorHandler(err, _req, res, _next) {
    if (err instanceof BaseError) {
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