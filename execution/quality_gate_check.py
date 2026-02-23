#!/usr/bin/env python3
import sys
import json
import jsonschema
from typing import Dict, Any

def main():
    try:
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"error": "No validation payload provided on stdin"}), file=sys.stderr)
            sys.exit(1)

        payload = json.loads(input_data)
        
        artifact = payload.get("artifact", {})
        required_schema = payload.get("required_schema", {})
        
        status = "ok"
        confidence = 1.0
        findings = []
        risk_flags = []
        recommendation = "Artifact approved against schema."

        if not required_schema:
            status = "needs_review"
            confidence = 0.5
            risk_flags.append("No schema definition provided for strict validation.")
            recommendation = "Proceed with caution or reject back to orchestrator requesting schema."
        else:
            try:
                jsonschema.validate(instance=artifact, schema=required_schema)
                findings.append("Schema constraint validation passed.")
            except jsonschema.exceptions.ValidationError as e:
                status = "blocked"
                confidence = 0.99
                findings.append(f"Validation Error: {e.message}")
                risk_flags.append(f"Failed at JSON path: {'/'.join(str(p) for p in e.path)}")
                recommendation = "Reject back to specialist for schema correction."

        response = {
            "status": status,
            "confidence": confidence,
            "findings": findings,
            "recommended_next_step": recommendation,
            "risk_flags": risk_flags
        }
        
        print(json.dumps(response, indent=2))
        sys.exit(0)

    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON payload: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Quality gate runtime failure: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
