/**
 * Creates Express middleware that logs each request/response with pino.
 */
export function loggingMiddleware(logger) {
    return (req, res, next) => {
        const start = Date.now();
        const requestId = req.headers["x-request-id"];
        res.on("finish", () => {
            logger.info({
                method: req.method,
                path: req.path,
                status: res.statusCode,
                durationMs: Date.now() - start,
                requestId,
            }, "request completed");
        });
        next();
    };
}
//# sourceMappingURL=logging.js.map