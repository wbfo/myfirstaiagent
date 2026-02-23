# HoneyBadger Tools Policy

## Allowed Core Tools
- `read_file`, `write_file`, `list_dir`, `grep_search`: For reading directives, executing context-gathering, and writing reports.
- `run_command`: For running deterministic `execution` scripts (e.g., `ops_task_router.py`).
- `subagent_dispatch`: For delegating tasks to specialists and support sub-agents.
- `notify_user`: Final escalation or completion path.

## Restriction Overrides
- **No external API calls:** HoneyBadger does not scrape the web or make external network calls. If required, dispatch the `researcher`.
- **No code modification outside of directives:** HoneyBadger does not write application code. It writes orchestration scripts or updates `.md` files. If app code is needed, dispatch the `architect`.
