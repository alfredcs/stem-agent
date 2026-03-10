# MCP Integration Layer (Layer 5) — Implementation Plan

## Overview

Build `packages/mcp-integration/` — the MCP Integration Layer that manages connections to MCP servers, discovers tools, and routes tool calls. Implements `IMCPManager` from `@stem-agent/shared`.

## Key Design Decisions

1. **No real MCP SDK dependency**: The servers are *our own* MCP servers that expose domain tools. The transport layer abstracts stdio/SSE communication. Since we don't have `@modelcontextprotocol/sdk` in package.json, we'll define our own transport abstractions and server base class that follow the MCP protocol patterns.

2. **Dependency injection everywhere**: All servers receive their dependencies (logger, config, adapters) via constructor. No singletons or global state.

3. **Each server is a tool provider**: Servers register tools with the manager. The manager routes `callTool()` to the correct server. Servers don't communicate directly with each other.

## File Structure

```
src/
├── index.ts                          # Public API exports
├── manager.ts                        # MCPManager (implements IMCPManager)
├── errors.ts                         # MCP-specific error classes (extend BaseError)
├── transport/
│   ├── base-transport.ts             # Abstract transport interface
│   ├── stdio-transport.ts            # Stdio transport implementation
│   └── sse-transport.ts              # SSE transport implementation
├── servers/
│   ├── base-server.ts                # Abstract base for all MCP servers
│   ├── database-server.ts            # DB operations server
│   ├── api-server.ts                 # REST/GraphQL API server
│   ├── file-server.ts                # Filesystem operations server
│   ├── tool-server.ts                # CLI tool execution server
│   └── custom-server.ts              # Plugin architecture server
└── __tests__/
    ├── manager.test.ts
    ├── transport/
    │   ├── stdio-transport.test.ts
    │   └── sse-transport.test.ts
    └── servers/
        ├── database-server.test.ts
        ├── api-server.test.ts
        ├── file-server.test.ts
        ├── tool-server.test.ts
        └── custom-server.test.ts
```

## Implementation Steps

### Step 1: Errors (`src/errors.ts`)
Define MCP-specific errors extending `BaseError` from `@stem-agent/shared`:
- `MCPConnectionError` — server connection failures
- `MCPToolNotFoundError` — tool lookup failures
- `MCPToolExecutionError` — tool runtime failures
- `MCPTransportError` — transport-level errors
- `MCPServerNotFoundError` — server registry miss

### Step 2: Transport Layer (`src/transport/`)

**`base-transport.ts`**: Abstract `IMCPTransport` interface:
- `connect(): Promise<void>`
- `disconnect(): Promise<void>`
- `send(method: string, params: unknown): Promise<unknown>`
- `isConnected(): boolean`
- `onNotification(handler): void`

**`stdio-transport.ts`**: Spawns a child process, communicates via JSON-RPC over stdin/stdout. Handles process lifecycle, line-buffered JSON parsing.

**`sse-transport.ts`**: HTTP client for SSE-based MCP servers. Sends requests via POST, receives responses/notifications via SSE stream.

### Step 3: Base Server (`src/servers/base-server.ts`)
Abstract class `BaseMCPServer`:
- Holds config, logger, transport, and registered tools
- `start() / stop() / healthCheck()` lifecycle
- `registerTool(name, handler, schema)` — registers a tool
- `listTools(): MCPTool[]` — returns registered tools
- `executeTool(name, args): Promise<MCPToolResult>` — dispatches to handler
- Subclasses override `initialize()` to register their tools

### Step 4: Database Server (`src/servers/database-server.ts`)
- Constructor takes a `IDatabaseAdapter` interface (for PostgreSQL/SQLite swap)
- `IDatabaseAdapter`: `query()`, `execute()`, `getSchema()`, `beginTransaction()`, `commit()`, `rollback()`
- Tools: `db_query`, `db_insert`, `db_update`, `db_delete`, `db_schema_inspect`, `db_migrate`
- Parameterized queries only (no string interpolation of user input)
- Connection pooling delegated to the adapter

### Step 5: API Server (`src/servers/api-server.ts`)
- Constructor takes an `IHttpClient` interface
- Dynamic tool registration from OpenAPI-style definitions (passed as config)
- Tools created from endpoint definitions: method, path, params, auth
- Rate limiting via token bucket (in-memory)
- Retry with exponential backoff
- Response caching (TTL-based, in-memory Map)

### Step 6: File Server (`src/servers/file-server.ts`)
- Constructor takes an `IFileSystemAdapter` interface (local FS / S3)
- `IFileSystemAdapter`: `read()`, `write()`, `list()`, `stat()`, `delete()`, `watch()`, `createReadStream()`, `createWriteStream()`
- Tools: `fs_read`, `fs_write`, `fs_list`, `fs_search`, `fs_watch`, `fs_diff`, `fs_patch`
- Sandboxed paths: all operations validated against allowed root directories
- Streaming support for large files via the adapter's stream methods

### Step 7: Tool Server (`src/servers/tool-server.ts`)
- Executes CLI tools/scripts in sandboxed child processes
- Tool definitions loaded from YAML/JSON config: command, args, timeout, env, resource limits
- `IToolDefinition`: name, command, args template, timeout, maxOutputBytes
- Tools: dynamically created from definitions
- Captures stdout, stderr, exit code
- Enforces timeout and max output size

### Step 8: Custom Server (`src/servers/custom-server.ts`)
- `AbstractCustomServer` base class with lifecycle hooks: `onInit()`, `onStart()`, `onStop()`, `onHealthCheck()`
- `CustomServerLoader`: discovers and loads plugin modules from a configured directory
- Each plugin exports a class extending `AbstractCustomServer`
- Dynamic loading via `import()` for ESM modules
- Dev hot-reload: optional file watcher that reloads changed plugins

### Step 9: MCP Manager (`src/manager.ts`)
Implements `IMCPManager` from shared types:
- `connectAll()` — iterates configs, creates transports, starts servers
- `discoverCapabilities()` — aggregates tools from all connected servers
- `callTool(name, args, serverName?)` — routes to correct server, returns `MCPToolResult`
- `dynamicConnect(config)` — adds a server at runtime
- `shutdown()` — gracefully stops all servers
- `healthCheck()` — returns per-server health status
- Internal registry: `Map<string, BaseMCPServer>`
- Tool index: `Map<string, string>` (toolName -> serverName) for O(1) routing

### Step 10: Public API (`src/index.ts`)
Export:
- `MCPManager` class
- All server classes
- `AbstractCustomServer` for plugin authors
- Error classes
- Config/adapter interfaces

### Step 11: Tests (`src/__tests__/`)
All tests use vitest with mocked dependencies:
- **manager.test.ts**: Registry, connect/disconnect, tool routing, health check, dynamic connect
- **Transport tests**: Mock child_process for stdio, mock fetch/EventSource for SSE
- **Server tests**: Each server tested with mock adapters, verify tool registration, execution, error handling
- Target: >80% coverage

## Constraints
- Import shared types from `@stem-agent/shared` (IMCPManager, MCPTool, MCPToolResult, MCPServerConfig, MCPTransport, BaseError, MCPError, createLogger)
- TypeScript strict mode, ESM (`NodeNext` module resolution, `.js` extensions in imports)
- No circular dependencies
- JSDoc on all public APIs
- All adapter interfaces defined locally (IDatabaseAdapter, IHttpClient, IFileSystemAdapter, etc.) since they're internal to this layer
