import type {
  AgentCard,
  AgentResponse,
  BehaviorParameters,
  CallerProfile,
} from "@stem-agent/shared";
import { createLogger, type Logger } from "@stem-agent/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options for constructing a {@link StemAgentClient}. */
export interface StemAgentClientOptions {
  /** Base HTTP URL of the STEM agent (e.g. `http://localhost:8000`). */
  baseUrl: string;
  /** Override WebSocket URL. Defaults to baseUrl with ws(s):// scheme + `/ws`. */
  wsUrl?: string;
  /** Optional API key sent as `X-API-Key` header. */
  apiKey?: string;
  /** Extra headers merged into every request. */
  headers?: Record<string, string>;
  /** Injected logger. Falls back to a default pino logger. */
  logger?: Logger;
}

/** Payload sent to the chat endpoints. */
export interface ChatRequest {
  message: string;
  callerId?: string;
  sessionId?: string;
}

/** Shape returned by the REST chat endpoint. */
export interface ChatResponse {
  task_id: string;
  status: string;
  content: unknown;
  reasoning_trace?: string[];
}

/** Typed wrapper around a WebSocket connection to the agent. */
export interface AgentWebSocket {
  /** Send a chat message over the open socket. */
  send(msg: ChatRequest): void;
  /** Async iterator yielding responses as they arrive. */
  messages(): AsyncIterable<ChatResponse>;
  /** Close the underlying socket. */
  close(): void;
}

/** Tool entry returned by `/api/v1/mcp/tools`. */
export interface ToolEntry {
  name: string;
  description: string;
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

/**
 * Parse a `text/event-stream` response body into an async iterable of
 * JSON-parsed `data:` lines. Stops when the stream ends or the reader
 * signals done.
 */
async function* parseSSE<T>(response: Response): AsyncIterable<T> {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // Keep the last (possibly incomplete) chunk in buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("data: ")) {
          const json = trimmed.slice(6);
          if (json === "[DONE]") return;
          try {
            yield JSON.parse(json) as T;
          } catch {
            // skip unparseable lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// StemAgentClient
// ---------------------------------------------------------------------------

/**
 * High-level TypeScript client for the STEM Agent REST + WebSocket APIs.
 *
 * @example
 * ```ts
 * const client = new StemAgentClient({ baseUrl: "http://localhost:8000" });
 * const res = await client.chat({ message: "Hello" });
 * console.log(res.content);
 * ```
 */
export class StemAgentClient {
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private readonly log: Logger;
  private activeSockets: WebSocket[] = [];

  constructor(opts: StemAgentClientOptions) {
    // Strip trailing slash
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.wsUrl =
      opts.wsUrl ??
      this.baseUrl.replace(/^http/, "ws") + "/ws";

    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...opts.headers,
    };
    if (opts.apiKey) {
      this.defaultHeaders["X-API-Key"] = opts.apiKey;
    }

    this.log = opts.logger ?? createLogger("stem-agent-client");
  }

  // ---- REST helpers -------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    this.log.debug({ method, url }, "request");

    const res = await fetch(url, {
      method,
      headers: this.defaultHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `STEM agent request failed: ${res.status} ${res.statusText} — ${text}`,
      );
    }

    return (await res.json()) as T;
  }

  // ---- Public API ---------------------------------------------------------

  /**
   * Send a chat message and receive the full response.
   * Maps to `POST /api/v1/chat`.
   */
  async chat(req: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>("POST", "/api/v1/chat", {
      message: req.message,
      caller_id: req.callerId,
      session_id: req.sessionId,
    });
  }

  /**
   * Send a chat message and stream partial responses via SSE.
   * Maps to `POST /api/v1/chat/stream`.
   */
  async *chatStream(req: ChatRequest): AsyncIterable<AgentResponse> {
    const url = `${this.baseUrl}/api/v1/chat/stream`;
    this.log.debug({ url }, "chatStream");

    const res = await fetch(url, {
      method: "POST",
      headers: this.defaultHeaders,
      body: JSON.stringify({
        message: req.message,
        caller_id: req.callerId,
        session_id: req.sessionId,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `STEM agent stream failed: ${res.status} ${res.statusText} — ${text}`,
      );
    }

    yield* parseSSE<AgentResponse>(res);
  }

  /**
   * Open a WebSocket connection to the agent.
   * Maps to `GET /ws`.
   */
  connectWebSocket(token?: string): AgentWebSocket {
    const url = token ? `${this.wsUrl}?token=${encodeURIComponent(token)}` : this.wsUrl;
    this.log.debug({ url }, "connectWebSocket");

    const ws = new WebSocket(url);
    this.activeSockets.push(ws);

    return {
      send(msg: ChatRequest): void {
        ws.send(
          JSON.stringify({
            message: msg.message,
            caller_id: msg.callerId,
            session_id: msg.sessionId,
          }),
        );
      },

      async *messages(): AsyncIterable<ChatResponse> {
        // Queue incoming messages so the async iterator can consume them
        const queue: ChatResponse[] = [];
        let resolve: (() => void) | null = null;
        let closed = false;

        ws.addEventListener("message", (event: MessageEvent) => {
          try {
            const data = JSON.parse(
              typeof event.data === "string" ? event.data : String(event.data),
            ) as ChatResponse;
            queue.push(data);
            resolve?.();
          } catch {
            // skip unparseable
          }
        });

        ws.addEventListener("close", () => {
          closed = true;
          resolve?.();
        });

        ws.addEventListener("error", () => {
          closed = true;
          resolve?.();
        });

        while (!closed) {
          if (queue.length > 0) {
            yield queue.shift()!;
          } else {
            await new Promise<void>((r) => {
              resolve = r;
            });
          }
        }

        // Drain remaining
        while (queue.length > 0) {
          yield queue.shift()!;
        }
      },

      close(): void {
        ws.close();
      },
    };
  }

  /**
   * Fetch the A2A agent card.
   * Maps to `GET /.well-known/agent.json`.
   */
  async getAgentCard(): Promise<AgentCard> {
    return this.request<AgentCard>("GET", "/.well-known/agent.json");
  }

  /**
   * Fetch the learned caller profile.
   * Maps to `GET /api/v1/agent/profile/:callerId`.
   */
  async getCallerProfile(callerId: string): Promise<CallerProfile> {
    return this.request<CallerProfile>(
      "GET",
      `/api/v1/agent/profile/${encodeURIComponent(callerId)}`,
    );
  }

  /**
   * Fetch current self-adapted behavior parameters.
   * Maps to `GET /api/v1/agent/behavior`.
   */
  async getBehaviorParams(): Promise<BehaviorParameters> {
    return this.request<BehaviorParameters>("GET", "/api/v1/agent/behavior");
  }

  /**
   * List all available MCP tools.
   * Maps to `GET /api/v1/mcp/tools`.
   */
  async listTools(): Promise<ToolEntry[]> {
    const res = await this.request<{ tools: ToolEntry[] }>(
      "GET",
      "/api/v1/mcp/tools",
    );
    return res.tools;
  }

  /**
   * Close all active WebSocket connections.
   */
  close(): void {
    for (const ws of this.activeSockets) {
      try {
        ws.close();
      } catch {
        // ignore
      }
    }
    this.activeSockets = [];
    this.log.debug("client closed");
  }
}
