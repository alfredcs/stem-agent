/** Static pricing table per 1M tokens. */
const PRICING = {
    haiku: { input: 0.80, output: 3.20 },
    sonnet: { input: 3.00, output: 15.00 },
    opus: { input: 15.00, output: 75.00 },
};
function estimateCost(model, inputTokens, outputTokens) {
    const key = Object.keys(PRICING).find((k) => model.toLowerCase().includes(k));
    const pricing = key ? PRICING[key] : PRICING.sonnet;
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
/**
 * Anthropic LLM client supporting both direct API and Amazon Bedrock.
 */
export class AnthropicLLMClient {
    config;
    sdkClient = null;
    constructor(config) {
        this.config = config;
    }
    async getClient() {
        if (this.sdkClient)
            return this.sdkClient;
        if (this.config.provider === "amazon_bedrock") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mod = await import("@anthropic-ai/bedrock-sdk");
            const BedrockCtor = mod.AnthropicBedrock ?? mod.default?.AnthropicBedrock ?? mod.default;
            this.sdkClient = new BedrockCtor({ awsRegion: process.env.AWS_REGION ?? "us-west-2" });
        }
        else {
            const mod = await import("@anthropic-ai/sdk");
            const Anthropic = mod.default ?? mod.Anthropic;
            this.sdkClient = new Anthropic();
        }
        return this.sdkClient;
    }
    async chat(messages, opts) {
        const client = await this.getClient();
        const model = opts?.model ?? this.config.default;
        const systemMsg = messages.find((m) => m.role === "system");
        const nonSystemMsgs = messages.filter((m) => m.role !== "system");
        const params = {
            model,
            max_tokens: opts?.maxTokens ?? this.config.maxTokens,
            temperature: opts?.temperature ?? this.config.temperature,
            messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
        };
        if (systemMsg) {
            params.system = systemMsg.content;
        }
        const response = await client.messages.create(params);
        const textBlock = response.content.find((b) => b.type === "text");
        const content = textBlock?.text ?? "";
        const inputTokens = response.usage.input_tokens;
        const outputTokens = response.usage.output_tokens;
        return {
            content,
            inputTokens,
            outputTokens,
            model: response.model,
            costUsd: estimateCost(response.model, inputTokens, outputTokens),
        };
    }
}
/**
 * No-op LLM client for tests or when no API key is available.
 */
export class NoOpLLMClient {
    async chat(_messages, _opts) {
        return {
            content: "No LLM configured",
            inputTokens: 0,
            outputTokens: 0,
            model: "none",
            costUsd: 0,
        };
    }
}
//# sourceMappingURL=client.js.map