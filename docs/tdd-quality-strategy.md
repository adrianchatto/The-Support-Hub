# TDD And Quality Strategy

## Quality Principle

The Support Hub should be built test-first. Every feature should start with clear acceptance criteria, failing tests, and an agreed definition of done before implementation begins.

No feature is delivered unless its tests have been run and the result is reported.

## TDD Workflow

Use red-green-refactor for every change:

- **Red**: Write the smallest meaningful failing test from the acceptance criteria.
- **Green**: Implement only enough code to pass the test.
- **Refactor**: Improve structure, names, duplication, and performance while keeping tests green.

Developers should keep tests close to the behavior being changed and update tests when requirements change. Test changes should explain the expected behavior, not mirror implementation details.

## Acceptance Criteria

Each story should define testable acceptance criteria before work begins. Criteria should cover:

- The user-visible outcome.
- Required roles and permissions.
- Main success path.
- Validation and error states.
- Reporting or audit data created by the workflow.
- Accessibility and security expectations where relevant.

## Test Pyramid

The default coverage shape should be:

- Many unit tests for domain logic, validation, formatting, permissions, SLA calculations, and data transforms.
- A smaller set of component and API tests for user interactions, request handling, and contract behavior.
- Focused integration tests for workflows that cross boundaries such as ticket creation, bot escalation, knowledge search, email intake, notifications, and reporting events.
- A small, high-value end-to-end suite for critical user journeys.

End-to-end tests should prove the product works as a user-facing system. They should not carry the full burden of coverage.

## Frontend Tests

Frontend tests should cover:

- Ticket list, ticket detail, status changes, assignment, replies, and internal notes.
- Knowledge article search, view, create, edit, publish, and visibility behavior.
- Customer portal ticket submission, ticket status viewing, and knowledge self-service.
- Chatbot answer display, article suggestions, fallback states, and escalation to ticket.
- Management reporting filters, empty states, loading states, and key metric display.
- Form validation, disabled states, error messages, and optimistic update rollback.

Component tests should verify behavior from the user's perspective using accessible roles, labels, and visible text.

## Backend And API Tests

Backend and API tests should cover:

- Ticket lifecycle rules, SLA timestamps, priority/category/status validation, assignment, escalation, and reassignment.
- Customer-visible messages versus internal-only notes.
- Knowledge article permissions, article lifecycle, tags, categories, and search indexing triggers.
- Chatbot escalation creating a ticket with conversation context.
- Reporting event creation for ticket, SLA, knowledge, self-service, and bot interactions.
- Authentication, authorization, and role-based access for agents, customers, leads, and management users.
- API contracts, status codes, validation errors, pagination, sorting, and filtering.

API tests should be contract-focused so future integrations can rely on stable behavior.

## Integration Tests

Integration tests should cover workflows where data crosses service or module boundaries:

- Portal submission creates a ticket, customer-visible timeline entry, and reporting event.
- Chat escalation creates a ticket with transcript and source channel.
- Agent links a knowledge article to a ticket and the article usage event is recorded.
- SLA timers update breach status and reporting measures.
- Search returns only articles visible to the current user.
- Data export produces stable records for Fabric, OneLake, and Power BI consumption.

Use realistic fixtures for customers, contacts, agents, tickets, articles, and events.

## End-To-End Tests

The MVP end-to-end suite should prove the core product journeys:

- Customer searches knowledge, cannot solve the issue, and submits a portal ticket.
- Chatbot suggests an article, fails to resolve the issue, and escalates to a ticket with transcript.
- Agent triages a ticket, replies to the customer, links an article, and resolves the ticket.
- Support lead reviews queue health, SLA risk, recurring issues, and knowledge gaps.
- Management user views reporting across ticket volume, channel, category, priority, customer, status, and SLA performance.

These tests should run against a production-like environment before release.

## Accessibility Tests

Accessibility quality should be built into frontend acceptance criteria. Tests should cover:

- Keyboard navigation for portal, ticketing, knowledge, chatbot, and reporting workflows.
- Semantic landmarks, headings, labels, buttons, dialogs, and tables.
- Color contrast for status, priority, SLA, and chart states.
- Focus management for modals, menus, chat escalation, and form errors.
- Screen reader-friendly validation and empty states.

Automated accessibility scans should run in CI, with manual keyboard checks before release.

## Security Tests

Security tests should cover:

- Authentication and session behavior.
- Role-based access control for customers, agents, leads, management users, and knowledge owners.
- Tenant or customer data isolation if multi-customer access exists.
- Internal note privacy.
- Attachment handling and unsafe file rejection.
- Input validation and output encoding for ticket messages, article content, chat transcripts, and search queries.
- API rate limiting and abuse controls for portal and chatbot entry points.
- Audit events for sensitive workflow changes.

Security regressions should block release.

## Data Export And Reporting Tests

Reporting is part of the MVP, so data quality must be tested from the start. Tests should verify:

- Stable IDs for tickets, customers, contacts, agents, teams, articles, SLA records, and events.
- Immutable event records for important workflow changes.
- Correct reporting dimensions for channel, category, priority, status, customer, agent, team, SLA, and knowledge article.
- Correct measures for ticket count, backlog, first response time, resolution time, SLA compliance, escalation rate, self-service usage, bot deflection, and knowledge gaps.
- Export schemas remain compatible with future Fabric, OneLake, and Power BI pipelines.
- Exports handle deleted, merged, anonymized, or corrected records according to policy.

Breaking changes to export schemas require explicit review and migration notes.

## CI Gates

CI should block merge or release when required checks fail:

- Formatting and linting.
- Unit tests.
- Component tests.
- API contract tests.
- Integration tests for changed workflows.
- End-to-end smoke tests for critical journeys.
- Accessibility scans.
- Security checks, dependency scanning, and secret scanning.
- Database migration checks when schema changes exist.
- Data export schema checks when reporting records change.

Every CI run should publish a clear test report with passed, failed, skipped, and flaky tests.

## Delivery Rule

A feature is not done until:

- Acceptance criteria are written.
- Tests are written before implementation.
- Required tests pass locally or in CI.
- Test results are reported in the work item, pull request, or release note.
- Any skipped or deferred tests are documented with owner, reason, risk, and follow-up date.

If tests cannot be run, the feature is not delivered. The status should be reported as blocked, with the missing test environment or tooling called out plainly.
