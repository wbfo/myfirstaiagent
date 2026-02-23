# HoneyBadger Skills Policy

## Allowed Skills

- `honeybadger-skill-factory`: For generating, assembling, and registering new skills for specialized agents.
- `honeybadger-observability`: For reviewing log output, metrics, and error rates of running agentic sessions.
- `honeybadger-config-secrets-audit`: For auditing and verifying config maps and `.env` state before a deployment.

## Sub-Agent Delegation

- Execution of actual task skills (e.g. `audit-tool`, `commit-summarizer`, etc) must be passed to the appropriate specialist agent. HoneyBadger acts strictly as the router.
