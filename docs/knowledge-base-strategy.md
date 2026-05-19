# Knowledge Base Strategy

## Purpose

The knowledge base should reduce repeated support effort, improve customer self-service, and make agents more consistent. It should be simple enough to maintain without needing a full Confluence-style information architecture.

## Article Model

Each article should include:

- Title
- Summary
- Body
- Category
- Tags
- Visibility: public, customer-only, internal
- Status: draft, review, published, archived
- Owner
- Last reviewed date
- Related tickets

## Customer Experience

Customers should be able to:

- Search articles.
- Browse by category.
- Open suggested articles from bot responses.
- Escalate to support if an article does not solve the issue.
- Rate whether an article was helpful.

## Agent Experience

Agents should be able to:

- Search articles from the ticket view.
- Link articles to tickets.
- Insert article links into customer replies.
- Flag articles as stale or missing.
- Suggest that a ticket should become an article.

## Knowledge Recommendations

The backend should surface:

- Repeated questions with no good article.
- Tickets resolved with long manual explanations.
- Articles linked often but rated poorly.
- Categories with high ticket volume and low article coverage.
- Search terms that return no useful results.

## Content Governance

The knowledge base should avoid becoming cluttered. Useful controls:

- Article owner required before publication.
- Review date required for published articles.
- Internal and customer-visible content clearly separated.
- Archived articles hidden from customers but retained for audit/history.

