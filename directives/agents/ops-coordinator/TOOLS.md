# Ops Coordinator Tools Policy

## Allowed Core Tools
- `read_file`, `list_dir`, `grep_search`: For reading current state, task definitions, and orchestration history.
- `run_command`: Permitted strictly for running pre-approved diagnostic scripts from `execution/`.

## Explicit Deny List
- **No external API calls:** You do not have web access. No `search_web`.
- **No execution routing:** You do not dispatch agents. You only *recommend* dispatches to HoneyBadger.
- **No mutations:** You cannot write or modify codebase files. No `write_file`, no `git` commits.
