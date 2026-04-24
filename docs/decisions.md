# Architecture Decisions

## 2026-04-15
- Use Next.js app routes
- Avoid Docker in CD artifacts
- Use zip files to store Next.js build artifact in CD pipeline
- Use GitHub Release as **artifact registry** and take the version tag from package.json
- Users will need to download the release archive from GitHub Releases
- Users will need to manually unzip, then follow a pre-defined series of commands to install deps and start the server
- Users are responsible for stopping the server after use using `Ctrl + C`
- no need to use API
- connect to db directly in server-side components
- user provide connection string (need to test connections first or throw)
- keep the connection string in app's state. Changing connection string resets the app's state
- using controller-service-repository layers to organize abstractions
- service layer uses domain concepts as nouns. Other layers need to use their own translations / mappings if needed
- this app helps user manage task configurations, and shows users task execution results for comparisons
- a dedicated component for each executor, so that data fields / columns specific to a component can render values or accept changes properly

## 2026-04-16

### Milestone 0 foundation decisions
- Runtime baseline: Node.js 24 with Next.js 16 App Router.
- Prefer server components by default; use client components only when interactivity, browser APIs, or client state requires them.
- Keep implementation boundaries explicit: UI routes/components may call controller actions only; controllers orchestrate services; services express domain behavior; repositories are the only layer that talks to the database.
- Use domain-first naming in non-repository layers: `TaskDefinition`, `ExecutorAssignment`, `ExecutorConfig`, `RunnerInstance`, and `RunnerLog`.
- Keep database table and column naming isolated to repository mappings.
- Executor forms are executor-specific and role-aware; role assignment belongs to task orchestration, not executor form identity.
- Package version format is `yyyyMMdd.PR-number.serial_within_a_day`; release tags prepend `v` to that value.

### Milestone 0 test strategy boundaries
- Unit tests cover pure mappings, validation rules, service logic, and controller orchestration with mocked dependencies.
- Integration tests cover repository behavior and end-to-end use-case orchestration across controller, service, and repository layers using controlled fixtures or an isolated test database when introduced.
- Browser E2E and visual regression coverage are out of scope until core task and execution workflows stabilize.
- CI quality gates in Milestone 5 are expected to run lint, unit tests, integration tests, build, and coverage reporting.

## 2026-04-17

### Milestone 1 review follow-up decisions
- Keep the two-step connection flow of test first, then activate.
- Keep confirmation prompts for connection switching and the success confirmation after activation.
- Keep active connection persistence in cookies and preserve cookie-based clear behavior.
- Support SQL Server integrated security as a first-class path because it is the preferred way to avoid exposing passwords in the UI workflow.
- Replace the session workspace revision metric with a cookie-backed MRU connection list.
- Replace raw normalized connection-string display with parsed key/value display, masking password-like fields.
- Remove the redundant standalone test-state summary because success and failure feedback already lives in the connection workflow notice area.
- Keep the connection workflow compact and collapsible so it remains a building block rather than the primary screen content.

### Versioning execution rule
- At the start of each newly approved milestone, increment the version in both `package.json` and `package-lock.json` before implementing changes for that milestone.
- Daily serial must reset to `01` for the first change started on a new day (for example, `20260417.HEL-72.01`).

## 2026-04-20

### Milestone 2 review follow-up decisions
- Keep a reusable SQL Server connection pool alive after activation and close it when the user clears or switches the session connection string.
- Acquire DB access at controller operation scope (not service or repository scope) and pass the executor/transaction context down to service and repository calls.
- Wrap mutating controller operations in a transaction so rollback can protect the full logical operation.
- Use class/factory-based controller composition with dependency injection to improve testability and keep related controller methods grouped.
- Use explicit domain fields in task summaries (`name`, `descp`) instead of a single derived display label.
- Remove duplicate `executorClass` from nested executor config payloads to avoid divergence with assignment-level executor class.
- Rename runtime DB connectivity probe from `testSqlServerConnection` to `verifySqlServerConnection` to avoid unit-test naming ambiguity.
- Move tests under `testSrc/` and run them through `npm run test` using Vitest.

## 2026-04-21

