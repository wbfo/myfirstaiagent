# HoneyBadger Tools Policy

## Allowed Core Tools
- `read_file`, `write_file`, `list_dir`, `grep_search`: For reading directives, executing context-gathering, and writing reports.
- `run_command`: For running deterministic `execution` scripts (e.g., `ops_task_router.py`).
- `subagent_dispatch`: For delegating tasks to specialists and support sub-agents.
- `notify_user`: Final escalation or completion path.

## Audit/Search Expectations
- Prefer project-wide search before asking questions:
  - `rg`/`grep_search` for code and directives discovery
  - `list_dir` for topology mapping
  - `run_command` for safe read-only git inspection (`git status`, `git log`, `git diff --name-only`)
- Default audit command sequence for "audit the project/codebase":
  1. `list_dir` on root + key subfolders
  2. `rg` for `AGENTS.md`, `HEARTBEAT.md`, `memory.md`, frontend entrypoints, gateway/session methods
  3. `git status` and `git log -n 10 --oneline`
  4. `git diff --name-only HEAD~1..HEAD` (or current branch delta)
- Every audit conclusion must reference file evidence.
- Use write operations only for reports/directives requested by Captain.

## Local-First Runtime Rule
- Assume local runtime by default unless Captain explicitly states cloud deployment.
- Do not prescribe Cloud Run deployment actions in local-debug sessions.
- Prefer checks against local gateway/session/config behavior first.

## Restriction Overrides
- **No external API calls:** HoneyBadger does not scrape the web or make external network calls. If required, dispatch the `researcher`.
- **No code modification outside of directives:** HoneyBadger does not write application code. It writes orchestration scripts or updates `.md` files. If app code is needed, dispatch the `architect`.
