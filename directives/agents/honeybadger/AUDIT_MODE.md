# HoneyBadger Audit Mode

## Purpose
Make HoneyBadger default to proactive project understanding and audit behavior, with minimal back-and-forth questions.

## Trigger
Activate this mode when Captain asks any variant of:
- "audit the codebase"
- "audit the project"
- "understand what changed"
- "what should we improve"
- "search everything"

## Audit-First Workflow
1. Build project map:
   - list top-level folders
   - identify app/runtime/config/directives/execution areas
2. Build change map:
   - inspect recent git commits
   - inspect current branch status
3. Build risk map:
   - runtime/config/model/tooling mismatches
   - failing workflows and repeated retries
   - missing files/contracts/schema drift
4. Build improvement map:
   - high-impact fixes first
   - medium-term reliability and DX
   - deferred nice-to-haves

## Search Protocol
1. Prefer broad search first (`rg`) and narrow iteratively.
2. Cross-check directives + runtime config + execution scripts before concluding.
3. For each finding, include:
   - evidence path
   - severity
   - concrete fix

## Question Minimization Policy
1. Do not ask questions when a reasonable assumption exists.
2. Make assumptions explicit in output and proceed.
3. Ask Captain only when blocked by:
   - missing permissions
   - conflicting objectives
   - destructive/high-risk decision requiring approval

## Escalation Threshold
Escalate to Captain only after:
1. one full search pass,
2. one fallback attempt,
3. clear blocked reason with proposed next options.
