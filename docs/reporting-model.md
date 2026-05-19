# Reporting Model

## Reporting Philosophy

The Support Hub should be reporting-first. Every operational workflow should create clean, structured events and dimensions that can later be used in dashboards, Power BI, and Microsoft Fabric.

The product should avoid relying only on free-text fields for important reporting concepts.

## Core Dimensions

- Customer
- Contact
- Ticket
- Channel
- Category
- Priority
- Status
- Agent
- Team
- SLA
- Knowledge article
- Product/service
- Location/region, if relevant

## Core Measures

- Ticket count
- Ticket volume by channel
- Ticket volume by category
- Open tickets
- Backlog age
- First response time
- Resolution time
- SLA compliance
- SLA breaches
- Reopen rate
- Escalation rate
- Self-service views
- Bot deflection rate
- Article helpfulness
- Knowledge gap count

## Executive Views

- Overall support health.
- SLA performance.
- Ticket demand trend.
- Top customers by ticket volume.
- Top issue categories.
- Repeat incidents.
- Knowledge coverage and deflection.
- Customer satisfaction, when available.

## Operational Views

- Queue load by team and agent.
- Tickets nearing SLA breach.
- Unassigned tickets.
- Tickets waiting on customer or internal teams.
- Problem candidates from recurring incidents.
- Article gaps from repeated questions.

## Fabric Direction

Microsoft Fabric should become the long-term analytics platform, with OneLake as the central logical data lake and Power BI as the reporting layer. The Support Hub should therefore produce clean operational data and events that can be exported or streamed into Fabric later.

The product does not need to run on Fabric, but it should be designed so that Fabric can consume:

- Ticket events.
- SLA events.
- Knowledge events.
- Customer/account dimensions.
- Agent/team dimensions.
- Bot and self-service interactions.

