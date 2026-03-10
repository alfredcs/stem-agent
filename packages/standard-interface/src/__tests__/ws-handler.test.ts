import { describe, it, expect, afterEach } from "vitest";
import { createServer } from "node:http";
import express from "express";
import WebSocket from "ws";
import { WsHandler } from "../websocket/ws-handler.js";
import { WsEventType } from "../websocket/ws-events.js";
import { RoomManager } from "../websocket/ws-room.js";
import { createMockAgent } from "./helpers.js";
import { createLogger } from "@stem-agent/shared";

function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    ws.once("message", (data) => {
      resolve(JSON.parse(data.toString()));
    });
  });
}

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    if (ws.readyState === WebSocket.OPEN) {
      resolve();
    } else {
      ws.once("open", resolve);
    }
  });
}

describe("WsHandler", () => {
  let server: ReturnType<typeof createServer>;
  let wsHandler: WsHandler;

  afterEach(async () => {
    wsHandler?.close();
    await new Promise<void>((resolve, reject) => {
      server?.close((err) => (err ? reject(err) : resolve()));
    });
  });

  async function setup() {
    const agent = createMockAgent();
    const logger = createLogger("test", { level: "silent" });
    const app = express();
    server = createServer(app);
    wsHandler = new WsHandler(agent, logger);
    wsHandler.attach(server);

    const port = await new Promise<number>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        resolve(typeof addr === "object" ? addr!.port : 0);
      });
    });

    return port;
  }

  it("accepts WebSocket connections", async () => {
    const port = await setup();
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await waitForOpen(ws);
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("responds to ping with pong", async () => {
    const port = await setup();
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await waitForOpen(ws);

    ws.send(JSON.stringify({ type: WsEventType.PING }));
    const msg = await waitForMessage(ws);
    expect(msg.type).toBe(WsEventType.PONG);
    ws.close();
  });

  it("processes client messages and returns task result", async () => {
    const port = await setup();
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await waitForOpen(ws);

    // Collect messages before sending
    const messages: Record<string, unknown>[] = [];
    const gotTwo = new Promise<void>((resolve) => {
      ws.on("message", (data) => {
        messages.push(JSON.parse(data.toString()));
        if (messages.length >= 2) resolve();
      });
    });

    ws.send(
      JSON.stringify({ type: WsEventType.CLIENT_MESSAGE, message: "Hi" }),
    );

    await gotTwo;

    expect(messages[0]!.type).toBe(WsEventType.TASK_STARTED);
    expect(messages[1]!.type).toBe(WsEventType.TASK_COMPLETED);
    expect(
      (messages[1]!.data as Record<string, unknown>).content,
    ).toBe("Hello from the agent");

    ws.close();
  });

  it("returns error for invalid JSON", async () => {
    const port = await setup();
    const ws = new WebSocket(`ws://localhost:${port}/ws`);
    await waitForOpen(ws);

    ws.send("not json");
    const msg = await waitForMessage(ws);
    expect(msg.type).toBe(WsEventType.ERROR);
    ws.close();
  });
});

describe("RoomManager", () => {
  it("joins and broadcasts to room", () => {
    const rooms = new RoomManager();
    const sent: string[] = [];

    const ws1 = {
      readyState: 1,
      OPEN: 1,
      send: (data: string) => sent.push(`ws1:${data}`),
    } as unknown as WebSocket;
    const ws2 = {
      readyState: 1,
      OPEN: 1,
      send: (data: string) => sent.push(`ws2:${data}`),
    } as unknown as WebSocket;

    rooms.join("room-a", ws1);
    rooms.join("room-a", ws2);

    rooms.broadcast("room-a", "hello");
    expect(sent).toEqual(["ws1:hello", "ws2:hello"]);
  });

  it("excludes sender from broadcast", () => {
    const rooms = new RoomManager();
    const sent: string[] = [];

    const ws1 = {
      readyState: 1,
      OPEN: 1,
      send: (data: string) => sent.push(`ws1:${data}`),
    } as unknown as WebSocket;
    const ws2 = {
      readyState: 1,
      OPEN: 1,
      send: (data: string) => sent.push(`ws2:${data}`),
    } as unknown as WebSocket;

    rooms.join("room-a", ws1);
    rooms.join("room-a", ws2);

    rooms.broadcast("room-a", "hello", ws1);
    expect(sent).toEqual(["ws2:hello"]);
  });

  it("handles leave and leaveAll", () => {
    const rooms = new RoomManager();
    const ws1 = { readyState: 1, OPEN: 1, send: () => {} } as unknown as WebSocket;

    rooms.join("r1", ws1);
    rooms.join("r2", ws1);
    expect(rooms.size("r1")).toBe(1);

    rooms.leave("r1", ws1);
    expect(rooms.size("r1")).toBe(0);

    rooms.leaveAll(ws1);
    expect(rooms.size("r2")).toBe(0);
  });
});
