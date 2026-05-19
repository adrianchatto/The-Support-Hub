# Frontend MVP Plan

## Experience Goal

The Support Hub frontend should feel like a modern service management workspace: structured enough for ITIL discipline, simple enough for daily support work, and polished enough to suit a Dubai advisory-style enterprise product. It should avoid a loud AI-product aesthetic. Automation and bot support should appear as quiet workflow assistance, not the core brand.

## MVP App Surfaces

- **Agent workspace**: queue overview, ticket list, filters, SLA indicators, assignment controls, and a focused ticket detail view with replies, internal notes, customer context, linked articles, status changes, and escalation history.
- **Customer portal**: authenticated customer home, ticket submission, ticket status tracking, public knowledge search, suggested articles before submission, and a simple escalation path from chat to ticket.
- **Knowledge base**: Confluence-lite article browse, search, category hierarchy, article detail, status/visibility labels, article editor shell, and ticket-to-article linking from the agent workspace.
- **Chatbot entry point**: customer-facing chat panel that searches approved knowledge, suggests articles, captures missing context, and creates a ticket with conversation transcript when escalation is needed.
- **Management reporting**: operational dashboard for ticket volume, queue health, SLA performance, resolution time, top categories, recurring issues, channel mix, customer trends, and knowledge gaps.
- **Admin foundations**: lightweight configuration screens for categories, priorities, teams, SLA policies, article categories, and channel/source labels.

## UX Principles

- **Simple by default**: show the next useful action first; keep advanced controls reachable but secondary.
- **Operational clarity**: make ownership, priority, SLA risk, customer impact, and next step visible without forcing agents to open multiple views.
- **ITIL without heaviness**: use incident/request/problem/change language where valuable, but keep flows opinionated and approachable for MVP users.
- **Knowledge in the workflow**: article search, linking, and gaps should live next to ticket work rather than in a separate maintenance-only area.
- **Customer trust**: portal and chat experiences should be calm, transparent, and status-oriented; customers should always know whether they are self-serving, chatting, or creating a ticket.
- **Reportable interactions**: every visible workflow should capture structured fields and events that can later feed Glass Hub, Fabric, OneLake, and Power BI.
- **Quiet intelligence**: recommendations can help with article suggestions, categorization, and escalation prompts, but UI copy and layout should present them as support assistance rather than AI spectacle.

## Component And Design-System Direction

- Establish a restrained enterprise UI kit with navigation shell, page header, data toolbar, filter controls, status badges, SLA indicators, tables, tabs, drawers, modals, forms, timelines, empty states, and dashboard chart containers.
- Prefer dense but readable layouts for operational screens: stable table columns, clear row states, keyboard-friendly actions, and compact metadata blocks.
- Use cards only for repeated objects or dashboard metrics; avoid decorative nested-card layouts.
- Build ticket, article, customer, and reporting patterns as reusable domain components rather than one-off page sections.
- Define semantic tokens for color, spacing, typography, radius, elevation, focus, status, priority, SLA risk, and visibility.
- Keep visual tone crisp and modern: neutral foundation, confident accent colors, strong information hierarchy, restrained motion, and accessibility-first contrast.
- Design responsive behavior for real workflows: management dashboards should degrade gracefully, while ticket and article detail screens should preserve key actions on tablet and mobile.
- Plan for future white-label or multi-brand needs by keeping product shell, customer portal theme, and status semantics tokenized.

## Frontend Testing And TDD Expectations

- Tests come before implementation for every frontend behavior change. The expected cycle is: write a failing test, implement the smallest useful change, run the relevant tests, then refactor with tests still passing.
- Component tests should cover rendering states, role-based visibility, form validation, ticket actions, article search/linking behavior, chatbot escalation states, and dashboard loading/error/empty states.
- Interaction tests should verify core user journeys: submit ticket, escalate chat to ticket, update ticket status, add internal note, send customer reply, link article, publish article, filter queues, and inspect SLA risk.
- Accessibility tests should be part of component and page-level coverage, including keyboard navigation, focus management, dialog behavior, labels, landmarks, color contrast, and screen-reader names for status indicators.
- Visual regression coverage should protect core layouts: agent queue, ticket detail, customer portal home, article detail/editor, chatbot panel, and management dashboard.
- Mock APIs with stable fixtures that reflect the reporting model: channels, categories, priorities, SLA timestamps, customer/account IDs, knowledge usage, and workflow events.
- End-to-end tests should cover the MVP happy paths in a deployed-like environment before delivery: customer self-service, ticket creation, agent handling, knowledge linking, chat escalation, and management dashboard review.
- Pull requests should not be considered ready until the newly written tests and the relevant existing frontend test suite have been run and the result is recorded.

## MVP Delivery Sequence

1. Build and test the shared shell, design tokens, navigation, authentication-aware route structure, and core data fixtures.
2. Build and test ticket queue and ticket detail workflows for agents.
3. Build and test customer portal ticket submission and ticket status views.
4. Build and test knowledge browse, search, article detail, and article linking from tickets.
5. Build and test chatbot knowledge suggestions and escalation-to-ticket flow.
6. Build and test management reporting dashboards using structured operational fixtures.
7. Harden accessibility, responsive behavior, visual regression coverage, and deployment readiness for Coolify.

## Open Frontend Decisions

- Confirm the first required channels: portal, email, chat, phone, Teams, or WhatsApp.
- Confirm whether the first portal audience is external customers, internal staff, or both.
- Choose the initial frontend stack, test runner, component testing approach, and visual regression tool before app code begins.
- Decide whether management reporting in MVP is built as native dashboards first, embedded Power BI later, or both in phases.
- Define the minimum role model for MVP: customer, agent, support lead, management user, knowledge owner, and admin.
