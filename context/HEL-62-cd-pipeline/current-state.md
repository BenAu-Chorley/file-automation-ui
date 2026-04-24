Last updated: 2026-04-24

- PR scope is HEL-62: fix CD pipeline trigger so release workflow runs after CI completion on the actual trunk branch.
- HEL-72 is merged and closed.
- Verified repository default branch is `master` (`origin/HEAD -> origin/master`).
- Root cause identified in `.github/workflows/cd.yml`: CD listened for CI completion on `main` and also gated the release job on `github.event.workflow_run.head_branch == 'main'`.
- Fix applied:
  - changed `workflow_run.branches` from `main` to `master`
  - changed release job guard branch check from `main` to `master`
- Directly related docs updated in `docs/ci-cd.md` so trigger and tagging text now reference `master`.
- Additional canonical docs/context reviewed and normalized where `main` clearly meant the default trunk branch (`docs/architecture.md`, `docs/development-plan.md`, and HEL-72 current-state context note).
- Approved decisions-doc cleanup applied: HEL-72-specific sections were moved out of `docs/decisions.md` into `context/HEL-72-build-UI/archived-decisions.md`.
- Version advanced for HEL-62 kickoff to `20260424.HEL-62.01` in both `package.json` and `package-lock.json`.
- HEL-62 validation is complete for the touched files; it is now pending user review.

- Checkpoint view:
  - bug is localized to CD branch gating and has been fixed at the trigger source
  - canonical branch-name references are aligned with the actual `master` trunk where applicable
  - documentation and version metadata are aligned with the change
  - touched files validate cleanly with no reported errors
  - remaining step is user review
