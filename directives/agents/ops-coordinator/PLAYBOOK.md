# Ops Coordinator Playbook

1. Validate incoming task envelope.
2. Check duplicates via `task_id`.
3. Recommend route or retry.
4. If conflict or deadline risk, return `needs_review`.
