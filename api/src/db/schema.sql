-- Support Hub operational schema
-- Designed for portability to Azure Database for PostgreSQL
-- and structured export to Microsoft Fabric / OneLake

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Reference data ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL UNIQUE,
  description   TEXT,
  owner_user_id UUID,
  status        TEXT NOT NULL DEFAULT 'active',
  criticality   TEXT NOT NULL DEFAULT 'medium',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sla_policies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  priority    TEXT NOT NULL,               -- P1 / P2 / P3 / P4
  first_response_minutes  INTEGER NOT NULL,
  resolution_minutes      INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Customers & contacts ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  domain      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users & teams ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'agent',  -- agent | supervisor | admin
  team_id     UUID REFERENCES teams(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tickets ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tickets (
  id                      TEXT PRIMARY KEY,   -- TCK-1001 etc., human-readable
  customer_id             UUID REFERENCES customers(id),
  contact_id              UUID REFERENCES contacts(id),
  customer_name           TEXT NOT NULL,      -- denormalised for fast queue display
  contact_name            TEXT,
  summary                 TEXT NOT NULL,
  description             TEXT,
  channel                 TEXT NOT NULL,      -- Email | Phone | Chat | Portal
  priority                TEXT NOT NULL,      -- P1 | P2 | P3 | P4
  status                  TEXT NOT NULL DEFAULT 'New',
  category                TEXT,
  application_id          UUID REFERENCES applications(id),
  category_id             UUID REFERENCES ticket_categories(id),
  assigned_team_id        UUID REFERENCES teams(id),
  assigned_agent_id       UUID REFERENCES users(id),
  sla_policy_id           UUID REFERENCES sla_policies(id),
  first_response_due_at   TIMESTAMPTZ,
  first_response_at       TIMESTAMPTZ,
  resolution_due_at       TIMESTAMPTZ,
  resolved_at             TIMESTAMPTZ,
  closed_at               TIMESTAMPTZ,
  source_ref              TEXT,              -- email message-id, chat session id, etc.
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_status   ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_channel  ON tickets(channel);
CREATE INDEX IF NOT EXISTS idx_tickets_customer ON tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_application ON tickets(application_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON tickets(category_id);

-- ─── Ticket sequence (for TCK-NNNN IDs) ──────────────────────────────────────

CREATE SEQUENCE IF NOT EXISTS ticket_seq START 1001;

-- ─── Ticket messages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   TEXT NOT NULL REFERENCES tickets(id),
  author_id   UUID REFERENCES users(id),
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'internal',  -- internal | customer
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Knowledge articles ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS articles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  body        TEXT NOT NULL,
  category    TEXT,
  tags        TEXT[] DEFAULT '{}',
  audience    TEXT NOT NULL DEFAULT 'Customer',   -- Customer | Internal | Both
  status      TEXT NOT NULL DEFAULT 'Draft',      -- Draft | Published | Archived
  author_id   UUID REFERENCES users(id),
  published_at TIMESTAMPTZ,
  archived_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Ticket ↔ article links ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_articles (
  ticket_id   TEXT NOT NULL REFERENCES tickets(id),
  article_id  UUID NOT NULL REFERENCES articles(id),
  linked_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ticket_id, article_id)
);

-- ─── Chat sessions ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name   TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',  -- active | escalated | resolved
  escalated_ticket_id TEXT REFERENCES tickets(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES chat_sessions(id),
  role            TEXT NOT NULL,   -- user | assistant
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_article_suggestions (
  session_id  UUID NOT NULL REFERENCES chat_sessions(id),
  article_id  UUID NOT NULL REFERENCES articles(id),
  shown_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (session_id, article_id)
);

-- ─── Email intake ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_intake (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      TEXT NOT NULL UNIQUE,   -- RFC 2822 Message-ID for deduplication
  from_address    TEXT NOT NULL,
  from_name       TEXT,
  subject         TEXT,
  body_text       TEXT,
  body_html       TEXT,
  ticket_id       TEXT REFERENCES tickets(id),
  processed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Reporting events (append-only, Fabric-ready) ─────────────────────────────

CREATE TABLE IF NOT EXISTS reporting_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id        UUID,
  customer_id     UUID,
  ticket_id       TEXT,
  article_id      UUID,
  session_id      UUID,
  channel         TEXT,
  priority        TEXT,
  category        TEXT,
  source_system   TEXT NOT NULL DEFAULT 'support-hub',
  correlation_id  UUID,
  payload         JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_events_type       ON reporting_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_occurred   ON reporting_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_ticket     ON reporting_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_events_customer   ON reporting_events(customer_id);

-- ─── Seed SLA policies ────────────────────────────────────────────────────────

INSERT INTO sla_policies (name, priority, first_response_minutes, resolution_minutes)
VALUES
  ('P1 Critical',  'P1', 15,   240),
  ('P2 High',      'P2', 60,   480),
  ('P3 Medium',    'P3', 240,  1440),
  ('P4 Low',       'P4', 480,  2880)
ON CONFLICT (name) DO NOTHING;

-- Ensure existing databases have new columns before demo seed inserts use them.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location   TEXT;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category_id    UUID REFERENCES ticket_categories(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'incident';

-- ─── Seed service portfolio, categories, and demo data ───────────────────────

CREATE TABLE IF NOT EXISTS problems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'Open',  -- Open | Under Investigation | Resolved | Closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO teams (name)
VALUES ('Service Desk'), ('Applications')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (email, name, role, team_id)
SELECT 'supervisor@supporthub.local', 'Samira Khan', 'supervisor', t.id
FROM teams t
WHERE t.name = 'Service Desk'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'supervisor@supporthub.local');

INSERT INTO users (email, name, role, team_id)
SELECT 'agent@supporthub.local', 'Omar Rahman', 'agent', t.id
FROM teams t
WHERE t.name = 'Service Desk'
  AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'agent@supporthub.local');

INSERT INTO applications (name, description, status, criticality)
VALUES
  ('Microsoft 365', 'Email, Teams, SharePoint and OneDrive support.', 'active', 'high'),
  ('Customer Portal', 'External customer self-service and account access.', 'active', 'critical'),
  ('CRM', 'Customer relationship management and account records.', 'active', 'high'),
  ('Finance System', 'Billing, invoicing and payment operations.', 'active', 'medium'),
  ('Endpoint Devices', 'Laptops, mobile devices and desktop tooling.', 'active', 'medium')
ON CONFLICT (name) DO NOTHING;

UPDATE applications
SET owner_user_id = u.id, updated_at = NOW()
FROM users u
WHERE applications.owner_user_id IS NULL
  AND u.email = 'supervisor@supporthub.local'
  AND applications.name IN ('Microsoft 365', 'Customer Portal', 'CRM', 'Finance System', 'Endpoint Devices');

INSERT INTO ticket_categories (name, description, active)
VALUES
  ('Access', 'Login, permissions, password and account access work.', true),
  ('Incident', 'Faults, outages, break-fix and service degradation.', true),
  ('How-to Question', 'Usage guidance and process questions.', true),
  ('Data Issue', 'Incorrect, duplicate, missing or stale business data.', true),
  ('Service Request', 'Standard fulfilment requests and low-risk changes.', true),
  ('Integration', 'API, sync, import/export and connected system issues.', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO customers (name, phone, email, department, location)
SELECT 'Hadley Advisory', '+971501234567', 'maya.patel@hadley.example', 'Advisory', 'Dubai'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'maya.patel@hadley.example');

INSERT INTO customers (name, phone, email, department, location)
SELECT 'Neovance', '+971502345678', 'qa@neovance.example', 'Quality Assurance', 'Abu Dhabi'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'qa@neovance.example');

INSERT INTO customers (name, phone, email, department, location)
SELECT 'Outbound Campaigns', '+971503456789', 'ops@outbound.example', 'Operations', 'Dubai'
WHERE NOT EXISTS (SELECT 1 FROM customers WHERE email = 'ops@outbound.example');

INSERT INTO contacts (customer_id, name, email, phone)
SELECT c.id, 'Maya Patel', 'maya.patel@hadley.example', '+971501234567'
FROM customers c
WHERE c.name = 'Hadley Advisory'
  AND NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'maya.patel@hadley.example');

INSERT INTO contacts (customer_id, name, email, phone)
SELECT c.id, 'Neovance QA Desk', 'qa@neovance.example', '+971502345678'
FROM customers c
WHERE c.name = 'Neovance'
  AND NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'qa@neovance.example');

