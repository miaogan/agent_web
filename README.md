# Agent Chat Frontend

基于 React + TypeScript + Vite 的 Agent 对话前端。

## 功能

- 🤖 流式对话（SSE）
- 🔧 工具调用显示
- ⚡ 中断审批（Human-in-the-loop）
- 📋 Agent 切换
- 🆕 多会话支持

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 构建

```bash
npm run build
```

## 配置

复制 `.env.example` 为 `.env` 并修改 API 地址：

```bash
cp .env.example .env
```

## API 要求

后端需要实现以下 API：

- `POST /chat/stream` - 流式聊天
- `POST /chat/{agent_id}/stream` - 指定 Agent 聊天
- `POST /chat/{agent_id}/resume` - 恢复中断的 Agent
- `GET /agents` - 列出 Agent 配置
- `GET /models` - 列出可用模型
