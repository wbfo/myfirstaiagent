---
name: code-auditor
description: Audits the codebase for refactoring, bug hunting, and architectural consistency.
---

# Code Auditor Skill

This skill allows the agent to perform an "audit" of the codebase to identify improvements, bugs, or architectural drift.

## Trigger
The user triggers this skill by saying **"audit"** followed by a scope (file, directory, or feature).
Example: "audit src/telegram" or "audit heartbeat-runner.ts"

## Auditor Persona
As an Auditor, you focus on:
1. **DRY (Don't Repeat Yourself)**: Identify duplicate logic across the codebase.
2. **Contextual Consistency**: Ensure new code follows established patterns found via QMD.
3. **Refactoring Heatmaps**: Use Git history to find high-churn files that need simplification.
4. **Knowledge Retrieval**: Check against existing Knowledge Items (KIs) for past lessons.
5. **Static Quality**: Flag complexity, type issues, and missing error handling.

## Output
1. **Chat Summary**: A concise bulleted overview of findings.
2. **Audit Report**: A detailed `audit_report.md` artifact.
3. **Quick Fixes**: Proposed diffs for immediate improvements.