INSERT INTO contacts (customer_id, name, email, phone)
SELECT c.id, 'Campaign Operations', 'ops@outbound.example', '+971503456789'
FROM customers c
WHERE c.name = 'Outbound Campaigns'
  AND NOT EXISTS (SELECT 1 FROM contacts WHERE email = 'ops@outbound.example');

INSERT INTO articles (title, summary, body, category, tags, audience, status)
SELECT 'Reset your portal password', 'Steps for customers who cannot sign in to the customer portal.', 'Use the forgotten password link, verify your email, and create a new password. If MFA fails, contact support.', 'Access', ARRAY['portal','password','mfa'], 'Customer', 'Published'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'Reset your portal password');

INSERT INTO articles (title, summary, body, category, tags, audience, status)
SELECT 'Shared mailbox access checklist', 'Internal checks before granting Microsoft 365 mailbox access.', 'Confirm manager approval, group membership, licensing, and audit requirements before adding access.', 'Access', ARRAY['m365','mailbox'], 'Internal', 'Published'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'Shared mailbox access checklist');

INSERT INTO articles (title, summary, body, category, tags, audience, status)
SELECT 'Duplicate customer record triage', 'How to validate and merge duplicate customer records.', 'Check CRM ownership, recent ticket links, and billing references before merging duplicate customer records.', 'Data Issue', ARRAY['crm','data-quality'], 'Internal', 'Draft'
WHERE NOT EXISTS (SELECT 1 FROM articles WHERE title = 'Duplicate customer record triage');

