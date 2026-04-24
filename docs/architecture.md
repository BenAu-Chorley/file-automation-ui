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
- each executor will have it's own component for configuration. To avoid ambiguity:
    - to be clear, same component regardless of the role it is assigned to a task
    - assigning an executor to a role is a job of a task
    - an executor does not care what role it's in, it only need to be aware of that
- the fields in each executor component will be representing db columns (but no need to be exactly the same if necessary)

## Layered Architecture
- use controller-service-repository pattern
- controller layer is an abstraction of orchestrating services in the service layer
- service layer will contain all business logics using domain languages / terms and define ways of data manipulations
- repository layer will be orchestrating DMLs to maintain db records
- need a domain model to represent the domain data, which would be used by the service layer, and will be mapping to and from the repository layer data structures

## Environments
- PR deployments -> UAT (URL prefix per PR)
- master -> internal production

## Project Evolution
- AI-augmented development as much as possible
- GitHub repo as source control
- GitHub Action runners to automate CI/CD pipelines
- one git branch per pull request
- expects concurrent PRs building changes in their own branch
- before merge into the `master` branch, feature branch needs to squash into a single node
    - makes `master` tidy and easy to follow which change brings what
- rebase current feature branch first if master has evolved since branch creation
- squash first before resolving conflicts if possible (that could be easier)
- resolve conflicts within current feature branch before merging