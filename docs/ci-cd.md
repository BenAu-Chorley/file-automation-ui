# CI/CD strategy

This project uses **Continuous Delivery (CD) with pull-based distribution**.

The application is a **Next.js server application** intended to be run via
`npm start` on **Node.js 24**.  
There is no automatic deployment to servers; users download release artifacts
and run the application themselves.

---

## CI (Continuous Integration)

### Trigger
- Pull request open
- Pull request update
- Push to non-main branches

### Runner
- GitHub-hosted runner

### Purpose
- Validate correctness
- Ensure the application is buildable
- Prevent broken code from being merged

### Steps
- Install dependencies (`npm ci`)
- Run lint checks
- Run unit tests
- Run integration tests
- Build the Next.js application (`npm run build`)
- Publish test coverage reports

CI **does not**:
- Tag releases
- Publish artifacts
- Deploy or distribute the application

---

### Versioning and Tagging Strategy

- The application version is defined in `package.json`
- On each merge to `main`, the CD pipeline:
  - Reads the version from `package.json`
  - Creates a Git tag in the form `vX.Y.Z`
    - e.g. `vHEL-24.20260414.01` or `v3.12.131`
  - Associates the release artifacts with that tag

The tagged commit represents the **official released version**.

---

### CD (Continuous Delivery)

- Checkout the merged `main` branch
- Install dependencies (`npm ci`)
- Build the Next.js application (`npm run build`)
- Create a runtime-only release artifact containing:
  - `.next/`
  - `public/`
  - `package.json`
  - `package-lock.json`
  - `next.config.js` (if applicable)
  - `.env.example`
  - `README.md` (runtime instructions)
- Package the artifact as a compressed archive (a Windows `.zip` file)
- Create or update a GitHub Release for the version tag
- Upload the archive as a **GitHub Release Asset**

---

## Distribution Model

- GitHub Releases act as the **artifact registry**
- Each release corresponds to:
  - A Git tag (e.g. `v20260414 (HEL-24)` or `v3.12.131`)
  - A verified build produced by the CD pipeline
  - One or more downloadable release archives

### How users run the application (Windows Command Prompt)

1. Download the release archive from GitHub Releases
2. Extract the archive to a local directory
3. Open **Command Prompt** (`cmd.exe`)
4. Navigate to the application directory:
   ```cmd
   cd path\to\application
   npm ci --omit=dev
   npm start
   ``
5. To stop the currently running application, press `Ctrl + C`