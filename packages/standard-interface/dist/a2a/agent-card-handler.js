"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentCardRouter = agentCardRouter;
const express_1 = require("express");
/**
 * Converts an AgentCard to A2A v0.3.0 wire format.
 */
function toA2AFormat(card) {
    return {
        name: card.name,
        description: card.description,
        url: card.endpoint,
        version: card.version,
        protocolVersion: card.protocolVersion,
        capabilities: {
            streaming: card.supportsStreaming,
            pushNotifications: card.supportsPushNotifications,
        },
        defaultInputModes: card.defaultInputModes,
        defaultOutputModes: card.defaultOutputModes,
        skills: card.skills.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            tags: s.tags,
            examples: s.examples,
        })),
        securitySchemes: Object.fromEntries(card.securitySchemes.map((s) => [s.name ?? s.scheme ?? "default", s])),
        security: card.securityRequirements,
    };
}
/**
 * Creates Express router serving the agent card at `/.well-known/agent.json`.
 */
function agentCardRouter(agent) {
    const router = (0, express_1.Router)();
    router.get("/.well-known/agent.json", (_req, res) => {
        const card = agent.getAgentCard();
        res.json(toA2AFormat(card));
    });
    return router;
}
//# sourceMappingURL=agent-card-handler.js.map