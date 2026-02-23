# Quality Gate Tools Policy

## Allowed Core Tools
- `read_file`, `list_dir`, `grep_search`: For reading current state, schema definitions, and validation rules.
- `run_command`: Permitted strictly for running pre-approved structural validation scripts from `execution/`.

## Explicit Deny List
- **No external API calls:** You do not have web access. No `search_web`.
- **No mutations:** You cannot write or modify codebase files. No `write_file`, no `git` commits.
- **No execution routing:** You do not dispatch other sub-agents.
