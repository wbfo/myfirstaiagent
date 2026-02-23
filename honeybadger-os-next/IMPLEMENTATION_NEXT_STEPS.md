# HoneyBadger OS Next - Implementation Roadmap

This file tracks what is already implemented and what remains before production use.

## Implemented

- Next.js + Tailwind + TypeScript app scaffold.
- Dashboard shell with left navigation and screen routing.
- Migrated pages from prototype:
  - Overview
  - Agents
  - Agent Detail
  - Chat
  - Sessions
  - Subagents
  - Skills
  - Channels
  - Config
- Gateway WebSocket client in the browser.
- Gateway handshake (`connect`) and live connection status.
- RPC calls wired:
  - `chat.send`
  - `chat.abort`
  - `sessions.list`
  - `channels.status`
  - `config.get`
  - `config.patch`
- Streaming chat event handling via `chat` event updates.

## Remaining Work

## 1. Runtime Validation

- Install dependencies and run:
  - `npm install`
  - `npm run dev`
  - `npm run build`
- Verify all screens with a running gateway.
- Fix any API payload mismatches discovered at runtime.

## 2. Gateway Contract Hardening

- Add runtime schema validation for inbound RPC/event payloads.
- Standardize typed response guards per method.
- Add robust reconnect/backoff strategy and stale-connection detection.

## 3. Security and Production Safety

- Move gateway token handling to a server-side proxy route (avoid long-lived token in client state).
- Add optional auth layer for dashboard access.
- Add origin restrictions/CORS-safe deployment model if hosted remotely.

## 4. UX and Feature Completion

- Add real-time charts for:
  - agent run rate
  - failures/errors
  - response latency
  - channel throughput
- Add loading, empty, and retry states for every data panel.
- Add persisted UI preferences (selected agent, host, theme/layout options).

## 5. Testing

- Add unit tests for gateway client state transitions.
- Add integration tests for chat streaming and config save workflows.
- Add end-to-end smoke tests for each nav screen.

## 6. Deployment

- Add `.env.example` and environment loading strategy.
- Decide deployment target (Vercel vs self-hosted).
- Add CI checks for lint/build/test.

## Suggested Immediate Next Step

1. Run locally against your main computer gateway.
2. Log any RPC/event contract mismatches.
3. Implement typed guards + reconnect policy first (highest reliability impact).