### Source-of-truth and memory refresh routine
- Rule of thumb: treat `docs/*.md` and `context/{current PR}/*.md` as source of truth for scope, status, and next actions.
- Repository memory is a convenience cache and must not override authoritative docs/context when there is any conflict.
- Start-of-day routine for HEL-72 work:
	1. Clean repository memory entries related to the active PR.
	2. Reload repository memory from current authoritative files under `docs/*.md` and `context/{current PR}/*.md`.
	3. Proceed with implementation only after memory reflects current docs/context state.

### Context note relevance rule
- Organize `/context/` as one folder per active or archived PR/workstream so PR-specific operational notes stay grouped with their own `current-state.md` and `next-tasks.md` files.
- Keep `context/{current PR}/current-state.md` and `context/{current PR}/next-tasks.md` focused on currently relevant status and actionable next work.
- Remove or collapse superseded historical details once they are no longer needed for day-to-day execution.
- Preserve milestone approval gates and active pending items so these files remain operational checklists, not long-form history logs.

### Repository memory summary standard
- Keep repository memory as a concise summary of the canonical `docs/*.md` and `context/{current PR}/*.md` files rather than a verbatim copy.
- The summary must stay close enough to the canonical files that implementation choices and day-to-day decisions would be the same whether working from repository memory or by re-reading the canonical files.
- If a canonical file changes in a way that affects scope, status, constraints, validation, or next actions, refresh repository memory to preserve that alignment.

### Executor upsert generalization rule
- Treat `LocalFileCopy` as a normal executor class in the same generalized executor save/update path used by other executor classes.
- Do not maintain parallel special-case upsert stacks (`upsertLocalFileCopyExecutor` vs `upsertExecutorConfig`) across actions, controllers, services, repositories, or UI editors.
- Keep executor validation/schema metadata centralized so required/optional fields, type normalization, and constraints apply consistently across all non-`NoOp` executor classes.

### Milestone 3 task metadata editing rule
- Task-level fields `name` and `descp` on `fa.t_runner_task` are editable independently from executor edits.
- Saving `name`/`descp` uses a separate transactional controller operation that updates only those columns and does not mutate executor class assignments or executor tables.
- Validation must align with DB model constraints: `name` required max length 50, `descp` required max length 200.

### Milestone 3 consolidated summary
- Keep one generalized executor persistence path for all non-`NoOp` classes (including `LocalFileCopy`) using shared schema metadata for UI rendering and service validation.
- Enforce transactional role-save semantics: task role class update and executor table mutation must commit/rollback together.
- Keep role edits and task metadata edits as separate save flows so each can be validated, confirmed, and persisted independently.
- Keep explicit staged-edit UX: per-role save/cancel confirmations, unsaved-change cues, and field-level revert controls.
- Align UI and service validation directly with `docs/db-model.md` constraints, including requiredness, max lengths, and enum-allowed values.

### Milestone 4 feedback decisions
- Keep `context/*/current-state.md` concise and operational; move durable behavior/UX decisions into `docs/decisions.md`.
- Default all task role class panels (`Extractor`, `Transformer`, `Loader`) to collapsed on initial task load because execution tracking is the primary focus during Milestone 4.
- Use broader content width on wide monitors to reduce unused side margins while still keeping balanced page padding.
- Execution tracking date filters use date-only inputs with labels `Start date from` and `Start date before`.
- Upper-bound filter semantics are exclusive (`start_time < beforeDate`) to match natural-language "before" behavior and avoid ambiguity.
- Show earliest/latest start-date hints under filter controls using current filtered result bounds.
- Keep the `Instances` selector panel above comparison columns (including wide screens); render instance selectors in denser rows on wide screens (up to 4 per row).
- Emphasize status in titles:
	- instance selector/title uses `Instance #N (Status)` with color emphasis for warning/failure states
	- log row title uses `Log #N (Status)` and removes separate `status:` line
	- field labels (`start`, `end`, `remarks`) are bold for scanability
- Responsive comparison cap:
	- wide screens: up to 3 concurrent compared instances
	- narrow/non-wide screens: up to 2 concurrent compared instances