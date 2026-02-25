# Canonical Agent Runtime Truth

**Last Verified At:** 2026-02-25T00:00:00Z
**Git Commit:** working-tree (pending commit)
**Baseline Workspace:** `$APP_ROOT`

## 1. Live Runtime Agents (Orchestration Layer)

_Source of Truth: `~/.openclaw/openclaw.json` / `node openclaw.mjs agents list`_

| Agent ID            | Name                     | Default | Model                  | Role              |
| :------------------ | :----------------------- | :------ | :--------------------- | :---------------- |
| **main**            | Main Assistant (reserved alias) | No | gemini-3-flash-preview | Compatibility shim |
| **honeybadger**     | HoneyBadger Orchestrator | **Yes** | gemini-3-flash-preview | Strategic COO     |
| **knowledge-management** | Knowledge Management Agent | No  | gemini-2.5-flash       | Memory authority  |
| **strategic-horizon-systems** | Strategic Horizon and Systems Agent | No | gemini-2.5-pro | Long-range strategy |
| **operational-diagnostics-optimization** | Operational Diagnostics and Optimization Agent | No | gemini-2.5-flash | Ops diagnostics |
| **creative-director** | Creative Director Agent | No      | gemini-2.5-pro         | Narrative direction |
| **creative-strategist** | Creative Strategist Agent | No   | gemini-2.5-pro         | Campaign strategy |
| **execution-governor** | Execution Governor Agent | No    | gemini-2.5-flash       | Delivery governance |
| **architect**       | Architect                | No      | gemini-2.5-pro         | System Design     |
| **researcher**      | Researcher               | No      | gemini-2.5-pro         | Discovery         |
| **deal-closer**     | Deal Closer              | No      | gemini-2.5-flash       | Evaluation        |
| **market-advisory** | Market Advisory          | No      | gpt-4o-mini            | Market Insights   |
| **ops-coordinator** | Ops Coordinator          | No      | gemini-3-flash-preview | Task Support      |
| **quality-gate**    | Quality Gate             | No      | gemini-3-flash-preview | Validation        |

**Total Live Agents:** 14
**HoneyBadger-Managed Operational Agents:** 13 (excludes reserved `main` alias)

## 2. Execution Runtime Map (Specialist Layer)

_Source of Truth: `execution/agent_runtime_map.json`_

| Agent ID            | Lineage / Runtime | Implementation    |
| :------------------ | :---------------- | :---------------- |
| **knowledge-management** | nanobot      | Python Module     |
| **strategic-horizon-systems** | zeroclaw | Rust/Cargo Binary |
| **operational-diagnostics-optimization** | nanobot | Python Module |
| **creative-director** | zeroclaw      | Rust/Cargo Binary |
| **creative-strategist** | zeroclaw    | Rust/Cargo Binary |
| **execution-governor** | nanobot      | Python Module |
| **architect**       | zeroclaw          | Rust/Cargo Binary |
| **researcher**      | zeroclaw          | Rust/Cargo Binary |
| **deal-closer**     | zeroclaw          | Rust/Cargo Binary |
| **market-advisory** | nanobot           | Python Module     |

**Note:** `ops-coordinator` and `quality-gate` remain orchestration support agents and do NOT have entries in the execution map.

## 3. Mandatory Rules: Do Not Conflate

- **Lineage is NOT Identity**: Do not infer lineage from persona names. Use `agent_runtime_map.json` only.
- **Config Precedence**: `~/.openclaw/openclaw.json` defines what the bot _actually does_ on Telegram/Web. `config/openclaw.json` is a reference template.
- **Reserved Alias Behavior**: Some OpenClaw builds keep `main` as a non-default compatibility alias even after consolidation.
- **Support vs Specialists**: `ops-coordinator` and `quality-gate` assist the orchestrator but are not "specialist runtimes" in the execution sense.

## 4. Drift Remediation

If the live roster drifts from the canonical state (e.g., agents missing or extra ones present), run:

```bash
cd $APP_ROOT
./scripts/sync-honeybadger-agents.sh $APP_ROOT
```

Verify with:

```bash
node openclaw.mjs agents list --json
```
