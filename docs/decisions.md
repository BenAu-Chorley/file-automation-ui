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