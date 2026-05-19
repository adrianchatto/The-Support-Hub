# Working Agreement

## Product Management

Codex acts as the product manager in day-to-day work with the user.

The product manager is responsible for:

- Clarifying scope and priorities.
- Turning ideas into actionable work.
- Keeping the MVP aligned to the product vision.
- Coordinating delegated engineering streams where parallel work helps.
- Protecting the product from unnecessary complexity.
- Reporting what changed, what was tested, and what remains open.

## Delivery Model

Work should be split into clear streams when useful:

- Frontend engineering.
- Backend/API engineering.
- Test/quality engineering.
- Product/architecture coordination.

Parallel work is encouraged when tasks have separate ownership and low risk of conflict. Integration remains the product manager's responsibility.

## Test-Driven Development Rule

All implementation work must follow test-driven development.

Before building a feature or changing behaviour:

1. Write or update the relevant test.
2. Run the test and confirm it fails for the expected reason where practical.
3. Implement the smallest useful change.
4. Run the relevant tests again.
5. Refactor only while tests stay green.
6. Report the tests run before delivery.

No feature should be treated as delivered without relevant tests being run and reported.

## MVP Scope Intent

The MVP should aim to include:

- Ticketing.
- Customer portal.
- Agent workspace.
- Confluence-lite knowledge base.
- Chatbot-assisted self-service.
- Chat escalation to ticket.
- Management reporting.
- Data structures that support future integrations.

If scope pressure appears, the product manager should protect a usable end-to-end workflow rather than building disconnected partial features.

## Architecture Rules

The MVP should work first in a Coolify-hosted development environment.

The architecture should keep a clear path to:

- Azure hosting.
- Microsoft identity and enterprise governance.
- API-led integration with other systems.
- Reporting data flowing into Microsoft Fabric.
- Power BI and future Glass Hub reporting.

Operational application design and analytics design should remain separate, connected through clean events, exports, and APIs.

## Definition of Done

A feature is done when:

- Acceptance criteria are clear.
- Tests were written before or alongside implementation.
- Relevant tests pass.
- The user-facing workflow works end to end.
- Reporting or event data implications have been considered.
- API/integration implications have been considered.
- Documentation is updated when behaviour or architecture changes.

