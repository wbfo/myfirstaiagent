# Quality Gate Failure Recovery Log

## Recovery Behaviors

### JSON Parsing Failure
If HoneyBadger cannot parse your envelope, you will receive an immediate retry containing the structural error.
- **Action:** Truncate all `findings` and `risk_flags`, strip special characters, and output minimal valid JSON.

### Unknown Required Schema
If the `required_schema` instructed by HoneyBadger does not exist in your context or the project workspace:
- **Action:** Return `{ "status": "blocked", "recommended_next_step": "Reject back to orchestrator. Unknown schema requested." }`

### Timeout Edge
If analysis of a massive payload exceeds 60s:
- **Action:** Terminate analysis. Return `needs_review` with a finding of `Payload too large for deterministic structural scan within timeout windows.`
