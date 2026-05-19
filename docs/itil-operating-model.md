# ITIL Operating Model

## Approach

The Support Hub should follow ITIL principles in a practical way. ITIL should shape the operating model, data definitions, and reporting, but it should not make the product feel bureaucratic.

## Core Record Types

### Incident

An unplanned interruption or degradation of a service.

Examples:

- Customer cannot access a service.
- Integration is failing.
- Portal is returning errors.

### Service Request

A standard request for information, access, fulfilment, or help.

Examples:

- Request a new user account.
- Ask for setup guidance.
- Request a configuration change within normal permissions.

### Problem

The underlying cause of one or more recurring incidents.

Examples:

- Multiple customers report the same intermittent sync failure.
- Repeated tickets point to missing onboarding guidance.

### Change

A controlled modification to a service, process, configuration, or system.

Examples:

- Update production configuration.
- Change SLA rules.
- Release a new customer portal workflow.

### Knowledge Article

Reusable guidance that helps customers, agents, or internal teams resolve issues consistently.

## Practical v1 Workflow

1. Capture every customer or internal support interaction as a ticket.
2. Classify the ticket as incident or request.
3. Assign category, priority, customer, and owner.
4. Track response and resolution time.
5. Link useful knowledge.
6. Escalate recurring issues into problem records when needed.
7. Use knowledge recommendations to reduce repeated work.

## Suggested Statuses

- New
- Triaged
- In Progress
- Waiting on Customer
- Waiting on Internal Team
- Resolved
- Closed

## Priority Model

Priority should combine impact and urgency.

- **P1 Critical**: Major business impact, many users or key customer affected, urgent response required.
- **P2 High**: Significant impact or important customer affected.
- **P3 Medium**: Normal issue with workaround or limited impact.
- **P4 Low**: Question, minor request, or low-impact issue.

## SLA Starting Point

Exact SLAs should be confirmed with the business, but v1 should support:

- First response target.
- Resolution target.
- Breach warning.
- Breach reporting.
- SLA pause while waiting on customer, if the operating model allows it.

