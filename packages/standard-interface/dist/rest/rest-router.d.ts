import { Router } from "express";
import type { IStemAgent, IMemoryManager, IMCPManager } from "@stem-agent/shared";
interface RestRouterDeps {
    agent: IStemAgent;
    memoryManager?: IMemoryManager;
    mcpManager?: IMCPManager;
}
/**
 * Creates the Express router for all REST API v1 endpoints.
 */
export declare function restRouter(deps: RestRouterDeps): Router;
export {};
//# sourceMappingURL=rest-router.d.ts.map