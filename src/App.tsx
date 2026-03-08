import { useEffect, useState } from 'react';
import { ChatPanel } from './ChatPanel';
import type { AgentConfig } from './types';
import { fetchAgents } from './api';
import './App.css';

function App() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('default');
  const [threadId, setThreadId] = useState<string>(generateThreadId());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents()
      .then((data) => {
        setAgents(data);
        if (data.length > 0 && !data.find(a => a.agent_id === selectedAgent)) {
          setSelectedAgent(data[0].agent_id);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const handleNewChat = () => {
    setThreadId(generateThreadId());
  };

  const selectedAgentConfig = agents.find(a => a.agent_id === selectedAgent);

  return (
    <div className="app">
      <header className="header">
        <h1>🤖 Agent Chat</h1>
        <div className="header-actions">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
          >
            {agents.map((agent) => (
              <option key={agent.agent_id} value={agent.agent_id}>
                {agent.name} ({agent.model})
              </option>
            ))}
          </select>
          <button onClick={handleNewChat} className="btn-new-chat">
            新对话
          </button>
        </div>
      </header>

      {error && <div className="error-banner">❌ {error}</div>}

      <div className="main-content">
        <aside className="sidebar">
          <h3>当前 Agent</h3>
          {selectedAgentConfig && (
            <div className="agent-info">
              <p><strong>ID:</strong> {selectedAgentConfig.agent_id}</p>
              <p><strong>模型:</strong> {selectedAgentConfig.model}</p>
              <p><strong>工具:</strong></p>
              <ul>
                {selectedAgentConfig.tools.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {selectedAgentConfig.interrupt_on && (
                <>
                  <p><strong>需要审批:</strong></p>
                  <ul>
                    {Object.entries(selectedAgentConfig.interrupt_on)
                      .filter(([, v]) => v)
                      .map(([k]) => (
                        <li key={k}>{k}</li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          )}
          <div className="thread-info">
            <p><strong>Thread:</strong> {threadId}</p>
          </div>
        </aside>

        <main className="chat-container">
          <ChatPanel agentId={selectedAgent} threadId={threadId} />
        </main>
      </div>
    </div>
  );
}

function generateThreadId() {
  return 'thread_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export default App;
