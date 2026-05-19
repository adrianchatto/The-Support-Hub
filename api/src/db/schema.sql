-- Support Hub operational schema
-- Designed for portability to Azure Database for PostgreSQL
-- and structured export to Microsoft Fabric / OneLake

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Reference data ───────────────────────────────────────────────────────────

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
  role        TEXT NOT NULL DEFAULT 'agent',  -- agent | lead | admin | integration
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

-- users: local password auth
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
