# Canonical Agent Runtime Truth

**Last Verified At:** 2026-02-24T13:43:00Z
**Git Commit:** 14fcf6a30ae91a690ebd9e2fb3bba69ae5f29f0f
**Baseline Workspace:** `/Users/wbfoclaw/OPENopenclaw/openclaw_app`

## 1. Live Runtime Agents (Orchestration Layer)

_Source of Truth: `~/.openclaw/openclaw.json` / `node openclaw.mjs agents list`_

| Agent ID            | Name                     | Default | Model                  | Role              |
| :------------------ | :----------------------- | :------ | :--------------------- | :---------------- |
| **main**            | Main Assistant           | No      | gemini-3-flash-preview | Primary interface |
| **honeybadger**     | HoneyBadger Orchestrator | **Yes** | gemini-3-flash-preview | Strategic COO     |
| **architect**       | Architect                | No      | gemini-2.5-pro         | System Design     |
| **researcher**      | Researcher               | No      | gemini-2.5-pro         | Discovery         |
| **deal-closer**     | Deal Closer              | No      | gemini-2.5-flash       | Evaluation        |
| **market-advisory** | Market Advisory          | No      | gpt-4o-mini            | Market Insights   |
| **ops-coordinator** | Ops Coordinator          | No      | gemini-3-flash-preview | Task Support      |
| **quality-gate**    | Quality Gate             | No      | gemini-3-flash-preview | Validation        |

**Total Live Agents:** 8

## 2. Execution Runtime Map (Specialist Layer)

_Source of Truth: `execution/agent_runtime_map.json`_

| Agent ID            | Lineage / Runtime | Implementation    |
| :------------------ | :---------------- | :---------------- |
| **architect**       | zeroclaw          | Rust/Cargo Binary |
| **researcher**      | zeroclaw          | Rust/Cargo Binary |
| **deal-closer**     | zeroclaw          | Rust/Cargo Binary |
| **market-advisory** | nanobot           | Python Module     |

**Note:** `ops-coordinator` and `quality-gate` are orchestration support agents and do NOT have entries in the execution map.

## 3. Mandatory Rules: Do Not Conflate

- **Lineage is NOT Identity**: Do not infer lineage from persona names. Use `agent_runtime_map.json` only.
- **Config Precedence**: `~/.openclaw/openclaw.json` defines what the bot _actually does_ on Telegram/Web. `config/openclaw.json` is a reference template.
- **Support vs Specialists**: `ops-coordinator` and `quality-gate` assist the orchestrator but are not "specialist runtimes" in the execution sense.

## 4. Drift Remediation

If the live roster drifts from the canonical state (e.g., agents missing or extra ones present), run:

```bash
cd /Users/wbfoclaw/OPENopenclaw/openclaw_app
./scripts/sync-honeybadger-agents.sh /Users/wbfoclaw/OPENopenclaw/openclaw_app
```

Verify with:

```bash
node openclaw.mjs agents list --json
```
