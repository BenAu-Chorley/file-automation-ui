# Architecture

## Overview
- Single Next.js app in typescript to provide a UI for data visualization
- use app router for navigation
- The UI is stateful. It keeps the user-provided db connection string in the UI and we start from there
- If the user changes the connection string, the UI asks for confirmation to switch to another DB

## Frontend
- tailwind
- typescript
- prefer server-side components unless we need interactivity
- each executor will have it's own component for configuration
- the fields in each executor component will be representing db columns (but no need to be exactly the same if necessary)

## Layered Architecture
- use controller-service-repository pattern
- controller layer is an abstraction of orchestrating services in the service layer
- service layer will contain all business logics using domain languages / terms and define ways of data manipulations
- repository layer will be orchestrating DMLs to maintain db records
- need a domain model to represent the domain data, which would be used by the service layer, and will be mapping to and from the repository layer data structures

## Environments
- PR deployments -> UAT (URL prefix per PR)
- main -> internal production
