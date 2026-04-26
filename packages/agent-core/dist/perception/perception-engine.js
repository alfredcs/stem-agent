import { PerceptionResultSchema } from "@stem-agent/shared";
import { createLogger } from "@stem-agent/shared";
/** Intent categories aligned with design doc Sec 5.2. */
const INTENT_KEYWORDS = {
    question: ["what", "how", "why", "when", "where", "who", "which", "?", "explain", "describe"],
    command: ["do", "run", "execute", "create", "delete", "update", "build", "deploy", "install"],
    analysis_request: ["analyze", "compare", "evaluate", "assess", "review", "examine", "investigate"],
    creative_request: ["design", "invent", "brainstorm", "imagine", "suggest", "propose", "generate"],
    debugging: ["bug", "error", "fix", "broken", "fail", "crash", "issue", "debug", "traceback"],
    conversation: ["hello", "hi", "hey", "thanks", "bye", "good morning", "good evening"],
    feedback: ["feedback", "rating", "satisfied", "unsatisfied", "improve", "better", "worse"],
    clarification: ["clarify", "mean", "meant", "unclear", "confused", "rephrase"],
};
/** URL pattern for entity extraction. */
const URL_PATTERN = /https?:\/\/[^\s]+/g;
/** Code block pattern. */
const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
/** Number pattern. */
const NUMBER_PATTERN = /\b\d+(?:\.\d+)?\b/g;
/**
 * Perception Engine — ingests and normalizes incoming messages.
 *
 * Extracts intent, entities, complexity, and caller style signals.
 * Uses deterministic heuristics (no LLM). LLM-based perception
 * can be plugged in as a future enhancement.
 */
