import { StemAgentClient } from '@stem-agent/caller-layer';

const client = new StemAgentClient({
  baseUrl: 'http://localhost:8080',
  apiKey: 'your-api-key',  // optional, if auth is enabled
});

// Simple chat (POST /api/v1/chat)
const response = await client.chat({
  message: 'Explain the CAP theorem',
  callerId: 'user-123',
});
console.log(response.content);

// Streaming chat (GET /api/v1/chat/stream via SSE)
for await (const chunk of client.chatStream({
  message: 'Write a detailed analysis of distributed systems',
})) {
  if (chunk.status === 'completed') {
    console.log(chunk.content);
  }
}

// Introspection
const card = await client.getAgentCard();       // GET /.well-known/agent.json
const tools = await client.listTools();          // GET /api/v1/mcp/tools
const profile = await client.getCallerProfile('user-123');  // GET /api/v1/profile/:id
const behavior = await client.getBehaviorParams();           // GET /api/v1/behavior

// WebSocket (ws://host/ws)
const ws = client.connectWebSocket();
ws.send({ message: 'Hello via WebSocket' });
for await (const msg of ws.messages()) {
  console.log(msg);
}
ws.close();

// Clean up all connections
client.close();
