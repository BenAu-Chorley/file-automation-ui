# Development Plan (HEL-72)

## Purpose
This plan defines phased delivery for the File Automation UI wireframe with clear checkpoints after each slice.

Scope alignment:
- Internal-only Next.js TypeScript app
- No external API layer
- Direct DB connectivity from server-side code using a user-provided connection string
- Controller-service-repository layering with domain model mapping
- Executor-specific, role-aware configuration UI and execution comparison UI

## Delivery Strategy
- Deliver in small, verifiable slices.
- At the end of each milestone, complete a checkpoint before moving forward.
- Keep pull requests focused and squash before merge to keep `master` history clean.

## Milestone 0: Foundations and Guardrails

### Objective
Establish a stable baseline for implementation and team workflow.

### Work slices
1. Confirm canonical scope and assumptions from docs.
2. Confirm project runtime baseline (Node 24, Next.js app router).
3. Define coding conventions for layering and domain naming.
4. Define test strategy boundaries (unit vs integration for this wireframe).

### Checkpoint M0
- `docs` are internally consistent for architecture, DB connectivity, and CI/CD expectations.
- Team agrees on layering conventions and naming rules.
- Baseline commands execute locally:
  - `npm ci`
  - `npm run lint`
  - `npm run build`

Exit criteria:
- Foundation is stable enough to start application feature implementation without architecture ambiguity.

## Milestone 1: Connection and App State Flow

### Objective
Implement the runtime connection-string flow and state reset behavior.

### Work slices
1. Create connection input flow and validation action.
2. Add DB connection test behavior (success/fail feedback).
3. Persist connection string in app state for current session.
4. Implement confirmation prompt when changing connection string.
5. Reset application state on confirmed connection change.

### Checkpoint M1
- User can input connection string and run connection test.
- Failure path is handled safely with clear feedback.
- Connection change requires confirmation and resets dependent UI state.
- No external API introduced.

Exit criteria:
- Reliable session-level DB connection workflow exists and is ready for task/executor feature integration.

## Milestone 2: Domain and Data Access Layers

### Objective
Establish domain model, repository mappings, and service orchestration for task definitions.

### Work slices
1. Define domain types for task, role, executor config, runner instance, and runner log.
2. Implement repository contracts for:
   - Task definitions (`fa.t_runner_task`)
   - Executor tables (`fa.t_executor_*`)
   - Execution tracking (`fa.t_runner_instance`, `fa.t_runner_log`)
3. Implement service layer operations using domain language.
4. Add controller-level orchestration for UI-facing use cases.
5. Add mapping tests for DB shape to domain shape.

### Checkpoint M2
- End-to-end read path works for a task and related executor details.
- End-to-end write/update path works for at least one executor table pattern.
- Mapping logic is covered by tests for required and optional fields.
- Layer boundaries are respected (controller -> service -> repository).

Exit criteria:
- Core domain/data stack is usable by feature UI components.

## Milestone 3: Task Definition UI (Executor Components)

### Objective
Deliver UI to view and maintain task definitions with role-aware executor components.

### Work slices
1. Build task list/detail navigation structure.
2. Add role selection and executor component switching.
3. Implement dedicated forms for each executor type (one form per executor type regardless of role assignment, while keeping assigned role awareness):
   - ItrentNewJoiner2Csv
   - LocalFile2Sftp
   - LocalFileCopy
   - LocalFolder2Sftp
   - SftpFile2Local
   - SftpFolder2Local
   - NoOp placeholder handling
4. Add form validation and save/update flow.
5. Add success/error state handling for maintain operations.

### Checkpoint M3
- Users can load a task and edit all relevant executor fields.
- Each executor type renders the correct field set.
- Required vs optional fields match DB model constraints.
- Changes persist and can be reloaded accurately.

Exit criteria:
- Task definition management is functionally complete for wireframe scope.

## Milestone 4: Execution Tracking and Comparison UI

### Objective
Provide execution visibility and side-by-side comparison capability.

### Work slices
1. Build runner instance listing/filtering by task and start date range.
2. Build runner log retrieval for selected instance.
3. Implement multi-instance selection (up to three instances).
4. Render side-by-side vertical log columns with independent scrolling.
5. Add basic status/time visualization and empty/error states.

### Checkpoint M4
- User can select one task and compare logs from up to three runner instances.
- Columns scroll independently and preserve readability.
- Status and timing fields are visible for each compared log stream.

Exit criteria:
- Execution tracking comparison experience is complete for declared requirements.

## Milestone 5: Quality Gates (ESLint, Vitest, Coverage)

### Objective
Establish CI-aligned quality automation.

### Work slices
1. Finalize ESLint configuration and enforce in CI.
2. Add Vitest setup for unit and integration test layers.
3. Add coverage collection and thresholds.
4. Add test scripts and docs for local execution.

### Checkpoint M5
- `npm run lint` passes locally and in CI.
- Unit and integration tests execute reliably in CI.
- Coverage report is produced and published in pipeline output.

Exit criteria:
- Quality gate automation is enforceable before merge.

## Milestone 6: CI/CD Pipeline and Release Packaging

### Objective
Implement delivery pipeline for pull-based distribution via GitHub Releases.

### Work slices
1. Implement CI workflow for PR/non-master validation.
2. Implement CD workflow for merge-to-master release packaging, gated by required CI success before merge.
3. Tag releases using format `v{yyyyMMdd}.{PR-number}.{serial_within_a_day}` (for example: `v20260406.HEL-72.02`) as defined in CI/CD strategy.
4. Package runtime archive with required files (`.next`, `public`, runtime manifests/docs).
5. Publish GitHub Release assets.

### Checkpoint M6
- CI runs lint, tests, build on PR updates.
- CD creates version tag and release asset on `master` merge only after CI-required checks have passed for merge.
- Archive contents match runtime requirements and can be executed manually.

Exit criteria:
- Release artifact is consistently generated and distributable.

## Milestone 7: User Runbook and Handover

### Objective
Document operational usage for internal users.

### Work slices
1. Provide Windows runtime instructions (`npm ci --omit=dev`, `npm start`).
2. Document required environment variables and sample config.
3. Document start/stop and troubleshooting basics.
4. Confirm release consumption flow from GitHub Releases.

### Checkpoint M7
- Internal user can download, unpack, install runtime deps, and run app successfully.
- Internal user can stop app process safely (`Ctrl + C`).
- Runbook is complete and consistent with CD artifact structure.

Exit criteria:
- Project is ready for internal consumption with repeatable operations.

## Cross-Milestone Validation Checklist
- Buildability: `npm run build` remains green.
- Layering integrity: no direct UI-to-repository coupling.
- DB safety: connection failures and invalid inputs handled explicitly.
- Usability: critical task and execution workflows remain understandable.
- PR hygiene: focused slices, rebased branch, squash before merge.
- Neat versioning: update version number in `package.json` based on the existing value + 1. Update the version number each time you start to work on a new task (i.e. the previous one had been approved and released). Reset daily serial part to `01` for the first release that day and go from there.

## Suggested Immediate Sequence for HEL-72
1. Complete Milestone 0 checkpoint (documentation and baseline verification).
2. Execute implementation milestone by milestone in sequence (M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7).
3. After completing each milestone checkpoint, stop and wait for explicit user approval before starting the next milestone.
4. Finish with Milestone 7 runbook validation against a real release archive after prior milestone approvals.
