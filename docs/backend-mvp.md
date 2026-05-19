# Backend MVP Plan

## Backend Goals

The backend MVP should provide a clean operational core for support management while capturing structured data for reporting and future Microsoft Fabric integration. The first version should favor simple, reliable workflows over deep configurability.

The backend owns:

- Ticket intake, workflow, assignment, notes, replies, SLA timestamps, and audit history.
- Confluence-lite knowledge articles with publication workflow, visibility, search metadata, and ticket links.
- Customer portal APIs for ticket submission, ticket status, and public/customer knowledge access.
- Chat escalation APIs that create tickets with conversation context.
- Email and manual intake paths.
- Reporting events and export-ready operational data.
- Stable integration APIs for future CRM, Teams, telephony, Fabric, and Power BI work.

## Core Domains

### Ticketing

Minimum ticket records should include stable ID, customer, contact, source channel, title, description, category, priority, status, assigned team, assigned agent, SLA policy, first response due/at, resolution due/at, created/updated/closed timestamps, and created-by metadata.

Ticket workflow should support:

- Portal, email, chat escalation, and manual agent creation.
- Internal notes separated from customer-visible replies.
- Assignment, reassignment, escalation, status changes, priority changes, and category changes.
- Links to knowledge articles.
- Audit events for all material workflow changes.
- Attachments through a storage abstraction, even if local/S3-compatible storage is used in dev.

### Knowledge Articles

The knowledge model should include title, summary, body, category, tags, visibility, status, owner, author, last reviewed date, published date, archived date, and related ticket links.

MVP capabilities should include:

- Draft, review, published, and archived states.
- Public/customer/internal visibility enforcement at API level.
- Search by title, body, tags, category, and visibility.
- Ticket-to-article linking.
- Article usefulness and stale/missing feedback events.
- Basic version history or immutable article change events so later governance can be added without losing history.

### Chat Escalation

The chatbot should remain a support surface, not the system of record. When escalation is needed, the backend should create a ticket with:

- Conversation ID.
- Transcript or summarized transcript.
- Suggested category, priority, customer, and contact when available.
- Articles shown to the customer before escalation.
- Bot confidence and escalation reason.

Chat interactions should emit reporting events for self-service attempts, article suggestions, deflections, and escalations.

### Email And Manual Intake

Email intake should start as a background job or webhook-compatible boundary that can parse sender, subject, body, attachments, and message IDs into ticket records. The MVP should store enough email metadata to support deduplication, threading, and later provider changes.

Manual intake should let agents create tickets from phone calls, walk-ins, Teams messages, or other channels while still requiring source channel, customer/contact, category, priority, and description.

## API Surface

Initial APIs should be versioned, documented, and designed around stable resource IDs.

Core API groups:

- `POST /api/v1/tickets` for portal, manual, and integration-created tickets.
- `GET /api/v1/tickets` with filters for queue, status, customer, channel, priority, category, assignee, and SLA risk.
- `GET /api/v1/tickets/{id}` for full operational ticket detail.
- `PATCH /api/v1/tickets/{id}` for controlled workflow updates.
- `POST /api/v1/tickets/{id}/messages` for internal notes and customer replies.
- `POST /api/v1/tickets/{id}/articles/{articleId}` for knowledge links.
- `POST /api/v1/chat/escalations` for bot-to-ticket escalation.
- `GET /api/v1/articles` and `GET /api/v1/articles/{id}` with visibility-aware access.
- `POST /api/v1/articles`, `PATCH /api/v1/articles/{id}`, and workflow actions for staff users.
- `POST /api/v1/intake/email` or equivalent webhook boundary for email-created tickets.
- `GET /api/v1/reports/operational-summary` for MVP dashboard aggregates.
- `GET /api/v1/exports/events` and `GET /api/v1/exports/dimensions/*` for future data extraction.

Future integration APIs should use service credentials, idempotency keys, correlation IDs, and explicit source-system metadata.

## Operational Database

Use a relational operational database for the MVP, preferably PostgreSQL for Coolify development and portability to Azure Database for PostgreSQL later. Keep operational state normalized and reporting-friendly.

Initial tables should cover:

