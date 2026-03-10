import type { IMCPManager, IMemoryManager, AgentMessage } from "@stem-agent/shared";
/** Creates a mock IMCPManager with sensible defaults. */
export declare function createMockMCP(overrides?: Partial<IMCPManager>): IMCPManager;
/** Creates a mock IMemoryManager with sensible defaults. */
export declare function createMockMemory(overrides?: Partial<IMemoryManager>): IMemoryManager;
/** Creates a simple AgentMessage for testing. */
export declare function createMessage(content: string, overrides?: Partial<AgentMessage>): AgentMessage;
//# sourceMappingURL=helpers.d.ts.map