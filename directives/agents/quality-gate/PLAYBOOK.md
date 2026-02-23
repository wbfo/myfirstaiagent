# Quality Gate Playbook

## Phase 1: Context Ingestion

1. Receive request from HoneyBadger specifying `task_type: "quality_check"`.
2. Inspect the submitted `input_payload` and the `required_schema`.

## Phase 2: Schema Validation

1. Compare the shape and data types of `input_payload` strictly against `required_schema`.
2. Ensure there are no missing required fields or undocumented extra fields.

## Phase 3: Risk Rule Evaluation

1. Scan the text/payload for common quality risks (e.g. trailing empty paragraphs in content, broken markdown table alignment, unescaped JSON).
2. Execute any `.py` structural validation scripts placed in `execution/` specific to the task type.

## Phase 4: Enveloping

1. Format your response matching the `support sub-agent -> HoneyBadger` JSON envelope.
2. If schema fails, set status to `blocked` and list exact field errors in `findings`.
3. If schema passes but context seems flawed, set status to `needs_review` and detail the risk in `risk_flags`.
4. If pristine, set status to `ok`.