- Customers and contacts.
- Users, teams, roles, and assignments.
- Tickets, ticket messages, ticket attachments, ticket links, and ticket audit events.
- SLA policies and SLA events.
- Knowledge articles, article versions or article events, article tags, article categories, and article feedback.
- Chat conversations and chat escalation records.
- Intake source metadata for email/manual/portal/chat.
- Reporting events as an append-only event table.

Important data rules:

- Use stable UUIDs or equivalent opaque IDs.
- Capture created/updated/deleted metadata consistently.
- Prefer structured enum/reference fields for channel, priority, status, category, visibility, and event type.
- Keep internal and customer-visible content clearly separated.
- Do not make analytics queries depend on parsing free text.

## Reporting Events

Every significant workflow action should write an immutable reporting event with event ID, event type, occurred time, actor, customer, ticket, channel, category, source system, correlation ID, and event payload.

MVP event types should include:

- Ticket created, assigned, reassigned, escalated, status changed, priority changed, first response sent, resolved, reopened, and closed.
- SLA target created, warning, breached, met, and missed.
- Article viewed, searched, linked to ticket, helpful/unhelpful, flagged stale, and missing article requested.
- Chat started, article suggested, deflected, escalated, and ticket created from chat.
- Email received, email converted to ticket, and manual ticket created.

These events should support operational dashboards immediately and Fabric export later.

## Fabric And Power BI Readiness

Fabric is not part of the MVP runtime, but the backend should be ready to feed OneLake or a Fabric lakehouse/warehouse later.

Readiness requirements:

- Maintain append-only event data with stable schemas.
- Maintain clean dimensions for customers, contacts, agents, teams, categories, priorities, statuses, channels, tickets, and articles.
- Include `created_at`, `updated_at`, and event `occurred_at` timestamps in UTC.
- Include source-system, tenant/company, and correlation metadata from the start.
- Provide batch export APIs or scheduled file exports in a simple format such as CSV or Parquet-compatible JSONL.
- Avoid deleting historical operational records needed for reporting; use archive/status flags where possible.

## Hosting Direction

### Coolify Development

Coolify should host the early development environment with:

- Containerized backend service.
- PostgreSQL operational database.
- Background worker process for email intake, notifications, SLA timers, and export jobs.
- S3-compatible object storage or a storage abstraction for attachments.
- Environment-based configuration for secrets, database URL, storage, email provider, and public API URL.
- Health check endpoint and structured application logs.

### Azure Later

The backend should remain portable to Azure by keeping infrastructure concerns behind configuration and adapters.

Likely later mappings:

- Backend container to Azure App Service, Azure Container Apps, or AKS.
- PostgreSQL to Azure Database for PostgreSQL or another agreed Azure operational database.
- Attachments to Azure Blob Storage.
- Queues/jobs to Azure Service Bus or Storage Queues.
- Search to Azure AI Search if built-in database search is no longer enough.
- Identity to Microsoft Entra ID.
- Analytics export to Microsoft Fabric and Power BI.

## Backend TDD Expectations

Backend work should follow TDD: write failing tests before implementation, implement the smallest useful change, then refactor with tests green. Delivery is not complete until relevant tests have run.

Expected test coverage:

- Unit tests for domain rules such as ticket status transitions, SLA calculations, article visibility, and escalation validation.
- API tests for ticket, knowledge, chat escalation, email intake, and reporting/export endpoints.
- Integration tests for database persistence, event creation, search/filter behavior, and idempotent intake.
- Permission tests separating customer portal, agent, lead, admin, and integration access.
- Regression tests for every bug fix.

Each backend change should state which tests were written first and which test command was run before handoff.

## MVP Delivery Sequence

1. Establish database schema, migrations, test harness, health checks, and event-writing foundation.
2. Build ticket creation, retrieval, workflow updates, messages, assignment, SLA timestamps, and audit/reporting events.
3. Add customer portal ticket submission and status APIs with customer-safe visibility.
4. Add knowledge article CRUD, publication states, visibility filtering, search, ticket links, and article feedback events.
5. Add chat escalation endpoint that creates tickets and records transcript/article context.
6. Add email intake boundary with deduplication and threading metadata.
7. Add operational reporting summary APIs backed by structured events and dimensions.
8. Add export-ready event and dimension endpoints for future Fabric ingestion.
