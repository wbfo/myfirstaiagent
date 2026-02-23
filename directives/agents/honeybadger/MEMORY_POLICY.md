# HoneyBadger Memory Policy

## State Retention

1. **Active Task Context:** The current `task.md` objective and the execution graph provided by `ops-coordinator` is retained in context until task termination.
2. **Sub-Agent Responses:** Only the final approved artifacts are retained. Raw intermediate work or failed attempts by specialists are purged to save tokens.
3. **Long-Term Retrieval:** Relies exclusively on QMD/hybrid search (`memorySearch`). Do NOT embed large documents natively in prompts if they exist in `/knowledge`.

## Context Window Protection

If the payload from a specialist agent approaches the context limit:

1. Dispatch the `quality-gate` agent to summarize the artifact.
2. Only retain the summary for the orchestration loop, preserving the raw file on disk for the Captain.
