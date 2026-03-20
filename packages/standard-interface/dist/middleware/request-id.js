import { v4 as uuidv4 } from "uuid";
/**
 * Middleware that assigns a unique X-Request-Id to every request.
 * If the client sends one, it is preserved; otherwise a UUID is generated.
 */
export function requestIdMiddleware(req, res, next) {
    const id = req.headers["x-request-id"] ?? uuidv4();
    req.headers["x-request-id"] = id;
    res.setHeader("X-Request-Id", id);
    next();
}
//# sourceMappingURL=request-id.js.map