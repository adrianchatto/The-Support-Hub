# The Support Hub

The Support Hub is the first product in a broader hub platform for service management, knowledge, customer operations, and executive reporting.

The initial goal is to build a modern, simple support platform inspired by ServiceNow's operating discipline and Freshdesk's usability. It should support ITIL-aligned workflows without making agents or customers feel like they are using a heavy enterprise tool.

## Product Pillars

- **Support Hub**: Ticketing, intake, SLAs, queues, agent workflows, customer communication.
- **Knowledge Hub**: Confluence-lite knowledge base, self-service, article recommendations, ticket-linked knowledge.
- **Customer Hub**: Customer and account context, contact history, future CRM capability.
- **Glass Hub**: Single pane of glass reporting across support, customer, commercial, and operational systems.

## Current Status

This repository now contains the first tested MVP slice: a React/Vite support workspace with ticketing, knowledge search, customer portal, chatbot escalation, and basic reporting.

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
npm run lint
```

## Coolify

The included `Dockerfile` builds the Vite app and serves the production bundle with Nginx.

## Documentation

- [Working Agreement](docs/working-agreement.md)
- [Product Vision](docs/product-vision.md)
- [Support Hub PRD](docs/support-hub-prd.md)
- [MVP Delivery Plan](docs/mvp-delivery-plan.md)
- [Frontend MVP Plan](docs/frontend-mvp.md)
- [Backend MVP Plan](docs/backend-mvp.md)
- [TDD and Quality Strategy](docs/tdd-quality-strategy.md)
- [ITIL Operating Model](docs/itil-operating-model.md)
- [Knowledge Base Strategy](docs/knowledge-base-strategy.md)
- [Reporting Model](docs/reporting-model.md)
- [Architecture Direction](docs/architecture-direction.md)
- [Roadmap](docs/roadmap.md)
