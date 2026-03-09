// API Types

export interface AgentConfig {
  agent_id: string;
  name: string;
  model: string;
  system_prompt?: string;
  tools: string[];
  mcp_servers?: McpServer[];
  interrupt_on?: Record<string, boolean>;
  max_turns: number;
  ttl_minutes: number;
  persistent: boolean;
  created_at: string;
  updated_at: string;
}

export interface McpServer {
  name: string;
  transport: string;
  url?: string;
}

export interface ChatRequest {
  message: string;
  agent_id?: string;
  model?: string;
  thread_id?: string;
}

export interface ResumeRequest {
  agent_id: string;
  decision: 'approve' | 'reject' | 'edit';
  tool_call_id: string;
  tool_name?: string;
  edited_args?: Record<string, unknown>;
  thread_id?: string;
}

export interface InterruptInfo {
  tool_name: string;
  tool_call_id: string;
  args: Record<string, unknown>;
  description: string;
  allowed_decisions: string[];
}

// SSE Event Types
export type SseEvent =
  | { type: 'delta'; content: string }
  | { type: 'tool_call'; tool: string; args: Record<string, unknown>; tool_call_id: string }
  | { type: 'interrupt'; interrupts: InterruptInfo[] }
  | { type: 'done'; content: string; tools_used: ToolCallInfo[]; agent_id?: string }
  | { type: 'error'; message: string };

export interface ToolCallInfo {
  tool: string;
  args: Record<string, unknown>;
  tool_call_id: string;
}

// UI Types
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
  interrupt?: InterruptInfo[];
  isStreaming?: boolean;
  error?: string;
}
