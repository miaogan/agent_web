import { useEffect, useRef, useState } from 'react';
import type { InterruptInfo, Message, ToolCallInfo } from './types';
import { chatStream, resumeStream } from './api';

interface ChatPanelProps {
  agentId: string;
  threadId: string;
}

export function ChatPanel({ agentId, threadId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeInterrupt, setActiveInterrupt] = useState<{ agentId: string; interrupt: InterruptInfo } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      toolCalls: [],
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput('');
    setIsLoading(true);
    setActiveInterrupt(null);

    abortRef.current = chatStream({
      request: {
        message: userMessage.content,
        agent_id: agentId,
        thread_id: threadId,
      },
      onEvent: (event) => {
        if (event.type === 'delta') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + event.content }
                : m
            )
          );
        } else if (event.type === 'tool_call') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? {
                    ...m,
                    toolCalls: [...(m.toolCalls || []), event],
                  }
                : m
            )
          );
        } else if (event.type === 'interrupt') {
          const firstInterrupt = event.interrupts[0];
          if (firstInterrupt) {
            setActiveInterrupt({ agentId: agentId || 'default', interrupt: firstInterrupt });
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, interrupt: event.interrupts, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
        } else if (event.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, isStreaming: false, toolCalls: event.tools_used }
                : m
            )
          );
          setIsLoading(false);
        } else if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, error: event.message, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
        }
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, error: err.message, isStreaming: false }
              : m
          )
        );
        setIsLoading(false);
      },
    });
  };

  const handleInterruptDecision = (decision: 'approve' | 'reject') => {
    if (!activeInterrupt) return;

    const { agentId: intAgentId, interrupt } = activeInterrupt;
    const assistantMessage = messages.find((m) => m.interrupt?.some((i) => i.tool_call_id === interrupt.tool_call_id));
    
    if (!assistantMessage) return;

    setIsLoading(true);
    setActiveInterrupt(null);

    resumeStream({
      agentId: intAgentId,
      request: {
        decision,
        tool_call_id: interrupt.tool_call_id,
        thread_id: threadId,
      },
      onEvent: (event) => {
        if (event.type === 'delta') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + event.content, isStreaming: true }
                : m
            )
          );
        } else if (event.type === 'tool_call') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, toolCalls: [...(m.toolCalls || []), event] }
                : m
            )
          );
        } else if (event.type === 'interrupt') {
          const firstInterrupt = event.interrupts[0];
          if (firstInterrupt) {
            setActiveInterrupt({ agentId: intAgentId, interrupt: firstInterrupt });
          }
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, interrupt: event.interrupts, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
        } else if (event.type === 'done') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
        } else if (event.type === 'error') {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, error: event.message, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
        }
      },
      onError: (err) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessage.id
              ? { ...m, error: err.message, isStreaming: false }
              : m
          )
        );
        setIsLoading(false);
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-panel">
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-header">
              <span className="role">{msg.role === 'user' ? '👤 You' : '🤖 Agent'}</span>
              <span className="time">{msg.timestamp.toLocaleTimeString()}</span>
            </div>
            <div className="message-content">
              {msg.content || (msg.isStreaming && <span className="streaming">●●●</span>)}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="tool-calls">
                  {msg.toolCalls.map((tc, i) => (
                    <ToolCallBadge key={i} toolCall={tc} />
                  ))}
                </div>
              )}
              {msg.interrupt && (
                <div className="interrupt-panel">
                  <div className="interrupt-warning">⚠️ 需要审批</div>
                  {msg.interrupt.map((int, i) => (
                    <div key={i} className="interrupt-item">
                      <strong>{int.tool_name}</strong>
                      <pre>{JSON.stringify(int.args, null, 2)}</pre>
                      <p>{int.description}</p>
                    </div>
                  ))}
                </div>
              )}
              {msg.error && <div className="error">❌ {msg.error}</div>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {activeInterrupt && (
        <div className="interrupt-actions">
          <span>⚡ 工具 <strong>{activeInterrupt.interrupt.tool_name}</strong> 需要审批</span>
          <button className="btn approve" onClick={() => handleInterruptDecision('approve')}>
            ✓ 批准
          </button>
          <button className="btn reject" onClick={() => handleInterruptDecision('reject')}>
            ✗ 拒绝
          </button>
        </div>
      )}

      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          disabled={isLoading}
          rows={3}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          {isLoading ? '...' : '发送'}
        </button>
      </div>
    </div>
  );
}

function ToolCallBadge({ toolCall }: { toolCall: ToolCallInfo }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="tool-call-badge" onClick={() => setExpanded(!expanded)}>
      <span className="tool-name">🔧 {toolCall.tool}</span>
      {expanded && (
        <pre className="tool-args">{JSON.stringify(toolCall.args, null, 2)}</pre>
      )}
    </div>
  );
}
