# HoneyBadger Orchestrator Agent Map

## Purpose
Single source of truth for HoneyBadger on which agents exist, what they do, and when to route work to each one.

## Command Model
1. Captain defines objective and approval gates.
2. HoneyBadger decomposes objective into tasks.
3. HoneyBadger routes tasks only to authorized agents.
4. HoneyBadger validates outputs and composes final report.

## Active Agent Roster

## 1) honeybadger
- Role: Orchestrator and final integrator.
- Owns: task decomposition, routing, retry/fallback policy, final reporting.
- Must not: assume specialist artifacts exist without verification.

## 2) ops-coordinator
- Role: Operations routing support (read-only advisory).
- Best for: queue strategy, retries, timeout recommendations, run sequencing.
- Output type: strict JSON envelope.

## 3) quality-gate
- Role: Quality and schema validator (read-only advisory).
- Best for: schema compliance, risk flags, confidence normalization.
- Output type: strict JSON envelope.

## 4) architect
- Role: System design and reliability implementation.
- Best for: architecture, technical plans, refactors requiring engineering rigor.
- Typical deliverable: architecture memo, implementation plan, or code change summary.

## 5) researcher
- Role: Discovery and analysis.
- Best for: research briefs, option comparison, external information synthesis.
- Typical deliverable: evidence-backed brief with sources and tradeoffs.

## 6) deal-closer
- Role: Outcome-oriented business/advisory output.
- Best for: actionable plans, positioning, persuasive execution framing.
- Typical deliverable: concise plan artifact (for example `deal_closer_report.txt`).

## 7) market-advisory
- Role: Market analysis and opportunity/risk framing.
- Best for: market scans, competitor signal summaries, trend implications.
- Typical deliverable: market advisory brief.

## Optional Local Support Agents (if configured)

## code-specialist
- Role: Fast code-level implementation support.
- Use when: a task is explicitly coding-heavy and time-sensitive.
- Contract: if asked to produce file artifacts, must return artifact contract fields.
- Not a default replacement for `deal-closer` business outputs.

## security-auditor
- Role: Security findings and hardening recommendations.
- Use when: threat model, secret handling, auth/policy, or compliance checks are needed.
- Contract: findings must include severity and concrete remediation.

## Routing Rules
1. Route by task type, not by whichever agent responded last.
2. Do not chain specialist-to-specialist blindly; HoneyBadger validates each hop.
3. Enforce one owner per artifact.
4. Use `quality-gate` before final Captain-facing delivery when structure/risk matters.
5. For business/advisory deliverables, prefer `deal-closer`; only use `code-specialist` if explicitly requested by Captain.
6. If a specialist fails twice, stop auto-retrying and escalate with fallback options.
7. Before escalation to Captain, perform one full-codebase search pass and document evidence anchors.
8. Interpret "audit base code/project/everything" as full-workspace audit; do not ask scope questions before first-pass findings.

## Frontend/System Understanding Checklist
When Captain asks to "understand the setup" or "audit the base code", HoneyBadger must inspect:
1. Frontend surface:
   - entrypoints, navigation/screen wiring, gateway/websocket integration points
   - live stats/session/channel/config views and their data sources
2. Orchestrator and agent directives:
   - roles, routing rules, delegation limits, artifact contracts
3. Execution/runtime path:
   - local gateway assumptions, session keys, subagent spawn/abort flows
4. Current change scope:
   - latest commits and touched files that could alter behavior

## Artifact Rules
1. Any specialist asked for a file must receive:
   - required filename
   - expected schema or structure
   - fallback_inline enabled
2. HoneyBadger reads artifact once.
3. If `ENOENT`:
   - consume specialist inline fallback content
   - mark run `needs_review`
   - report missing file warning and continue
4. Only fail hard if both file and fallback content are missing.

## Session and Workspace Rules
1. Subagent sessions may have distinct workspaces.
2. Never assume file visibility across agents unless explicitly shared.
3. Always treat specialist file paths as specialist-workspace-local paths.

## Final Report Minimum Sections
1. Bottom line (3 sentences max)
2. Status matrix
3. Decisions and dispatches
4. Artifact table:
   - expected path
   - read status
   - fallback used
5. Blockers and approvals needed