export class PerceptionEngine {
    memory;
    log;
    llmClient;
    llmModel;
    systemPromptPrefix;
    constructor(memory, llmClient, llmModel, systemPromptPrefix) {
        this.memory = memory;
        this.llmClient = llmClient;
        this.llmModel = llmModel;
        this.systemPromptPrefix = systemPromptPrefix;
        this.log = createLogger("perception-engine");
    }
    /**
     * Perceive an incoming message and produce a structured PerceptionResult.
     *
     * @param message - The incoming agent message.
     * @param availableTools - Names of tools currently available via MCP.
     * @returns Validated PerceptionResult.
     */
    async perceive(message, availableTools) {
        const text = this.extractText(message);
        const lowerText = text.toLowerCase();
        // Always extract entities deterministically (better for URLs/code)
        const entities = this.extractEntities(text);
        // Try LLM-based perception if available
        if (this.llmClient) {
            try {
                const llmResult = await this.llmPerceive(text);
                if (llmResult) {
                    const domain = this.detectDomain(lowerText, availableTools);
                    // Enrich with memory context
                    let context = {};
                    try {
                        const memories = await this.memory.recall(text, 5);
                        if (memories.length > 0) {
                            context = {
                                relevantMemories: memories.map((m) => m.summary ?? m.id),
                                retrievedMemoryIds: memories.map((m) => m.id),
                            };
                        }
                    }
                    catch (err) {
                        this.log.warn({ err }, "Memory recall failed during perception");
                    }
                    const result = PerceptionResultSchema.parse({
                        intent: llmResult.intent,
                        complexity: llmResult.complexity,
                        urgency: llmResult.urgency,
                        domain,
                        entities,
                        callerStyleSignals: llmResult.callerStyleSignals ?? {},
                        context,
                        metadata: {
                            messageId: message.id,
                            contentType: message.contentType,
                            toolsAvailable: availableTools.length,
                            llmAssisted: true,
                        },
                    });
                    this.log.debug({ intent: result.intent, complexity: result.complexity }, "LLM perception complete");
                    return result;
                }
            }
            catch (err) {
                this.log.warn({ err }, "LLM perception failed, falling back to heuristics");
            }
        }
        const intent = this.classifyIntent(lowerText);
        const complexity = this.classifyComplexity(text, entities);
        const urgency = this.detectUrgency(lowerText);
        const domain = this.detectDomain(lowerText, availableTools);
        const callerStyleSignals = this.extractCallerStyleSignals(message);
        // Enrich with memory context
        let context = {};
        try {
            const memories = await this.memory.recall(text, 5);
            if (memories.length > 0) {
                context = {
                    relevantMemories: memories.map((m) => m.summary ?? m.id),
                    retrievedMemoryIds: memories.map((m) => m.id),
                };
            }
        }
        catch (err) {
            this.log.warn({ err }, "Memory recall failed during perception");
        }
        const result = PerceptionResultSchema.parse({
            intent,
            complexity,
            urgency,
            domain,
            entities,
            callerStyleSignals,
            context,
            metadata: {
                messageId: message.id,
                contentType: message.contentType,
                toolsAvailable: availableTools.length,
            },
        });
        this.log.debug({ intent, complexity, entityCount: entities.length }, "Perception complete");
        return result;
    }
    /** Attempt LLM-based perception. Returns null on parse failure. */
    async llmPerceive(text) {
        const perceptionSystem = [
            "You are a perception engine. Analyze the user message and return ONLY valid JSON with these fields:",
            '- "intent": string (one of: question, command, analysis_request, creative_request, debugging, conversation, feedback, clarification)',
            '- "complexity": "simple" | "medium" | "complex"',
            '- "urgency": "low" | "medium" | "high"',
            '- "callerStyleSignals": object with numeric values 0-1 for keys: formality, verbosity, technicalDepth',
            "Return ONLY the JSON object, no markdown fences or extra text.",
        ].join("\n");
        const systemPrompt = this.systemPromptPrefix
            ? `${this.systemPromptPrefix}\n\n${perceptionSystem}`
            : perceptionSystem;
        const result = await this.llmClient.chat([
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
        ], { model: this.llmModel, temperature: 0.1 });
        try {
            const parsed = JSON.parse(result.content);
            if (parsed.intent && parsed.complexity && parsed.urgency) {
                return parsed;
            }
        }
        catch {
            // JSON parse failed
        }
        return null;
    }
    /** Extract plain text from message content. */
    extractText(message) {
        if (typeof message.content === "string")
            return message.content;
        if (message.content && typeof message.content === "object" && "text" in message.content) {
            return String(message.content.text);
        }
        return String(message.content ?? "");
    }
    /** Classify intent using keyword heuristics. */
    classifyIntent(lowerText) {
        let bestIntent = "conversation";
        let bestScore = 0;
        for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
            let score = 0;
            for (const kw of keywords) {
                if (lowerText.includes(kw))
                    score++;
            }
            if (score > bestScore) {
                bestScore = score;
                bestIntent = intent;
            }
        }
        return bestIntent;
    }
    /** Extract entities: URLs, code blocks, numbers. */
    extractEntities(text) {
        const entities = [];
        const urls = text.match(URL_PATTERN);
        if (urls) {
            for (const url of urls) {
                entities.push({ name: url, type: "url", value: url });
            }
        }
        const codeBlocks = text.match(CODE_BLOCK_PATTERN);
        if (codeBlocks) {
            for (let i = 0; i < codeBlocks.length; i++) {
                entities.push({ name: `code_block_${i}`, type: "code", value: codeBlocks[i] });
            }
        }
        const numbers = text.match(NUMBER_PATTERN);
        if (numbers) {
            for (const num of numbers) {
                entities.push({ name: num, type: "number", value: parseFloat(num) });
            }
        }
        return entities;
    }
    /** Classify complexity based on text length, entity count, and structure. */
    classifyComplexity(text, entities) {
        const wordCount = text.split(/\s+/).length;
        const hasCode = entities.some((e) => e.type === "code");
        if (wordCount > 200 || entities.length > 5 || hasCode)
            return "complex";
        if (wordCount > 50 || entities.length > 2)
            return "medium";
        return "simple";
    }
    /** Detect urgency from keywords. */
    detectUrgency(lowerText) {
        const highUrgency = ["urgent", "asap", "immediately", "critical", "emergency", "blocking"];
        const lowUrgency = ["whenever", "no rush", "low priority", "eventually"];
        if (highUrgency.some((kw) => lowerText.includes(kw)))
            return "high";
        if (lowUrgency.some((kw) => lowerText.includes(kw)))
            return "low";
        return "medium";
    }
    /** Detect domain from text and available tool names. */
    detectDomain(lowerText, availableTools) {
        // Check if any tool names appear in the text
        for (const tool of availableTools) {
            if (lowerText.includes(tool.toLowerCase()))
                return tool;
        }
        return undefined;
    }
    /** Extract caller style signals from message metadata. */
    extractCallerStyleSignals(message) {
        const text = this.extractText(message);
        const signals = {};
        // Formality: presence of greetings, please, thank you
        const formalWords = ["please", "kindly", "thank you", "regards"];
        const informalWords = ["hey", "yo", "lol", "haha"];
        const formalCount = formalWords.filter((w) => text.toLowerCase().includes(w)).length;
        const informalCount = informalWords.filter((w) => text.toLowerCase().includes(w)).length;
        signals.formality = formalCount > informalCount ? 0.8 : informalCount > formalCount ? 0.2 : 0.5;
        // Verbosity: word count relative to threshold
        const wordCount = text.split(/\s+/).length;
        signals.verbosity = Math.min(wordCount / 100, 1);
        // Technical depth: presence of technical terms, code blocks
        const techTerms = ["api", "function", "class", "database", "server", "algorithm", "interface"];
        const techCount = techTerms.filter((t) => text.toLowerCase().includes(t)).length;
        signals.technicalDepth = Math.min(techCount / 3, 1);
        return signals;
    }
}
//# sourceMappingURL=perception-engine.js.map