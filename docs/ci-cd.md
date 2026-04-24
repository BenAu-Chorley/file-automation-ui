# CI/CD strategy

This project uses **Continuous Integration and Continuous Delivery with pull-based distribution**.

The application is a **Next.js server application** intended to run via `npm start` on **Node.js 24**. There is no automatic server deployment; internal users download release archives from GitHub Releases and run them locally.

---

## CI (Continuous Integration)

### Trigger
- Push to any branch
- Manual trigger (`workflow_dispatch`)

### Runner
- GitHub-hosted runner

### Purpose
- Validate correctness
- Ensure buildability
- Prevent broken code from being merged

### Steps
- Install dependencies (`npm ci`)
- Run lint checks (`npm run lint`)
- Run tests (`npm run test`)
- Run coverage (`npm run test:coverage`)
- Build (`npm run build`)
- Upload coverage artifact (`coverage-report`)

### CI artifact retention
- CI artifacts are temporary and should expire after **7 days**.
- This is enforced in CI workflow settings via `retention-days: 7` on artifact upload.

### Regenerate deleted CI artifacts on demand
If a CI artifact has expired or been deleted, regenerate it by running CI again for the same commit.

Option A (GitHub UI):
1. Open the repository `Actions` tab.
2. Open the `CI` workflow.
3. Use `Run workflow` and select the target branch/commit context.
4. After completion, download the new artifact from the run summary.

Option B (CLI):
1. Ensure local checkout points to the target commit.
2. Trigger CI workflow dispatch:
   ```bash
   gh workflow run ci.yml --ref <branch-or-commit-ref>
   ```
3. Open the run and download the regenerated artifact.

CI **does not**:
- Tag releases
- Publish GitHub Releases
- Deploy or distribute the application

---

## CD (Continuous Delivery)

### Trigger
- CI completion on `main` via `workflow_run` (CD runs after CI completes successfully)
- Manual trigger (`workflow_dispatch`) for controlled verification

### Runner
- GitHub-hosted runner

### Versioning and tagging strategy
- Application version is defined in `package.json` with format `yyyyMMdd.PR-number.serial_within_a_day`.
- On each `main` merge, CD reads `package.json` version and tags the commit as `v{version}`.

The tagged commit represents the official released version.

### CD steps
- Checkout repository
- Install dependencies (`npm ci`)
- Build (`npm run build`)
- Create runtime archive containing:
  - `.next/`
  - `public/`
  - `package.json`
  - `package-lock.json`
  - `next.config.ts`
  - `README.md`
  - `.env.example` when present
- Create/push version tag if missing
- Create/update GitHub Release for the tag
- Upload release archive asset

### Release lifecycle policy
- CD tags + Releases + release assets are durable artifacts and remain in place by default.
- They are kept until explicit manual housekeeping is performed.

---

## Housekeeping and storage

### Check total storage size of all release artifacts

GitHub UI:
1. Open `Settings` -> `Billing and plans` -> `Actions`/artifact usage for repository-level storage visibility.
2. Open `Releases` to inspect release-by-release asset sizes.

GitHub CLI (sum of all release asset sizes in bytes):
```bash
gh api repos/<owner>/<repo>/releases --paginate --jq '[.[].assets[]? | .size] | add // 0'
```

GitHub CLI (per-release asset size in bytes):
```bash
gh release list --json tagName,assets --jq '.[] | {tag: .tagName, sizeBytes: ([.assets[].size] | add // 0)}'
```

### Manual cleanup using GitHub UI (tag + release + asset)
1. Open repository `Releases` page.
2. Open the target release and delete it.
   - Deleting the release removes assets attached to that release.
3. Open repository `Tags` page and delete the corresponding tag.
4. Optionally verify that release and tag no longer appear in repository views.

### Manual cleanup using CLI (tag + release + asset)
1. Delete the release (also removes attached release assets):
   ```bash
   gh release delete <tag> --yes
   ```
2. Delete the remote tag:
   ```bash
   git push origin :refs/tags/<tag>
   ```
3. Optionally delete local tag copy:
   ```bash
   git tag -d <tag>
   ```

---

## Distribution model

- GitHub Releases act as the artifact registry.
- Each release corresponds to:
  - A git tag (for example `v20260416.HEL-72.01`)
  - A verified build produced by CD
  - Downloadable runtime archive assets

### Run the application from a release archive (Windows)
1. Download release archive from GitHub Releases.
2. Extract archive to a local directory.
3. Open `Command Prompt`.
4. Install runtime dependencies and start:
   ```cmd
   cd path\to\application
   npm ci --omit=dev
   npm start
   ```
5. Stop the app with `Ctrl + C`.