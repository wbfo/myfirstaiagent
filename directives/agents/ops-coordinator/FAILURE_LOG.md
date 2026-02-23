# Ops Coordinator Failure Recovery Log

## Recovery Behaviors

### JSON Parsing Failure
If HoneyBadger cannot parse your envelope, you will receive an immediate retry containing the structural error.
- **Action:** Truncate all `findings` and `risk_flags`, strip special characters, and output minimal valid JSON.

### Missing Context Block
If the payload lacks the context required to make a routing recommendation:
- **Action:** Return `{ "status": "blocked", "recommended_next_step": "Request context [X] from Captain before proceeding." }`

### Timeout Edge
If analysis of execution state exceeds 60s:
- **Action:** Terminate analysis. Return whatever findings were gathered and set `confidence` below `0.5`.
