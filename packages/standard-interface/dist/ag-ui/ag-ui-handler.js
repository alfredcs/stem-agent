import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { RunAgentInputSchema, AGUISimpleInputSchema, AGUIEventType } from "@stem-agent/shared";
/**
 * AG-UI protocol handler implementing SSE event streaming.
 *
 * Accepts POST /ag-ui with either:
 * - Full RunAgentInput: { threadId, runId, messages, tools, state, ... }
 * - Simple input: { message, threadId?, runId?, state? }
 *
 * Streams typed AG-UI events as Server-Sent Events using the format:
 *   event: {eventType}\ndata: {json}\n\n
 */
export class AGUIHandler {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    createRouter() {
        const router = Router();
        router.post("/ag-ui", async (req, res) => {
            // Try full RunAgentInput first, then simple input
            const fullParsed = RunAgentInputSchema.safeParse(req.body);
            const simpleParsed = AGUISimpleInputSchema.safeParse(req.body);
            if (!fullParsed.success && !simpleParsed.success) {
                res.status(400).json({
                    error: "Invalid AG-UI input",
                    details: fullParsed.error.issues,
                });
                return;
            }
            // Normalize into threadId, runId, content, state
            let threadId;
            let runId;
            let content;
            let state;
            if (fullParsed.success) {
                const input = fullParsed.data;
                threadId = input.threadId;
                runId = input.runId;
                const lastUserMsg = [...input.messages].reverse().find((m) => m.role === "user");
                content = lastUserMsg?.content ?? "";
                state = input.state;
            }
            else {
                const input = simpleParsed.data;
                threadId = input.threadId ?? uuidv4();
                runId = input.runId ?? uuidv4();
                content = input.message;
                state = input.state ?? {};
            }
            const principal = req.principal ?? null;
            // Set up SSE
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.flushHeaders();
            const emit = (event) => {
                res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
            };
            try {
                await this.streamPipeline(threadId, runId, content, state, principal, emit);
            }
            catch (err) {
                emit({
                    type: AGUIEventType.RUN_ERROR,
                    message: err instanceof Error ? err.message : "Internal error",
                    timestamp: Date.now(),
                });
            }
            res.end();
        });
        return router;
    }
    /**
     * Streams through the StemAgent pipeline, emitting AG-UI events.
     */
    async streamPipeline(threadId, runId, content, state, principal, emit) {
        const message = {
            id: uuidv4(),
            role: "user",
            content,
            contentType: "text/plain",
            metadata: { threadId, runId, aguiState: state },
            sessionId: threadId,
            timestamp: Date.now(),
        };
        // RUN_STARTED
        emit({
            type: AGUIEventType.RUN_STARTED,
            threadId,
            runId,
            timestamp: Date.now(),
        });
        const taskId = uuidv4();
        let lastResponse;
        for await (const chunk of this.agent.stream(taskId, message)) {
            lastResponse = chunk;
            const phase = chunk.metadata?.phase ?? "unknown";
            this.emitPhaseEvents(chunk, phase, emit);
        }
        // Final text message from the last response
        if (lastResponse?.content) {
            const msgId = uuidv4();
            emit({
                type: AGUIEventType.TEXT_MESSAGE_START,
                messageId: msgId,
                role: "assistant",
                timestamp: Date.now(),
            });
            emit({
                type: AGUIEventType.TEXT_MESSAGE_CONTENT,
                messageId: msgId,
                delta: String(lastResponse.content),
                timestamp: Date.now(),
            });
            emit({
                type: AGUIEventType.TEXT_MESSAGE_END,
                messageId: msgId,
                timestamp: Date.now(),
            });
        }
        // RUN_FINISHED
        emit({
            type: AGUIEventType.RUN_FINISHED,
            threadId,
            runId,
            result: lastResponse?.content,
            timestamp: Date.now(),
        });
    }
    /**
     * Map a single pipeline phase yield into AG-UI events.
     */
    emitPhaseEvents(chunk, phase, emit) {
        const ts = Date.now();
        // STEP_STARTED
        emit({ type: AGUIEventType.STEP_STARTED, stepName: phase, timestamp: ts });
        switch (phase) {
            case "perception": {
                const msgId = uuidv4();
                emit({ type: AGUIEventType.TEXT_MESSAGE_START, messageId: msgId, role: "assistant", timestamp: ts });
                emit({ type: AGUIEventType.TEXT_MESSAGE_CONTENT, messageId: msgId, delta: String(chunk.content), timestamp: ts });
                emit({ type: AGUIEventType.TEXT_MESSAGE_END, messageId: msgId, timestamp: ts });
                break;
            }
            case "reasoning": {
                const msgId = uuidv4();
                emit({ type: AGUIEventType.REASONING_START, messageId: msgId, timestamp: ts });
                emit({ type: AGUIEventType.REASONING_MESSAGE_START, messageId: msgId, role: "assistant", timestamp: ts });
                emit({ type: AGUIEventType.REASONING_MESSAGE_CONTENT, messageId: msgId, delta: String(chunk.content), timestamp: ts });
                if (chunk.reasoningTrace) {
                    for (const trace of chunk.reasoningTrace) {
                        emit({ type: AGUIEventType.REASONING_MESSAGE_CONTENT, messageId: msgId, delta: `\n${trace}`, timestamp: ts });
                    }
                }
                emit({ type: AGUIEventType.REASONING_MESSAGE_END, messageId: msgId, timestamp: ts });
                emit({ type: AGUIEventType.REASONING_END, messageId: msgId, timestamp: ts });
                break;
            }
            case "planning": {
                emit({
                    type: AGUIEventType.STATE_SNAPSHOT,
                    snapshot: {
                        phase: "planning",
                        content: chunk.content,
                        metadata: chunk.metadata,
                    },
                    timestamp: ts,
                });
                break;
            }
            case "execution": {
                const stepsExecuted = chunk.metadata?.stepsExecuted;
                if (stepsExecuted && stepsExecuted > 0) {
                    const toolCallId = uuidv4();
                    const msgId = uuidv4();
                    emit({
                        type: AGUIEventType.TOOL_CALL_START,
                        toolCallId,
                        toolCallName: chunk.metadata?.strategy ?? "execute",
                        parentMessageId: msgId,
                        timestamp: ts,
                    });
                    emit({
                        type: AGUIEventType.TOOL_CALL_ARGS,
                        toolCallId,
                        delta: JSON.stringify({ steps: stepsExecuted }),
                        timestamp: ts,
                    });
                    emit({ type: AGUIEventType.TOOL_CALL_END, toolCallId, timestamp: ts });
                    emit({
                        type: AGUIEventType.TOOL_CALL_RESULT,
                        messageId: msgId,
                        toolCallId,
                        content: chunk.content,
                        role: "tool",
                        timestamp: ts,
                    });
                }
                break;
            }
            default: {
                emit({
                    type: AGUIEventType.CUSTOM,
                    name: `phase.${phase}`,
                    value: { content: chunk.content, metadata: chunk.metadata },
                    timestamp: ts,
                });
                break;
            }
        }
        // STEP_FINISHED
        emit({ type: AGUIEventType.STEP_FINISHED, stepName: phase, timestamp: ts });
    }
}
//# sourceMappingURL=ag-ui-handler.js.map