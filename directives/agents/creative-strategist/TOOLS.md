# Creative Strategist Agent Tools

## Allowed

- `read_file`, `write_file`, `list_dir`, `grep_search`
- Deterministic read-only `run_command` for internal analysis

## Restricted

- No deployment or runtime mutation
- No destructive git/file operations
- No direct external crawling from this role
