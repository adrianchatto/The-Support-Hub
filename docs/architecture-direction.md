# Architecture Direction

## Short-Term Hosting

Coolify is a sensible development hosting option while the product is taking shape. It keeps early deployment simple and gives the team a real environment for demos, feedback, and iteration.

## Long-Term Hosting

Azure is the likely long-term target because the reporting and data direction points toward Microsoft Fabric, Power BI, Microsoft identity, and possibly Teams integration.

## Directional Architecture

The application architecture should keep operational workflows separate from analytics.

Operational system:

- Support Hub application.
- Operational database.
- File/blob storage for attachments.
- Background jobs for email intake, notifications, SLA timers, and recommendations.
- Search index for tickets and knowledge.

Analytics system:

- Event/export pipeline.
- Fabric OneLake/lakehouse or warehouse.
- Semantic model.
- Power BI reports.

## Data Principles

- Use stable IDs for all core records.
- Capture immutable events for important workflow changes.
- Keep reporting dimensions structured.
- Separate internal notes from customer-visible messages.
- Treat knowledge usage as first-class data.
- Design for customer/account history from the beginning, even before full CRM exists.

## Likely Azure Services Later

Final choices should come after implementation decisions, but likely candidates include:

- Azure App Service, Azure Container Apps, or AKS for application hosting.
- Azure SQL Database or PostgreSQL for operational data.
- Azure Blob Storage for attachments.
- Azure AI Search for knowledge and ticket search.
- Azure Service Bus or Storage Queues for background processing.
- Microsoft Entra ID for identity.
- Microsoft Fabric and Power BI for analytics.

## Integration Direction

The system should be designed with clean APIs and event exports so future hubs can connect without heavy rework:

- Customer Hub / CRM.
- Glass Hub reporting.
- Finance and billing systems.
- Teams or telephony.
- Email and chat channels.
- Fabric analytics pipelines.

