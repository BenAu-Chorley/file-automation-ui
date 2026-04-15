# File Automation UI

Internal Next.js TypeScript UI for managing FileAutomation database task definitions and comparing execution history.

## Application Usage

This application is distributed through GitHub Releases as a downloadable `.zip` file. It is not deployed automatically to a shared server.

### Prerequisites

- Windows PC with access to the repository's GitHub Releases page
- Node.js 24 installed and available on `PATH`
- Network access from the user's machine to the target SQL Server environment
- Permission to run Command Prompt and install runtime dependencies locally with `npm`

### Download The Release

1. Open the repository in GitHub.
2. Open the `Releases` page on the right-hand side or via the repository release list.
3. Select the required version tag.
4. Download the attached `.zip` release asset to your local machine.

### Extract And Prepare Locally

1. Extract the `.zip` file to a local folder, for example `C:\apps\file-automation-ui`.
2. Open `Command Prompt`.
3. Change into the extracted folder.
4. Install runtime dependencies:
5. No additional configuration is required for runtime startup. This app does not require setting environment variables or creating local config files before first run.

```cmd
cd C:\apps\file-automation-ui
npm ci --omit=dev
```

### Run The Application

Start the application with:

```cmd
npm start
```

Then open the local URL shown in the terminal, typically `http://localhost:3000`.

### Start Using The App

Before using features, confirm runtime control:

- Start command: `npm start`
- Stop command: `Ctrl + C` in the same terminal session

1. Open the app in your browser.
2. Enter or select the SQL Server connection details required for the FileAutomation database.
3. Verify and activate the connection.
4. Use the task-definition workspace to review or maintain task executor configuration.
5. Use the execution-tracking workspace to compare runner instances and logs.

To stop the application, return to the terminal window and press `Ctrl + C`.

### Troubleshooting Basics

- If integrated security connection testing fails with an ODBC driver error, install Microsoft ODBC Driver 18 for SQL Server on the Windows machine running the app: https://learn.microsoft.com/sql/connect/odbc/download-odbc-driver-for-sql-server
- If an ODBC driver is already installed but has a different name, include an explicit `Driver={...}` entry in the SQL Server connection string.
- If connection test fails with timeout or server not found messages, re-check server name, instance/port, VPN/network access, and SQL Server reachability from your machine.

## Application Development Details

- Internal-only Next.js 16 App Router application for FileAutomation database administration
- Runtime baseline: Node.js 24
- Test runner: Vitest
- Linting: ESLint
- Direct SQL Server connectivity from server-side code using a user-provided connection string
- Controller -> service -> repository layering
- No external API layer
- Primary users are internal technical users maintaining task definitions and reviewing execution history

## Local Development

Install dependencies:

```bash
npm ci
```

Start the development server:

```bash
npm run dev
```

## Quality Gates

Milestone 5 local validation commands:

```bash
npm run lint
npm run test
npm run test:coverage
npm run build
```

Coverage reports are written to the `coverage/` directory and include text, HTML, JSON summary, and LCOV outputs.

Current enforced coverage thresholds:

- statements: 75%
- branches: 75%
- functions: 75%
- lines: 75%

## Runtime Notes

- Runtime baseline: Node.js 24
- Test runner: Vitest
- Linting: ESLint
- Build target: Next.js 16 App Router application

## Project Scope

- Internal technical users only
- No external API layer
- Runtime SQL Server connection string supplied by the user
- Controller -> service -> repository layering

