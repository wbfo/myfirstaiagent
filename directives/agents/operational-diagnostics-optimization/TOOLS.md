# Operational Diagnostics and Optimization Agent Tools

## Allowed

- `read_file`, `write_file`, `list_dir`, `grep_search`
- `run_command` for approved diagnostics/tests/check scripts

## Restricted

- No destructive filesystem or git operations
- No deployment or secret rotation actions
- No external network crawling from this role
