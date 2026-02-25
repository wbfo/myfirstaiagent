# Execution Governor Agent Tools

## Allowed

- `read_file`, `write_file`, `list_dir`, `grep_search`
- `run_command` for deterministic readiness checks

## Restricted

- No destructive filesystem or git operations
- No direct deployment/release execution
- No outbound network crawling from this role
