import type { AgentConfig, ChatRequest, ResumeRequest, SseEvent, HistoryRequest, HistoryResponse } from './types';

// Use empty string for same-origin requests (when served by backend)
// Fallback to localhost:8001 for development
const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function fetchAgents(): Promise<AgentConfig[]> {
  const res = await fetch(`${API_BASE}/agents`);
  if (!res.ok) throw new Error(`Failed to fetch agents: ${res.statusText}`);
  return res.json();
}

export async function fetchModels(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
  const data = await res.json();
  return data.models;
}

export async function fetchHistory(request: HistoryRequest): Promise<HistoryResponse> {
  const res = await fetch(`${API_BASE}/chat/history`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`Failed to fetch history: ${res.statusText}`);
  return res.json();
}

export interface ChatStreamOptions {
  request: ChatRequest;
  onEvent: (event: SseEvent) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export function chatStream({ request, onEvent, onError, signal }: ChatStreamOptions): () => void {
  const controller = new AbortController();
  const abortSignal = signal || controller.signal;
  
  const url = `${API_BASE}/chat/stream`;
  
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: abortSignal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const event = JSON.parse(data) as SseEvent;
              onEvent(event);
            } catch {
              console.warn('Failed to parse SSE event:', data);
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });
  
  return () => controller.abort();
}

export interface ResumeStreamOptions {
  request: ResumeRequest;
  onEvent: (event: SseEvent) => void;
  onError: (error: Error) => void;
  signal?: AbortSignal;
}

export function resumeStream({ request, onEvent, onError, signal }: ResumeStreamOptions): () => void {
  const controller = new AbortController();
  const abortSignal = signal || controller.signal;
  
  const url = `${API_BASE}/chat/resume`;
  
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: abortSignal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      
      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const event = JSON.parse(data) as SseEvent;
              onEvent(event);
            } catch {
              console.warn('Failed to parse SSE event:', data);
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err);
      }
    });
  
  return () => controller.abort();
}
