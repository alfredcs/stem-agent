"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const uuid_1 = require("uuid");
/**
 * Middleware that assigns a unique X-Request-Id to every request.
 * If the client sends one, it is preserved; otherwise a UUID is generated.
 */
function requestIdMiddleware(req, res, next) {
    const id = req.headers["x-request-id"] ?? (0, uuid_1.v4)();
    req.headers["x-request-id"] = id;
    res.setHeader("X-Request-Id", id);
    next();
}
//# sourceMappingURL=request-id.js.map