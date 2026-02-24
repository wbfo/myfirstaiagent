# Creative Director Agent Output Schema

Use the shared envelope from `directives/agents/STANDARD_ORCHESTRATION_CONTRACT.md`.

```json
{
  "status": "ok|needs_review|blocked",
  "confidence": 0.0,
  "findings": ["string"],
  "recommended_next_step": "string",
  "risk_flags": ["string"],
  "payload": {
    "creative_thesis": "string",
    "concept_options": [
      {
        "name": "string",
        "summary": "string",
        "narrative_arc": ["string"],
        "visual_language": ["string"],
        "execution_modules": ["string"]
      }
    ],
    "scoring_matrix": [
      {
        "concept": "string",
        "strategic_fit": 0,
        "originality": 0,
        "feasibility": 0,
        "total": 0
      }
    ],
    "recommended_concept": "string",
    "rationale": "string"
  }
}
```
