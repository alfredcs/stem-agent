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

/** Static pricing table per 1M tokens. */
const PRICING: Record<string, { input: number; output: number }> = {
  haiku: { input: 0.80, output: 3.20 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const key = Object.keys(PRICING).find((k) => model.toLowerCase().includes(k));
  const pricing = key ? PRICING[key] : PRICING.sonnet;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Anthropic LLM client supporting both direct API and Amazon Bedrock.
 */
export class AnthropicLLMClient implements ILLMClient {
  private readonly config: LLMConfig;
  private sdkClient: unknown | null = null;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  private async getClient(): Promise<unknown> {
    if (this.sdkClient) return this.sdkClient;

    if (this.config.provider === "amazon_bedrock") {
      // Bedrock client may be available as a subpath export in newer SDK versions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = await import("@anthropic-ai/sdk" as any);
      const BedrockCtor = mod.AnthropicBedrock ?? mod.default?.AnthropicBedrock;
      if (BedrockCtor) {
        this.sdkClient = new BedrockCtor();
      } else {
        // Fallback: use standard client (works with Bedrock-compatible endpoints)
        const Anthropic = mod.default ?? mod.Anthropic;
        this.sdkClient = new Anthropic();
      }
    } else {
      const mod = await import("@anthropic-ai/sdk");
      const Anthropic = mod.default ?? mod.Anthropic;
      this.sdkClient = new Anthropic();
    }
    return this.sdkClient;
  }

  async chat(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResult> {
    const client = await this.getClient() as {
      messages: {
        create(params: unknown): Promise<{
          content: Array<{ type: string; text?: string }>;
          usage: { input_tokens: number; output_tokens: number };
          model: string;
        }>;
      };
    };

    const model = opts?.model ?? this.config.default;
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystemMsgs = messages.filter((m) => m.role !== "system");

    const params: Record<string, unknown> = {
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
export class NoOpLLMClient implements ILLMClient {
  async chat(_messages: ChatMessage[], _opts?: ChatOptions): Promise<ChatResult> {
    return {
      content: "No LLM configured",
      inputTokens: 0,
      outputTokens: 0,
      model: "none",
      costUsd: 0,
    };
  }
}
