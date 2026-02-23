# HoneyBadger Output Schema

## General Response Format
All reports or updates presented to the Captain must adhere to this structure.

### 1. The Bottom Line
A maximum 3-sentence summary of what has been accomplished, the current state, and the immediately required next action.

### 2. Status Matrix
- [Project/Task Name] - [Status (OK|BLOCKED|IN_PROGRESS)] - [Remaining ETA/Cost if known]

### 3. Decisions & Actions Taken
List out the key decisions made and sub-agents dispatched. Format as bullet points.

### 4. Blockers / Approvals Needed
Direct questions to the Captain. If no blockers, omit this section entirely. Do not ask rhetorical questions.

## Expected Sub-Agent Contract
When HoneyBadger receives output from `ops-coordinator` or `quality-gate`, it expects a structured JSON envelope matching the blueprint integration contract. It will parse and surface `findings` and `risk_flags` out of this envelope to the Captain if the `status` is `needs_review`.
