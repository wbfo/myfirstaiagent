#!/usr/bin/env python3
import sys
import json
import time

def main():
    try:
        input_data = sys.stdin.read().strip()
        if not input_data:
            print(json.dumps({"error": "No war room context provided on stdin"}), file=sys.stderr)
            sys.exit(1)

        payload = json.loads(input_data)
        metrics = payload.get("metrics", {})
        active_blockers = payload.get("blockers", [])
        
        report = {
            "generated_at_ts": int(time.time()),
            "status": "baseline_established",
            "active_blocker_count": len(active_blockers),
            "summary": "Weekly war room summary rolled up successfully.",
            "metrics": metrics,
            "recommended_focus": "Address critical integration blockers if count > 0."
        }
        
        if len(active_blockers) > 0:
            report["status"] = "attention_required"
            report["recommended_focus"] = active_blockers[0].get("description", "Address primary active blocker.")
            
        print(json.dumps(report, indent=2))
        sys.exit(0)

    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Invalid JSON payload: {str(e)}"}), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"War room summary failure: {str(e)}"}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
