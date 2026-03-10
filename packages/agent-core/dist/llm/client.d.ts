import type { LLMConfig } from "@stem-agent/shared";
/** Chat message for the LLM client. */
export interface ChatMessage {
    role: "user" | "assistant" | "system";
    content: string;
}
/** Options for a chat call. */
export interface ChatOptions {
    model?: string;
    maxTokens?: number;
    temperature?: number;
}
/** Result from a chat call. */
export interface ChatResult {
    content: string;
    inputTokens: number;
    outputTokens: number;
    model: string;
    costUsd: number;
}
/** Pluggable LLM client interface. */
export interface ILLMClient {
    chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
}
/**
 * Anthropic LLM client supporting both direct API and Amazon Bedrock.
 */
export declare class AnthropicLLMClient implements ILLMClient {
    private readonly config;
    private sdkClient;
    constructor(config: LLMConfig);
    private getClient;
    chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult>;
}
/**
 * No-op LLM client for tests or when no API key is available.
 */
export declare class NoOpLLMClient implements ILLMClient {
    chat(_messages: ChatMessage[], _opts?: ChatOptions): Promise<ChatResult>;
}
//# sourceMappingURL=client.d.ts.map