INSERT INTO problems (title, description, status)
SELECT 'Recurring portal MFA failures', 'Multiple customers have reported MFA challenge loops on the customer portal.', 'Open'
WHERE NOT EXISTS (SELECT 1 FROM problems WHERE title = 'Recurring portal MFA failures');

INSERT INTO problems (title, description, status)
SELECT 'CRM duplicate account creation', 'Imported leads are occasionally creating duplicate CRM account records.', 'Under Investigation'
WHERE NOT EXISTS (SELECT 1 FROM problems WHERE title = 'CRM duplicate account creation');

INSERT INTO tickets (
  id, customer_id, customer_name, summary, description, channel, priority, status,
  ticket_type, category, application_id, category_id, first_response_due_at, resolution_due_at
)
SELECT
  'TCK-9001',
  c.id,
  c.name,
  'Cannot access customer portal',
  'Customer receives an MFA loop after entering credentials.',
  'Email',
  'P2',
  'Open',
  'incident',
  'Access',
  a.id,
  tc.id,
  NOW() + INTERVAL '45 minutes',
  NOW() + INTERVAL '6 hours'
FROM customers c, applications a, ticket_categories tc
WHERE c.name = 'Hadley Advisory' AND a.name = 'Customer Portal' AND tc.name = 'Access'
ON CONFLICT (id) DO NOTHING;

INSERT INTO tickets (
  id, customer_id, customer_name, summary, description, channel, priority, status,
  ticket_type, category, application_id, category_id, first_response_due_at, resolution_due_at
)
SELECT
  'TCK-9002',
  c.id,
  c.name,
  'QA user needs CRM export access',
  'Add export permissions for QA evaluation contact lens reporting.',
  'Phone',
  'P3',
  'New',
  'service_request',
  'Service Request',
  a.id,
  tc.id,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '1 day'
FROM customers c, applications a, ticket_categories tc
WHERE c.name = 'Neovance' AND a.name = 'CRM' AND tc.name = 'Service Request'
ON CONFLICT (id) DO NOTHING;

INSERT INTO tickets (
  id, customer_id, customer_name, summary, description, channel, priority, status,
  ticket_type, category, application_id, category_id, first_response_due_at, resolution_due_at
)
SELECT
  'TCK-9003',
  c.id,
  c.name,
  'Outbound reporting data is missing campaign totals',
  'Campaign dashboard is not matching exported totals from the source system.',
  'Chat',
  'P2',
  'Pending',
  'incident',
  'Data Issue',
  a.id,
  tc.id,
  NOW() - INTERVAL '30 minutes',
  NOW() + INTERVAL '3 hours'
FROM customers c, applications a, ticket_categories tc
WHERE c.name = 'Outbound Campaigns' AND a.name = 'CRM' AND tc.name = 'Data Issue'
ON CONFLICT (id) DO NOTHING;

INSERT INTO ticket_messages (ticket_id, author_name, body, visibility)
SELECT 'TCK-9001', 'Support Hub Admin', 'Confirmed this is affecting portal MFA only. Monitoring for additional affected customers.', 'internal'
WHERE EXISTS (SELECT 1 FROM tickets WHERE id = 'TCK-9001')
  AND NOT EXISTS (SELECT 1 FROM ticket_messages WHERE ticket_id = 'TCK-9001' AND body = 'Confirmed this is affecting portal MFA only. Monitoring for additional affected customers.');

INSERT INTO ticket_messages (ticket_id, author_name, body, visibility)
SELECT 'TCK-9002', 'Support Hub Admin', 'Requested supervisor approval for CRM export permission.', 'internal'
WHERE EXISTS (SELECT 1 FROM tickets WHERE id = 'TCK-9002')
  AND NOT EXISTS (SELECT 1 FROM ticket_messages WHERE ticket_id = 'TCK-9002' AND body = 'Requested supervisor approval for CRM export permission.');

INSERT INTO ticket_messages (ticket_id, author_name, body, visibility)
SELECT 'TCK-9003', 'Support Hub Admin', 'Asked customer to provide the campaign export used for reconciliation.', 'customer'
WHERE EXISTS (SELECT 1 FROM tickets WHERE id = 'TCK-9003')
  AND NOT EXISTS (SELECT 1 FROM ticket_messages WHERE ticket_id = 'TCK-9003' AND body = 'Asked customer to provide the campaign export used for reconciliation.');

