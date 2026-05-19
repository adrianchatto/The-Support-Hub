# Support Hub PRD

## Problem Statement

The company needs a practical support platform because existing systems are limited and do not provide good workflow control, customer visibility, or management reporting. Without a unified support system, customer issues are harder to track, service quality is harder to measure, and knowledge remains trapped in individual agents or scattered messages.

## Goals

- Provide a single operational workspace for support tickets across chat, email, phone, and portal intake.
- Enable customers to self-serve through a simple knowledge base before contacting an agent.
- Capture structured data for reporting from day one.
- Support practical ITIL-aligned incident, request, problem, change, and knowledge workflows.
- Create a foundation that can later connect to CRM, finance, operations, and Microsoft Fabric.

## Non-Goals

- Full ServiceNow-level configurability in v1. That would slow the product down and make the experience too heavy.
- A complete CRM in v1. Customer and contact context is needed, but sales pipeline and full CRM workflows can follow later.
- Fully autonomous AI support. The bot should help answer and triage, but escalation to humans must be easy.
- Complex enterprise workflow designer in v1. Start with opinionated workflows before adding deep configuration.
- Native Microsoft Fabric implementation in v1. The product should be designed for clean export and integration, but operational workflows come first.

## Primary Personas

- **Customer**: Needs help, wants fast answers, may use knowledge, chat, email, or portal.
- **Support Agent**: Handles tickets, responds to customers, links knowledge, escalates issues.
- **Support Lead**: Manages queues, SLAs, agent performance, recurring issues, and knowledge gaps.
- **Executive / Management User**: Wants trusted reporting across service performance and customer health.
- **Knowledge Owner**: Maintains article quality, publishes guidance, and fills content gaps.

## Must-Have Requirements

### Ticket Intake

- Customers can submit tickets through a portal.
- Emails can become tickets.
- Agents can create tickets from phone calls.
- Chat conversations can escalate into tickets with transcript/context attached.
- Each ticket has a source channel.

### Ticket Workflow

- Tickets support status, priority, category, assignment, customer, contact, and timestamps.
- Agents can add internal notes and customer-visible replies.
- Tickets can be linked to knowledge articles.
- Tickets can be escalated or reassigned.
- Basic SLA tracking exists for first response and resolution.

### Knowledge Base

- Articles have title, body, category, tags, visibility, status, author, and last updated date.
- Articles can be public/customer-facing or internal-only.
- Agents can search and reference articles from tickets.
- Customers can search published articles from the portal.

### Self-Service Bot

- The bot searches approved knowledge content.
- The bot can suggest relevant articles.
- The bot offers escalation when it cannot answer confidently.
- Escalation creates a ticket with the conversation history.

### Reporting

- Leaders can view ticket volume by channel, category, priority, customer, and status.
- Leaders can view SLA performance and resolution time.
- Leaders can identify top recurring issues.
- Knowledge gaps can be surfaced from repeated questions and unresolved tickets.

## Nice-To-Have Requirements

- Service catalog for common request types.
- Customer satisfaction surveys.
- Suggested ticket categories from message content.
- Suggested replies based on knowledge articles.
- Problem records linked to recurring incidents.
- Basic change records for controlled operational changes.
- Role-based dashboards for agents, leads, and executives.

## Future Considerations

- Full CRM/customer account hub.
- Microsoft Teams integration.
- Telephony integration.
- Microsoft Fabric data pipelines and semantic models.
- Advanced workflow automation.
- Multi-brand or multi-tenant support.
- Asset/configuration management database.

## User Stories

- As a customer, I want to search knowledge articles so that I can solve simple problems without waiting for support.
- As a customer, I want to escalate from chat to a ticket so that I do not have to repeat myself.
- As an agent, I want all ticket context in one view so that I can respond quickly and accurately.
- As an agent, I want to link a knowledge article to a ticket so that customers receive consistent guidance.
- As a support lead, I want to see SLA breaches and queue load so that I can manage service quality.
- As a knowledge owner, I want recommendations for missing articles so that the knowledge base improves from real demand.
- As an executive, I want a single view of support performance so that I can understand customer experience and operational risk.

## Success Metrics

- At least 80% of support interactions captured as tickets within 60 days of launch.
- First response and resolution SLA reporting available from launch.
- 20% of common issues answerable through knowledge articles within 90 days.
- Month-over-month increase in self-service usage.
- Reduction in repeated tickets for documented issues.

## Open Questions

- Which channels are required first: portal, email, chat, phone, Teams, WhatsApp?
- Which customer groups will use the platform first?
- What SLA commitments exist today or need to be introduced?
- Does the company need external customer support, internal IT support, or both?
- What Microsoft licensing is already in place for Azure, Power BI, and Fabric?
- What compliance requirements apply in Dubai/UAE and for customer data residency?

