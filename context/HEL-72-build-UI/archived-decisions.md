# Archived HEL-72 Decisions

Moved on: 2026-04-24
Source: docs/decisions.md
Reason: These sections were approved as HEL-72-specific evolution notes and archived out of canonical docs.

## Milestone 2 kickoff carryover UX decisions
- Keep connection test-result confirmation at the top of the Session connection section.
- Use a compact icon-style control for Active connection detail expand/collapse to reduce visual weight.
- Preserve Session connection panel open state after clicking Use this connection to avoid abrupt collapse.

## Milestone 3 batch 2 save semantics
- Executor selection changes are staged in UI per role and are not persisted until explicit user confirmation on `Save`.
- Role-level `Cancel` discards staged role changes only after explicit user confirmation.
- Persisting a role executor is a single transactional operation that must include both:
  - updating executor class choice on `fa.t_runner_task` for the role column, and
  - executor-row mutation according to transition semantics:
    - same class: update/upsert existing row
    - class switch between non-`NoOp` executors: delete old row then add new row
    - switch from `NoOp`: add new row only
    - switch to `NoOp`: delete old row only
