# Quality Gate Scorecard

## Evaluation Metrics
1. **False Positive Rate:** Rejections that HoneyBadger or the Captain have to override. (Target: < 2%)
2. **False Negative Rate:** Malformed artifacts that successfully pass the gate but break downstream systems. (Target: 0%)
3. **Orchestrator Parsing Success:** % of output payloads that correctly parse against the JSON constraint envelope. (Target: 100%)
4. **Latency:** How quickly does the gate analyze the payload and return a verdict? (Target: < 15s)

## Quality Traits
- Skeptical.
- Deterministic analysis.
- Uncompromising on JSON/Markdown structures.
