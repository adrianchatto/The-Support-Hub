# MVP Delivery Plan

## MVP Intent

The MVP should prove that The Support Hub can run a complete support workflow:

1. A customer searches for help.
2. Knowledge and chatbot support try to resolve the issue.
3. The customer escalates to a ticket when self-service is not enough.
4. An agent triages, responds, links knowledge, and resolves the ticket.
5. A support lead or manager sees the operational impact in reporting.

This end-to-end flow matters more than building every advanced feature in each area.

## MVP Modules

- **Customer portal**: knowledge search, ticket submission, ticket status.
- **Agent workspace**: queue, ticket detail, replies, internal notes, assignment, SLA indicators.
- **Knowledge base**: article browsing, article detail, basic editing, publication status, visibility, ticket linking.
- **Chatbot escalation**: knowledge-grounded suggestions and ticket creation with transcript/context.
- **Management reporting**: ticket volume, SLA performance, channel mix, categories, backlog, recurring issues, and knowledge gaps.
- **Integration foundation**: versioned APIs, reporting events, export-ready data, stable IDs.

## Delivery Streams

### Product Manager

Owns scope, acceptance criteria, sequencing, integration, and final delivery explanation.

### Frontend Engineer

Owns customer portal, agent workspace, knowledge UI, chatbot panel, dashboards, component patterns, accessibility, and frontend tests.

### Backend Engineer

Owns APIs, database model, ticketing logic, knowledge logic, chat escalation, reporting events, exports, background jobs, and backend tests.

### Test Engineer

Owns TDD discipline, acceptance-test coverage, integration and end-to-end strategy, accessibility checks, security/data quality gates, and test reporting.

## First Build Sequence

1. Select the application stack and test tooling.
2. Create the initial app skeleton with CI and test commands.
3. Write the first failing tests for the end-to-end ticket creation path.
4. Implement the smallest working ticket model, API, and UI path.
5. Add knowledge article search/linking with tests.
6. Add customer portal and chat escalation with tests.
7. Add operational reporting from structured events with tests.
8. Prepare Coolify deployment configuration.

## Scope Guardrails

- Build a usable end-to-end workflow before deep customization.
- Keep the chatbot simple and knowledge-grounded for MVP.
- Treat reporting events as part of the product, not as an afterthought.
- Do not block MVP on full CRM, full ITSM configurability, or Fabric implementation.
- Keep API and data design ready for future CRM, Azure, Fabric, and Power BI integrations.

## Default Technical Direction

Final stack choice is still open, but the current architecture assumptions are:

- Containerized web application suitable for Coolify.
- Relational operational database, likely PostgreSQL.
- Versioned API surface from the start.
- Background worker for email intake, SLA timers, notifications, and exports.
- Clean event records and dimensions for future Microsoft Fabric ingestion.
- Azure-compatible storage, identity, queue, and hosting abstractions.

## MVP Definition of Done

The MVP is ready when:

- The core end-to-end support workflow works in a deployed-like environment.
- Tests exist for critical frontend, backend, API, integration, and end-to-end paths.
- Relevant tests pass and are reported.
- Management reporting uses structured operational data.
- The app can be deployed to Coolify for development review.
- The architecture has a documented path to Azure and Fabric.