INSERT INTO ticket_articles (ticket_id, article_id)
SELECT 'TCK-9001', a.id
FROM articles a
WHERE a.title = 'Reset your portal password'
  AND EXISTS (SELECT 1 FROM tickets WHERE id = 'TCK-9001')
  AND NOT EXISTS (SELECT 1 FROM ticket_articles ta WHERE ta.ticket_id = 'TCK-9001' AND ta.article_id = a.id);

INSERT INTO chat_sessions (customer_name, status, escalated_ticket_id)
SELECT 'Hadley Advisory', 'escalated', 'TCK-9001'
WHERE EXISTS (SELECT 1 FROM tickets WHERE id = 'TCK-9001')
  AND NOT EXISTS (SELECT 1 FROM chat_sessions WHERE customer_name = 'Hadley Advisory' AND escalated_ticket_id = 'TCK-9001');

INSERT INTO chat_messages (session_id, role, content)
SELECT cs.id, 'user', 'I cannot get past the customer portal MFA prompt.'
FROM chat_sessions cs
WHERE cs.customer_name = 'Hadley Advisory' AND cs.escalated_ticket_id = 'TCK-9001'
  AND NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.session_id = cs.id AND cm.content = 'I cannot get past the customer portal MFA prompt.');

INSERT INTO chat_messages (session_id, role, content)
SELECT cs.id, 'assistant', 'I could not resolve that from the knowledge base, so I created ticket TCK-9001.'
FROM chat_sessions cs
WHERE cs.customer_name = 'Hadley Advisory' AND cs.escalated_ticket_id = 'TCK-9001'
  AND NOT EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.session_id = cs.id AND cm.content = 'I could not resolve that from the knowledge base, so I created ticket TCK-9001.');

INSERT INTO chat_article_suggestions (session_id, article_id)
SELECT cs.id, a.id
FROM chat_sessions cs, articles a
WHERE cs.customer_name = 'Hadley Advisory'
  AND cs.escalated_ticket_id = 'TCK-9001'
  AND a.title = 'Reset your portal password'
  AND NOT EXISTS (SELECT 1 FROM chat_article_suggestions cas WHERE cas.session_id = cs.id AND cas.article_id = a.id);

INSERT INTO email_intake (message_id, from_address, from_name, subject, body_text, ticket_id, processed_at)
SELECT '<demo-tck-9001@supporthub.local>', 'maya.patel@hadley.example', 'Maya Patel', 'Cannot access customer portal', 'The portal keeps asking for MFA and then restarts.', 'TCK-9001', NOW()
WHERE EXISTS (SELECT 1 FROM tickets WHERE id = 'TCK-9001')
  AND NOT EXISTS (SELECT 1 FROM email_intake WHERE message_id = '<demo-tck-9001@supporthub.local>');

INSERT INTO reporting_events (event_type, customer_id, ticket_id, channel, priority, category, payload)
SELECT 'ticket.created', c.id, 'TCK-9001', 'Email', 'P2', 'Access', '{"seeded": true, "application": "Customer Portal"}'::jsonb
FROM customers c
WHERE c.name = 'Hadley Advisory'
  AND NOT EXISTS (SELECT 1 FROM reporting_events WHERE ticket_id = 'TCK-9001' AND event_type = 'ticket.created');

INSERT INTO reporting_events (event_type, customer_id, ticket_id, channel, priority, category, payload)
SELECT 'ticket.created', c.id, 'TCK-9002', 'Phone', 'P3', 'Service Request', '{"seeded": true, "application": "CRM"}'::jsonb
FROM customers c
WHERE c.name = 'Neovance'
  AND NOT EXISTS (SELECT 1 FROM reporting_events WHERE ticket_id = 'TCK-9002' AND event_type = 'ticket.created');

INSERT INTO reporting_events (event_type, customer_id, ticket_id, channel, priority, category, payload)
SELECT 'ticket.created', c.id, 'TCK-9003', 'Chat', 'P2', 'Data Issue', '{"seeded": true, "application": "CRM"}'::jsonb
FROM customers c
WHERE c.name = 'Outbound Campaigns'
  AND NOT EXISTS (SELECT 1 FROM reporting_events WHERE ticket_id = 'TCK-9003' AND event_type = 'ticket.created');

-- ─── Problems ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS problems (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'Open',  -- Open | Under Investigation | Resolved | Closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Schema evolution (idempotent ALTERs) ─────────────────────────────────────

-- customers: individual people fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email      TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS location   TEXT;

-- sla_policies: optional category scoping (e.g. "Incident", "Service Request")
ALTER TABLE sla_policies ADD COLUMN IF NOT EXISTS category TEXT;

-- tickets: type classification and problem grouping
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'incident';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS problem_id  UUID REFERENCES problems(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category_id    UUID REFERENCES ticket_categories(id);

-- users: local password auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
