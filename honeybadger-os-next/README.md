# HoneyBadger OS Next Dashboard

Next.js + Tailwind frontend for your HoneyBadger multi-agent setup with live Gateway integration.

## Features

- Sidebar navigation for Overview, Agents, Chat, Sessions, Subagents, Skills, Channels, Config
- Live Gateway WebSocket handshake and connection status
- Live RPC calls:
  - `chat.send`
  - `chat.abort`
  - `sessions.list`
  - `channels.status`
  - `config.get`
  - `config.patch`
- Streaming chat delta handling from `chat` events
- Agent/skill/channel manifests preloaded from your current configuration

## Run

```bash
cd /Users/abimbolaolaitan/Desktop/OPENopenclaw/honeybadger-os-next
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Gateway Connection

In the left sidebar:

- Set `Host` (default: `localhost:18789`)
- Optionally set token if your gateway uses auth
- Click `Connect`

Expected status transitions:

- `connecting` -> `connected` when handshake succeeds
- `error` or `disconnected` if gateway is unreachable/auth fails

## Notes

- The app is isolated from your existing OpenClaw UI (`openclaw_app/ui`) and does not modify it.
- If your gateway exposes additional methods for metrics/health, they can be added in `components/dashboard.tsx`.
