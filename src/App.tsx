import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  ChevronDown,
  CircleAlert,
  Clock,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Pencil,
  Plus,
  Search,
  Settings,
  Ticket as TicketIcon,
  Trash2,
  UserCog,
  Users,
  Wand2,
  X,
} from "lucide-react";
import {
  authApi,
  usersApi,
  customersApi,
  ticketsApi,
  problemsApi,
  articlesApi,
  slaApi,
  getToken,
  setToken,
  clearToken,
  type AuthUser,
  type User,
  type UserRole,
  type Customer,
  type Ticket,
  type TicketType,
  type TicketMessage,
  type Article,
  type SlaPolicy,
  type SlaCompliance,
  type ArticleSuggestion,
  type Problem,
  type ProblemTicket,
} from "./api";
import "./App.css";

// ─── Surface definitions ──────────────────────────────────────────────────────

type Surface = "dashboard" | "tickets" | "customers" | "problems" | "knowledge" | "sla" | "reporting" | "users";

function getSurfaces(role: UserRole): Array<{ id: Surface; label: string; icon: typeof TicketIcon }> {
  const base: Array<{ id: Surface; label: string; icon: typeof TicketIcon }> = [
    { id: "dashboard",  label: "Dashboard",   icon: LayoutDashboard },
    { id: "tickets",    label: "Tickets",      icon: TicketIcon },
    { id: "customers",  label: "Customers",    icon: Users },
    { id: "problems",   label: "Problems",     icon: Layers },
    { id: "knowledge",  label: "Knowledge",    icon: BookOpen },
    { id: "sla",        label: "SLA Config",   icon: Clock },
    { id: "reporting",  label: "Reporting",    icon: BarChart3 },
  ];
  if (role === "admin") {
    base.push({ id: "users", label: "Users", icon: UserCog });
  }
  return base;
}

function surfaceTitle(s: Surface): string {
  return ({
    dashboard:  "Dashboard",
    tickets:    "Ticket operations",
    customers:  "Customer directory",
    problems:   "Problem management",
    knowledge:  "Knowledge management",
    sla:        "SLA configuration",
    reporting:  "Management reporting",
    users:      "User management",
  } as Record<Surface, string>)[s];
}

const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  incident:        "Incident",
  service_request: "Service Request",
  question:        "Question",
};

// ─── App root ─────────────────────────────────────────────────────────────────

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSurface, setActiveSurface] = useState<Surface>("dashboard");

  // Re-hydrate session from stored JWT on mount
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthLoading(false); return; }
    authApi.me()
      .then(setCurrentUser)
      .catch(() => { clearToken(); })
      .finally(() => setAuthLoading(false));
  }, []);

  function handleSignIn(user: AuthUser) {
    setCurrentUser(user);
    setActiveSurface("dashboard");
  }

  function handleSignOut() {
    clearToken();
    setCurrentUser(null);
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#526174" }}>Loading…</p>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onSignIn={handleSignIn} />;
  }

  const surfaces = getSurfaces(currentUser.role);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">SH</div>
          <div>
            <p className="eyebrow">Support operations</p>
            <h1>The Support Hub</h1>
          </div>
        </div>

        <nav aria-label="Staff workspace" className="staff-nav">
          {surfaces.map((surface) => {
            const Icon = surface.icon;
            return (
              <button
                aria-pressed={activeSurface === surface.id}
                className="nav-item"
                key={surface.id}
                onClick={() => setActiveSurface(surface.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={18} />
                {surface.label}
              </button>
            );
          })}
        </nav>

        <div className="identity-panel">
          <div className="identity-info">
            <strong>{currentUser.name}</strong>
            <span className="role-badge">{currentUser.role}</span>
          </div>
          <button className="sign-out-button" type="button" onClick={handleSignOut}>Sign out</button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Service Desk</p>
            <h2>{surfaceTitle(activeSurface)}</h2>
          </div>
        </header>

        {activeSurface === "dashboard"  && <DashboardSurface onNavigate={setActiveSurface} />}
        {activeSurface === "tickets"    && <TicketsSurface currentUser={currentUser} />}
        {activeSurface === "customers"  && <CustomersSurface />}
        {activeSurface === "problems"   && <ProblemsSurface />}
        {activeSurface === "knowledge"  && <KnowledgeSurface />}
        {activeSurface === "sla"        && <SlaSurface />}
        {activeSurface === "reporting"  && <ReportingSurface />}
        {activeSurface === "users" && currentUser.role === "admin" && <UsersSurface />}
      </main>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────

function LoginScreen({ onSignIn }: { onSignIn: (user: AuthUser) => void }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await authApi.login(email, password);
      setToken(token);
      onSignIn(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="login-heading">
        <div className="login-copy">
          <div className="brand-lockup">
            <div className="brand-mark">SH</div>
            <p className="eyebrow">Enterprise service management</p>
          </div>
          <h1 id="login-heading">Sign in to The Support Hub</h1>
          <p>Secure access for service teams, knowledge owners, and managers.</p>
        </div>
        <div className="login-panel">
          <LockKeyhole aria-hidden="true" size={28} />
          <h2>Workspace access</h2>
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="form-error">{error}</div>}
            <label>
              Email address
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            <button className="microsoft-button" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="login-meta">
            <span>Role-based access</span>
            <span>Audit-ready sessions</span>
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardSurface({ onNavigate }: { onNavigate: (s: Surface) => void }) {
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [compliance, setCompliance] = useState<SlaCompliance | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([ticketsApi.list(), slaApi.compliance()])
      .then(([t, c]) => { setTickets(t); setCompliance(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const open     = tickets.filter((t) => !["Resolved", "Closed"].includes(t.status));
  const newCount = tickets.filter((t) => t.status === "New").length;
  const p1Count  = tickets.filter((t) => t.priority === "P1" && !["Resolved","Closed"].includes(t.status)).length;

  return (
    <div className="dashboard-grid">
      <section className="operations-panel rag-panel" aria-label="SLA compliance">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">SLA status</p>
            <h3>Real-time compliance</h3>
          </div>
          <button className="secondary-button" onClick={() => onNavigate("sla")} type="button">
            <Settings size={16} /> Configure
          </button>
        </div>
        {loading ? (
          <p className="loading-text">Loading…</p>
        ) : compliance ? (
          <div className="rag-grid">
            <RagCard label="Within SLA"  count={compliance.green} status="green" />
            <RagCard label="At risk"     count={compliance.amber} status="amber" />
            <RagCard label="Breached"    count={compliance.red}   status="red"   />
            <div className="rag-compliance-badge">
              <span>Overall compliance</span>
              <strong className={
                compliance.compliance_pct >= 90 ? "rag-green"
                : compliance.compliance_pct >= 70 ? "rag-amber"
                : "rag-red"
              }>{compliance.compliance_pct}%</strong>
            </div>
          </div>
        ) : (
          <p className="loading-text">No SLA data available.</p>
        )}
      </section>

      <section className="dashboard-stats" aria-label="Ticket summary">
        <StatCard label="Open tickets"     value={String(open.length)}   icon={<TicketIcon size={20} />} />
        <StatCard label="New / unassigned" value={String(newCount)}      icon={<CircleAlert size={20} />} />
        <StatCard label="P1 active"        value={String(p1Count)}       icon={<ChevronDown size={20} />} />
      </section>

      <section className="operations-panel recent-tickets-panel" aria-label="Recent tickets">
        <div className="panel-heading">
          <h3>Recent tickets</h3>
          <button className="secondary-button" onClick={() => onNavigate("tickets")} type="button">
            View all
          </button>
        </div>
        <TicketQueueTable tickets={tickets.slice(0, 8)} compact />
      </section>
    </div>
  );
}

function RagCard({ label, count, status }: { label: string; count: number; status: "green" | "amber" | "red" }) {
  return (
    <div className={`rag-card rag-${status}`}>
      <strong>{count}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="stat-card operations-panel">
      <div className="stat-icon">{icon}</div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-label">{label}</span>
    </div>
  );
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

const BLANK_TICKET = { customerId: "", customerName: "", summary: "", priority: "P3", category: "", ticketType: "incident" as TicketType };
const TICKET_STATUSES = ["New", "Open", "Pending", "Resolved", "Closed"];

function TicketsSurface({ currentUser }: { currentUser: AuthUser }) {
  const [tickets, setTickets]     = useState<Ticket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [formOpen, setFormOpen]   = useState(false);
  const [form, setForm]           = useState(BLANK_TICKET);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [selected, setSelected]   = useState<Ticket | null>(null);

  const reload = useCallback(() => {
    ticketsApi.list().then(setTickets).catch(console.error);
  }, []);

  useEffect(() => {
    reload();
    customersApi.list().then(setCustomers).catch(console.error);
  }, [reload]);

  function handleCustomerChange(id: string) {
    const c = customers.find((c) => c.id === id);
    setForm((f) => ({ ...f, customerId: id, customerName: c?.name ?? "" }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await ticketsApi.create({
        customerId:  form.customerId || undefined,
        customerName: form.customerName,
        summary:     form.summary,
        channel:     "Phone",
        priority:    form.priority,
        ticketType:  form.ticketType,
        category:    form.category || undefined,
      });
      setForm(BLANK_TICKET);
      setFormOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create ticket");
    } finally {
      setSaving(false);
    }
  }

  function openTicket(t: Ticket) {
    setSelected(t);
    setFormOpen(false);
  }

  function onTicketUpdated(updated: Ticket) {
    setSelected(updated);
    setTickets((ts) => ts.map((t) => t.id === updated.id ? updated : t));
  }

  if (selected) {
    return (
      <TicketDetailView
        ticket={selected}
        currentUser={currentUser}
        onBack={() => setSelected(null)}
        onUpdated={onTicketUpdated}
      />
    );
  }

  return (
    <section className="surface-grid">
      <div className="operations-panel queue-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Agent workspace</p>
            <h3>Live queue</h3>
          </div>
          <button className="primary-button" onClick={() => { setFormOpen(true); setError(null); }} type="button">
            <Plus size={16} /> New ticket
          </button>
        </div>

        {formOpen && (
          <form className="ticket-form" onSubmit={handleSubmit}>
            {error && <div className="form-error span-2">{error}</div>}
            <label className="span-2">
              Customer
              <select value={form.customerId} onChange={(e) => handleCustomerChange(e.target.value)} required>
                <option value="">— select customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.department ? ` · ${c.department}` : ""}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="span-2">
              Issue summary
              <input required value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
            </label>
            <label>
              Ticket type
              <select value={form.ticketType} onChange={(e) => setForm((f) => ({ ...f, ticketType: e.target.value as TicketType }))}>
                <option value="incident">Incident</option>
                <option value="service_request">Service Request</option>
                <option value="question">Question</option>
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {["P1","P2","P3","P4"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="span-2">
              Category
              <input placeholder="e.g. Access, Hardware…" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            </label>
            <div className="form-actions span-2">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Creating…" : "Create ticket"}</button>
              <button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        <TicketQueueTable tickets={tickets} onSelect={openTicket} />
      </div>

      <div className="operations-panel side-panel">
        <h3>Queue summary</h3>
        <Metric label="Total open"     value={String(tickets.filter((t) => !["Resolved","Closed"].includes(t.status)).length)} />
        <Metric label="Unassigned"     value={String(tickets.filter((t) => t.status === "New").length)} />
        <Metric label="P1 / P2 active" value={String(tickets.filter((t) => ["P1","P2"].includes(t.priority) && !["Resolved","Closed"].includes(t.status)).length)} />
        <p style={{ color: "#9aa5b4", fontSize: "0.8rem", marginTop: 12 }}>Click any ticket to open it.</p>
      </div>
    </section>
  );
}

// ─── Ticket detail (full main area) ───────────────────────────────────────────

function TicketDetailView({
  ticket,
  currentUser,
  onBack,
  onUpdated,
}: {
  ticket: Ticket;
  currentUser: AuthUser;
  onBack: () => void;
  onUpdated: (t: Ticket) => void;
}) {
  const [messages, setMessages]         = useState<TicketMessage[]>([]);
  const [msgLoading, setMsgLoading]     = useState(true);
  const [newStatus, setNewStatus]       = useState(ticket.status);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError]   = useState<string | null>(null);
  const [noteBody, setNoteBody]         = useState("");
  const [noteVis, setNoteVis]           = useState<"internal" | "customer">("internal");
  const [noteSaving, setNoteSaving]     = useState(false);
  const [noteError, setNoteError]       = useState<string | null>(null);

  // Assignment
  const canAssign = currentUser.role === "supervisor" || currentUser.role === "admin";
  const [agents, setAgents]             = useState<User[]>([]);
  const [assignAgentId, setAssignAgentId] = useState(ticket.assigned_agent_id ?? "");
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError]   = useState<string | null>(null);

  // Problem link
  const [problems, setProblems]         = useState<Problem[]>([]);
  const [linkProblemId, setLinkProblemId] = useState(ticket.problem_id ?? "");
  const [linkSaving, setLinkSaving]     = useState(false);
  const [linkError, setLinkError]       = useState<string | null>(null);

  useEffect(() => {
    ticketsApi.getMessages(ticket.id)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setMsgLoading(false));
    if (canAssign) {
      usersApi.agents().then(setAgents).catch(console.error);
    }
    if (ticket.ticket_type === "incident") {
      problemsApi.list().then(setProblems).catch(console.error);
    }
  }, [ticket.id, ticket.ticket_type, canAssign]);

  async function handleStatusUpdate(e: FormEvent) {
    e.preventDefault();
    if (newStatus === ticket.status) return;
    setStatusSaving(true);
    setStatusError(null);
    try {
      const updated = await ticketsApi.updateStatus(ticket.id, newStatus);
      onUpdated(updated);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleAssign(e: FormEvent) {
    e.preventDefault();
    if (!assignAgentId) return;
    setAssignSaving(true);
    setAssignError(null);
    try {
      const updated = await ticketsApi.assign(ticket.id, assignAgentId);
      onUpdated(updated);
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssignSaving(false);
    }
  }

  async function handleLinkProblem(e: FormEvent) {
    e.preventDefault();
    setLinkSaving(true);
    setLinkError(null);
    try {
      if (linkProblemId) {
        await problemsApi.linkTicket(linkProblemId, ticket.id);
      } else if (ticket.problem_id) {
        await problemsApi.unlinkTicket(ticket.problem_id, ticket.id);
      }
      // Reload ticket to get updated problem_id
      const updatedTickets = await ticketsApi.list();
      const t = updatedTickets.find((x) => x.id === ticket.id);
      if (t) onUpdated(t);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to update problem link");
    } finally {
      setLinkSaving(false);
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!noteBody.trim()) return;
    setNoteSaving(true);
    setNoteError(null);
    try {
      const msg = await ticketsApi.addMessage(ticket.id, {
        authorName: currentUser.name,
        body: noteBody,
        visibility: noteVis,
      });
      setMessages((ms) => [...ms, msg]);
      setNoteBody("");
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setNoteSaving(false);
    }
  }

  const assignedAgent = agents.find((a) => a.id === ticket.assigned_agent_id);
  const linkedProblem = problems.find((p) => p.id === ticket.problem_id);

  return (
    <div className="ticket-detail-page">

      {/* ── Header ── */}
      <div className="ticket-detail-topbar">
        <button className="secondary-button" type="button" onClick={onBack}>← Back to queue</button>
        <div className="ticket-detail-title">
          <span className="eyebrow">{ticket.id}</span>
          <h3>{ticket.summary}</h3>
          <div className="ticket-detail-meta">
            <span>{ticket.customer_name}</span>
            <span className="badge">{ticket.channel}</span>
            <span className={`priority priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
            <span className="badge">{ticket.status}</span>
            <span className={`badge type-badge type-${ticket.ticket_type}`}>{TICKET_TYPE_LABELS[ticket.ticket_type] ?? ticket.ticket_type}</span>
            {assignedAgent && <span className="badge assigned-badge">🧑 {assignedAgent.name}</span>}
            {linkedProblem && <span className="badge problem-badge">⚠ {linkedProblem.title}</span>}
          </div>
        </div>
      </div>

      {/* ── Status update ── */}
      <div className="operations-panel">
        <form onSubmit={handleStatusUpdate} className="status-update-row">
          <label style={{ fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" }}>Update status</label>
          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} style={{ flex: 1 }}>
            {TICKET_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="primary-button" type="submit" disabled={statusSaving || newStatus === ticket.status}>
            {statusSaving ? "Saving…" : "Save"}
          </button>
        </form>
        {statusError && <div className="form-error" style={{ marginTop: 8 }}>{statusError}</div>}
      </div>

      {/* ── Assignment — supervisor + admin only ── */}
      {canAssign && (
        <div className="operations-panel">
          <form onSubmit={handleAssign} className="status-update-row">
            <label style={{ fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" }}>Assign to agent</label>
            <select value={assignAgentId} onChange={(e) => setAssignAgentId(e.target.value)} style={{ flex: 1 }}>
              <option value="">— unassigned —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
              ))}
            </select>
            <button className="primary-button" type="submit" disabled={assignSaving || !assignAgentId}>
              {assignSaving ? "Saving…" : "Assign"}
            </button>
          </form>
          {assignError && <div className="form-error" style={{ marginTop: 8 }}>{assignError}</div>}
        </div>
      )}

      {/* ── Problem link — incidents only ── */}
      {ticket.ticket_type === "incident" && (
        <div className="operations-panel">
          <form onSubmit={handleLinkProblem} className="status-update-row">
            <label style={{ fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" }}>Link to problem</label>
            <select value={linkProblemId} onChange={(e) => setLinkProblemId(e.target.value)} style={{ flex: 1 }}>
              <option value="">— none —</option>
              {problems.map((p) => (
                <option key={p.id} value={p.id}>{p.title} ({p.status})</option>
              ))}
            </select>
            <button className="primary-button" type="submit" disabled={linkSaving}>
              {linkSaving ? "Saving…" : "Save"}
            </button>
          </form>
          {linkError && <div className="form-error" style={{ marginTop: 8 }}>{linkError}</div>}
        </div>
      )}

      {/* ── Notes & activity ── */}
      <div className="operations-panel">
        <h4 style={{ margin: "0 0 12px" }}>Notes &amp; activity</h4>
        {msgLoading ? (
          <p className="loading-text">Loading…</p>
        ) : messages.length === 0 ? (
          <p style={{ color: "#9aa5b4", fontSize: "0.875rem" }}>No notes yet.</p>
        ) : messages.map((m) => (
          <div key={m.id} className={`message-item ${m.visibility}`}>
            <div className="message-meta">
              <strong>{m.author_name}</strong>
              <span className={`badge visibility-${m.visibility}`}>{m.visibility === "internal" ? "Internal" : "Customer"}</span>
              <span className="message-time">{new Date(m.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <p className="message-body">{m.body}</p>
          </div>
        ))}
      </div>

      {/* ── Add note ── */}
      <div className="operations-panel">
        <h4 style={{ margin: "0 0 12px" }}>Add note</h4>
        <form onSubmit={handleAddNote} style={{ display: "grid", gap: 10 }}>
          {noteError && <div className="form-error">{noteError}</div>}
          <select value={noteVis} onChange={(e) => setNoteVis(e.target.value as "internal" | "customer")} style={{ maxWidth: 260 }}>
            <option value="internal">Internal (agents only)</option>
            <option value="customer">Customer-facing</option>
          </select>
          <textarea rows={4} required value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Add a note or update…" style={{ border: "1px solid #c7d3df", borderRadius: 6, padding: "8px 10px", resize: "vertical", font: "inherit" }} />
          <div>
            <button className="primary-button" type="submit" disabled={noteSaving}>{noteSaving ? "Saving…" : "Add note"}</button>
          </div>
        </form>
      </div>

    </div>
  );
}

function TicketQueueTable({ tickets, compact, onSelect }: { tickets: Ticket[]; compact?: boolean; onSelect?: (t: Ticket) => void }) {
  return (
    <section aria-label="Ticket queue" className="queue-table">
      {!compact && (
        <div className="queue-header">
          <span>Summary</span>
          <span>Customer</span>
          <span>Type</span>
          <span>Priority</span>
          <span>Status</span>
        </div>
      )}
      {tickets.length === 0 ? (
        <div className="empty-state">No tickets yet.</div>
      ) : tickets.map((ticket) => (
        <div
          className={`queue-row${onSelect ? " clickable" : ""}`}
          key={ticket.id}
          onClick={() => onSelect?.(ticket)}
          role={onSelect ? "button" : undefined}
          tabIndex={onSelect ? 0 : undefined}
          onKeyDown={(e) => e.key === "Enter" && onSelect?.(ticket)}
        >
          <strong>{ticket.summary}</strong>
          <span>{ticket.customer_name}</span>
          <span className={`badge type-badge type-${ticket.ticket_type}`}>{TICKET_TYPE_LABELS[ticket.ticket_type] ?? ticket.ticket_type}</span>
          <span className={`priority priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
          <span>{ticket.status}</span>
        </div>
      ))}
    </section>
  );
}

// ─── Problems ─────────────────────────────────────────────────────────────────

const PROBLEM_STATUSES = ["Open", "Under Investigation", "Resolved", "Closed"] as const;
const BLANK_PROBLEM = { title: "", description: "" };

function ProblemsSurface() {
  const [problems, setProblems]     = useState<Problem[]>([]);
  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState<Problem | null>(null);
  const [form, setForm]             = useState(BLANK_PROBLEM);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<Problem | null>(null);
  const [linkedTickets, setLinkedTickets] = useState<ProblemTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  const reload = useCallback(() => {
    problemsApi.list().then(setProblems).catch(console.error);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK_PROBLEM);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(p: Problem) {
    setEditing(p);
    setForm({ title: p.title, description: p.description ?? "" });
    setError(null);
    setFormOpen(true);
    setSelected(null);
  }

  function openDetail(p: Problem) {
    setSelected(p);
    setFormOpen(false);
    setTicketsLoading(true);
    problemsApi.tickets(p.id)
      .then(setLinkedTickets)
      .catch(console.error)
      .finally(() => setTicketsLoading(false));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await problemsApi.update(editing.id, { title: form.title, description: form.description || undefined });
      } else {
        await problemsApi.create({ title: form.title, description: form.description || undefined });
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(p: Problem, status: string) {
    await problemsApi.update(p.id, { status: status as Problem["status"] }).catch(console.error);
    reload();
    if (selected?.id === p.id) setSelected({ ...p, status: status as Problem["status"] });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this problem? Linked incidents will be unlinked.")) return;
    try {
      await problemsApi.delete(id);
      reload();
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (selected) {
    return (
      <div className="ticket-detail-page">
        <div className="ticket-detail-topbar">
          <button className="secondary-button" type="button" onClick={() => setSelected(null)}>← Back to problems</button>
          <div className="ticket-detail-title">
            <span className="eyebrow">Problem record</span>
            <h3>{selected.title}</h3>
            <div className="ticket-detail-meta">
              <span className={`badge problem-status-${selected.status.toLowerCase().replace(" ", "-")}`}>{selected.status}</span>
              <span className="badge">{linkedTickets.length} linked incident{linkedTickets.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>

        <div className="operations-panel">
          <form className="status-update-row" onSubmit={(e) => e.preventDefault()}>
            <label style={{ fontWeight: 600, fontSize: "0.875rem", whiteSpace: "nowrap" }}>Update status</label>
            <select
              value={selected.status}
              onChange={(e) => handleStatusChange(selected, e.target.value)}
              style={{ flex: 1 }}
            >
              {PROBLEM_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </form>
        </div>

        {selected.description && (
          <div className="operations-panel">
            <h4 style={{ margin: "0 0 8px" }}>Description</h4>
            <p style={{ margin: 0, color: "#526174", lineHeight: 1.6 }}>{selected.description}</p>
          </div>
        )}

        <div className="operations-panel">
          <h4 style={{ margin: "0 0 12px" }}>Linked incidents</h4>
          {ticketsLoading ? (
            <p className="loading-text">Loading…</p>
          ) : linkedTickets.length === 0 ? (
            <p style={{ color: "#9aa5b4", fontSize: "0.875rem" }}>
              No incidents linked. Open an incident ticket and link it to this problem from the ticket detail.
            </p>
          ) : (
            <div className="linked-tickets-list">
              {linkedTickets.map((t) => (
                <div key={t.id} className="linked-ticket-row">
                  <span className="linked-ticket-id">{t.id}</span>
                  <span className="linked-ticket-summary">{t.summary}</span>
                  <span>{t.customer_name}</span>
                  <span className={`priority priority-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <span>{t.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="operations-panel" style={{ display: "flex", gap: 10 }}>
          <button className="secondary-button" type="button" onClick={() => openEdit(selected)}><Pencil size={14} /> Edit problem</button>
          <button className="secondary-button danger" type="button" onClick={() => handleDelete(selected.id)}><Trash2 size={14} /> Delete</button>
        </div>
      </div>
    );
  }

  return (
    <section className="surface-grid">
      <div className="operations-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Problem management</p>
            <h3>Problem records</h3>
          </div>
          <button className="primary-button" onClick={openCreate} type="button">
            <Plus size={16} /> New problem
          </button>
        </div>

        {formOpen && (
          <form className="ticket-form" onSubmit={handleSubmit}>
            {error && <div className="form-error span-2">{error}</div>}
            <label className="span-2">
              Problem title
              <input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Email server outage — Exchange Online" />
            </label>
            <label className="span-2">
              Description
              <textarea rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Root cause, impact, affected systems…" style={{ resize: "vertical", border: "1px solid #c7d3df", borderRadius: 6, padding: "8px 10px", font: "inherit" }} />
            </label>
            <div className="form-actions span-2">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create problem"}</button>
              <button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="problem-list">
          {problems.length === 0 ? (
            <div className="empty-state">No problems recorded. Create one to group related incidents.</div>
          ) : problems.map((p) => (
            <div className="problem-row" key={p.id} onClick={() => openDetail(p)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && openDetail(p)}>
              <div className="problem-icon"><AlertTriangle size={18} /></div>
              <div className="problem-info">
                <strong>{p.title}</strong>
                {p.description && <span className="problem-desc">{p.description}</span>}
              </div>
              <span className={`badge problem-status-${p.status.toLowerCase().replace(" ", "-")}`}>{p.status}</span>
              <div className="customer-actions" onClick={(e) => e.stopPropagation()}>
                <button className="icon-button" type="button" onClick={() => openEdit(p)} aria-label="Edit"><Pencil size={14} /></button>
                <button className="icon-button danger" type="button" onClick={() => handleDelete(p.id)} aria-label="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="operations-panel side-panel">
        <h3>Problem summary</h3>
        <Metric label="Total problems" value={String(problems.length)} />
        <Metric label="Open"           value={String(problems.filter((p) => p.status === "Open").length)} />
        <Metric label="Under investigation" value={String(problems.filter((p) => p.status === "Under Investigation").length)} />
        <p style={{ color: "#9aa5b4", fontSize: "0.8rem", marginTop: 12 }}>Click any problem to see linked incidents.</p>
      </div>
    </section>
  );
}

// ─── Customers ────────────────────────────────────────────────────────────────

const BLANK_CUSTOMER = { name: "", phone: "", email: "", department: "", location: "" };

function CustomersSurface() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]       = useState("");
  const [formOpen, setFormOpen]   = useState(false);
  const [editing, setEditing]     = useState<Customer | null>(null);
  const [form, setForm]           = useState(BLANK_CUSTOMER);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const reload = useCallback(() => {
    customersApi.list(search || undefined).then(setCustomers).catch(console.error);
  }, [search]);

  useEffect(() => { reload(); }, [reload]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK_CUSTOMER);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", department: c.department ?? "", location: c.location ?? "" });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        phone: form.phone || undefined,
        email: form.email || undefined,
        department: form.department || undefined,
        location: form.location || undefined,
      };
      if (editing) {
        await customersApi.update(editing.id, payload);
      } else {
        await customersApi.create(payload);
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer?")) return;
    try {
      await customersApi.delete(id);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <section className="surface-grid">
      <div className="operations-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">People</p>
            <h3>Customer directory</h3>
          </div>
          <button className="primary-button" onClick={openCreate} type="button">
            <Plus size={16} /> Add customer
          </button>
        </div>

        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          Search customers
          <input placeholder="Name, email or department…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        {formOpen && (
          <form className="ticket-form customer-form" onSubmit={handleSubmit}>
            {error && <div className="form-error span-2">{error}</div>}
            <label>
              Full name
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label>
              Phone number
              <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </label>
            <label>
              Email address
              <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </label>
            <label>
              Department
              <input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} />
            </label>
            <label className="span-2">
              Location / site
              <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </label>
            <div className="form-actions span-2">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Add customer"}</button>
              <button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="customer-list">
          {customers.length === 0 ? (
            <div className="empty-state">No customers yet. Add the first one above.</div>
          ) : customers.map((c) => (
            <div className="customer-row" key={c.id}>
              <div className="customer-avatar">{c.name.charAt(0).toUpperCase()}</div>
              <div className="customer-info">
                <strong>{c.name}</strong>
                <span className="customer-meta">
                  {[c.phone, c.email, c.department, c.location].filter(Boolean).join(" · ")}
                </span>
              </div>
              <div className="customer-actions">
                <button className="icon-button" type="button" onClick={() => openEdit(c)} aria-label="Edit"><Pencil size={15} /></button>
                <button className="icon-button danger" type="button" onClick={() => handleDelete(c.id)} aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="operations-panel side-panel">
        <h3>Directory stats</h3>
        <Metric label="Total customers" value={String(customers.length)} />
      </div>
    </section>
  );
}

// ─── Users (admin only) ───────────────────────────────────────────────────────

const BLANK_USER = { name: "", email: "", role: "agent" as UserRole, password: "" };

function UsersSurface() {
  const [users, setUsers]       = useState<User[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState<User | null>(null);
  const [form, setForm]         = useState(BLANK_USER);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const reload = useCallback(() => { usersApi.list().then(setUsers).catch(console.error); }, []);
  useEffect(() => { reload(); }, [reload]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK_USER);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role, password: "" });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        const patch: Parameters<typeof usersApi.update>[1] = { name: form.name, role: form.role };
        if (form.password) patch.password = form.password;
        await usersApi.update(editing.id, patch);
      } else {
        await usersApi.create({ name: form.name, email: form.email, role: form.role, password: form.password });
      }
      setFormOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user? Their assigned tickets will be unassigned.")) return;
    try {
      await usersApi.delete(id);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const roleColour: Record<UserRole, string> = { admin: "#c0392b", supervisor: "#2980b9", agent: "#27ae60" };

  return (
    <section className="surface-grid">
      <div className="operations-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Administration</p>
            <h3>User management</h3>
          </div>
          <button className="primary-button" onClick={openCreate} type="button">
            <Plus size={16} /> Add user
          </button>
        </div>

        {error && !formOpen && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

        {formOpen && (
          <form className="ticket-form" onSubmit={handleSubmit}>
            {error && <div className="form-error span-2">{error}</div>}
            <label>
              Full name
              <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}>
                <option value="agent">Agent</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            {!editing && (
              <label className="span-2">
                Email address
                <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </label>
            )}
            <label className="span-2">
              {editing ? "New password (leave blank to keep current)" : "Password"}
              <input
                type="password"
                required={!editing}
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={editing ? "Leave blank to keep current password" : "Min. 8 characters"}
              />
            </label>
            <div className="form-actions span-2">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create user"}</button>
              <button className="secondary-button" type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            </div>
          </form>
        )}

        <div className="user-list">
          {users.length === 0 ? (
            <div className="empty-state">No users found.</div>
          ) : users.map((u) => (
            <div className="user-row" key={u.id}>
              <div className="user-avatar">{u.name.charAt(0).toUpperCase()}</div>
              <div className="customer-info">
                <strong>{u.name}</strong>
                <span className="customer-meta">{u.email}</span>
              </div>
              <span className="role-badge" style={{ background: roleColour[u.role] + "22", color: roleColour[u.role], border: `1px solid ${roleColour[u.role]}44` }}>{u.role}</span>
              <div className="customer-actions">
                <button className="icon-button" type="button" onClick={() => openEdit(u)} aria-label="Edit"><Pencil size={15} /></button>
                <button className="icon-button danger" type="button" onClick={() => handleDelete(u.id)} aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="operations-panel side-panel">
        <h3>User summary</h3>
        <Metric label="Total users"  value={String(users.length)} />
        <Metric label="Agents"       value={String(users.filter((u) => u.role === "agent").length)} />
        <Metric label="Supervisors"  value={String(users.filter((u) => u.role === "supervisor").length)} />
        <Metric label="Admins"       value={String(users.filter((u) => u.role === "admin").length)} />
      </div>
    </section>
  );
}

// ─── Knowledge ────────────────────────────────────────────────────────────────

type KbView = "list" | "editor" | "suggest";

function KnowledgeSurface() {
  const [articles, setArticles]     = useState<Article[]>([]);
  const [search, setSearch]         = useState("");
  const [view, setView]             = useState<KbView>("list");
  const [editing, setEditing]       = useState<Article | null>(null);
  const [suggestion, setSuggestion] = useState<ArticleSuggestion | null>(null);
  const [chatInput, setChatInput]   = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [form, setForm]             = useState({ title: "", summary: "", body: "", category: "", audience: "Customer" });
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);

  const reload = useCallback(() => {
    articlesApi.list({ search: search || undefined }).then(setArticles).catch(console.error);
  }, [search]);

  useEffect(() => { reload(); }, [reload]);

  function openCreate() {
    setEditing(null);
    setForm({ title: "", summary: "", body: "", category: "", audience: "Customer" });
    setSaveError(null);
    setView("editor");
  }

  function openEdit(a: Article) {
    setEditing(a);
    setForm({ title: a.title, summary: a.summary, body: a.body, category: a.category ?? "", audience: a.audience });
    setSaveError(null);
    setView("editor");
  }

  function applySuggestion(s: ArticleSuggestion) {
    setForm({ title: s.title, summary: s.summary, body: s.body, category: s.category, audience: "Customer" });
    setEditing(null);
    setView("editor");
  }

  async function handleSuggest(e: FormEvent) {
    e.preventDefault();
    setSuggesting(true);
    try {
      const s = await articlesApi.suggest(chatInput);
      setSuggestion(s);
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        await articlesApi.update(editing.id, form);
      } else {
        await articlesApi.create(form);
      }
      setView("list");
      reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed — please try again");
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(id: string) { await articlesApi.publish(id).catch(console.error); reload(); }
  async function handleArchive(id: string) { await articlesApi.archive(id).catch(console.error); reload(); }
  async function handleDelete(id: string) {
    if (!confirm("Delete this article?")) return;
    await articlesApi.delete(id).catch(console.error);
    reload();
  }

  const drafts    = articles.filter((a) => a.status === "Draft").length;
  const published = articles.filter((a) => a.status === "Published").length;

  return (
    <section className="knowledge-layout">
      <div className="operations-panel">
        {view === "list" && (
          <>
            <div className="panel-heading">
              <div><p className="eyebrow">Knowledge hub</p><h3>Article library</h3></div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="secondary-button" onClick={() => { setSuggestion(null); setView("suggest"); }} type="button">
                  <Wand2 size={16} /> AI suggest
                </button>
                <button className="primary-button" onClick={openCreate} type="button">
                  <Plus size={16} /> Draft article
                </button>
              </div>
            </div>
            <label className="search-field">
              <Search aria-hidden="true" size={18} />
              Search knowledge
              <input placeholder="Search articles…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <div className="article-list">
              {articles.length === 0 ? (
                <div className="empty-state">No articles found.</div>
              ) : articles.map((a) => (
                <article className="article-row" key={a.id}>
                  <BookOpen aria-hidden="true" size={20} />
                  <div><h4>{a.title}</h4><p>{a.summary}</p></div>
                  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                    <span className={`badge status-badge-${a.status.toLowerCase()}`}>{a.status}</span>
                    <button className="icon-button" type="button" onClick={() => openEdit(a)}><Pencil size={14} /></button>
                    {a.status === "Draft"     && <button className="secondary-button small" type="button" onClick={() => handlePublish(a.id)}>Publish</button>}
                    {a.status === "Published" && <button className="secondary-button small" type="button" onClick={() => handleArchive(a.id)}>Archive</button>}
                    <button className="icon-button danger" type="button" onClick={() => handleDelete(a.id)}><Trash2 size={14} /></button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {view === "suggest" && (
          <>
            <div className="panel-heading">
              <div><p className="eyebrow">AI assistance</p><h3>Suggest an article</h3></div>
              <button className="secondary-button" onClick={() => setView("list")} type="button"><X size={16} /> Cancel</button>
            </div>
            <p style={{ color:"#526174", marginTop:0 }}>
              Paste a support conversation or describe an issue. Claude will draft a knowledge base article you can review and publish.
            </p>
            <form onSubmit={handleSuggest} style={{ display:"grid", gap:14 }}>
              <label>
                Conversation or issue summary
                <textarea rows={6} required value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                  placeholder="e.g. Customer couldn't access email after password reset — MFA was also reset and needed re-enrolment via Authenticator app…" />
              </label>
              <button className="primary-button" type="submit" disabled={suggesting}>
                {suggesting ? "Thinking…" : "Generate article draft"}
              </button>
            </form>
            {suggestion && (
              <div className="suggestion-preview">
                <h4>{suggestion.title}</h4>
                <p style={{ color:"#526174" }}>{suggestion.summary}</p>
                <pre className="article-body-preview">{suggestion.body}</pre>
                <div style={{ display:"flex", gap:10, marginTop:14 }}>
                  <button className="primary-button" type="button" onClick={() => applySuggestion(suggestion)}>Edit &amp; publish</button>
                  <button className="secondary-button" type="button" onClick={() => setSuggestion(null)}>Discard</button>
                </div>
              </div>
            )}
          </>
        )}

        {view === "editor" && (
          <>
            <div className="panel-heading">
              <div><p className="eyebrow">{editing ? "Editing article" : "New article"}</p><h3>{editing ? editing.title : "Draft"}</h3></div>
              <button className="secondary-button" onClick={() => setView("list")} type="button"><X size={16} /> Cancel</button>
            </div>
            <form onSubmit={handleSave} style={{ display:"grid", gap:14 }}>
              {saveError && <div className="form-error">{saveError}</div>}
              <label>Title<input required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></label>
              <label>Summary (1–2 sentences)<input required value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} /></label>
              <label>Category<input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Access & Accounts, Hardware…" /></label>
              <label>
                Audience
                <select value={form.audience} onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}>
                  <option>Customer</option><option>Internal</option><option>Both</option>
                </select>
              </label>
              <label>Body (Markdown supported)<textarea rows={14} required value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} /></label>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
            </form>
          </>
        )}
      </div>

      <aside className="operations-panel side-panel">
        <h3>Article stats</h3>
        <Metric label="Total articles"  value={String(articles.length)} />
        <Metric label="Published"       value={String(published)} />
        <Metric label="Awaiting review" value={String(drafts)} />
      </aside>
    </section>
  );
}

// ─── SLA Config ───────────────────────────────────────────────────────────────

const BLANK_SLA = { name: "", priority: "P3", category: "", firstResponseMinutes: 240, resolutionMinutes: 1440 };

function SlaSurface() {
  const [policies, setPolicies] = useState<SlaPolicy[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState<SlaPolicy | null>(null);
  const [form, setForm]         = useState(BLANK_SLA);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const reload = useCallback(() => { slaApi.list().then(setPolicies).catch(console.error); }, []);
  useEffect(() => { reload(); }, [reload]);

  function openCreate() {
    setEditing(null);
    setForm(BLANK_SLA);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(p: SlaPolicy) {
    setEditing(p);
    setForm({ name: p.name, priority: p.priority, category: p.category ?? "", firstResponseMinutes: p.first_response_minutes, resolutionMinutes: p.resolution_minutes });
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await slaApi.upsert({ name: form.name, priority: form.priority, category: form.category || undefined, firstResponseMinutes: Number(form.firstResponseMinutes), resolutionMinutes: Number(form.resolutionMinutes) });
      setForm(BLANK_SLA);
      setEditing(null);
      setFormOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed — please try again");
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this SLA policy?")) return;
    await slaApi.delete(id).catch(console.error);
    reload();
  }

  function fmt(m: number): string {
    if (m < 60)   return `${m}m`;
    if (m < 1440) return `${Math.round(m / 60)}h`;
    return `${Math.round(m / 1440)}d`;
  }

  return (
    <section className="surface-grid">
      <div className="operations-panel">
        <div className="panel-heading">
          <div><p className="eyebrow">Response targets</p><h3>SLA policies</h3></div>
          <button className="primary-button" onClick={openCreate} type="button"><Plus size={16} /> Add policy</button>
        </div>

        {formOpen && (
          <form className="ticket-form" onSubmit={handleSubmit}>
            {error && <div className="form-error span-2">{error}</div>}
            <label>Policy name<input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. P1 Critical" /></label>
            <label>Priority<select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>{["P1","P2","P3","P4"].map((p) => <option key={p}>{p}</option>)}</select></label>
            <label>Category (optional)<input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Incident, Service Request…" /></label>
            <label>First response (minutes)<input type="number" min={1} required value={form.firstResponseMinutes} onChange={(e) => setForm((f) => ({ ...f, firstResponseMinutes: Number(e.target.value) }))} /></label>
            <label>Resolution (minutes)<input type="number" min={1} required value={form.resolutionMinutes} onChange={(e) => setForm((f) => ({ ...f, resolutionMinutes: Number(e.target.value) }))} /></label>
            <div className="form-actions span-2">
              <button className="primary-button" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Save policy"}</button>
              <button className="secondary-button" type="button" onClick={() => { setFormOpen(false); setEditing(null); }}>Cancel</button>
            </div>
          </form>
        )}

        <div className="sla-table">
          <div className="sla-header">
            <span>Name</span><span>Priority</span><span>Category</span><span>First response</span><span>Resolution</span><span></span>
          </div>
          {policies.length === 0 ? (
            <div className="empty-state">No SLA policies configured.</div>
          ) : policies.map((p) => (
            <div className="sla-row" key={p.id}>
              <strong>{p.name}</strong>
              <span className={`priority priority-${p.priority.toLowerCase()}`}>{p.priority}</span>
              <span>{p.category ?? <em style={{ color:"#9aa5b4" }}>—</em>}</span>
              <span>{fmt(p.first_response_minutes)}</span>
              <span>{fmt(p.resolution_minutes)}</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="icon-button" type="button" onClick={() => openEdit(p)} aria-label="Edit"><Pencil size={14} /></button>
                <button className="icon-button danger" type="button" onClick={() => handleDelete(p.id)} aria-label="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="operations-panel side-panel">
        <h3>About SLAs</h3>
        <p style={{ color:"#526174", fontSize:"0.9rem", lineHeight:1.6 }}>
          Policies define response targets by priority and category. The dashboard RAG chart reflects live compliance.
        </p>
        <p style={{ color:"#526174", fontSize:"0.9rem", lineHeight:1.6 }}>
          <strong>Amber</strong> = within 80% of window used.<br />
          <strong>Red</strong> = breached.
        </p>
      </div>
    </section>
  );
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function ReportingSurface() {
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [compliance, setCompliance] = useState<SlaCompliance | null>(null);

  useEffect(() => {
    ticketsApi.list().then(setTickets).catch(console.error);
    slaApi.compliance().then(setCompliance).catch(console.error);
  }, []);

  const byChannel = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => { acc[t.channel] = (acc[t.channel] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  const byPriority = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => { acc[t.priority] = (acc[t.priority] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => a[0].localeCompare(b[0]));

  const byType = Object.entries(
    tickets.reduce<Record<string, number>>((acc, t) => {
      const label = TICKET_TYPE_LABELS[t.ticket_type] ?? t.ticket_type;
      acc[label] = (acc[label] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <section className="reporting-grid">
      <div className="operations-panel metric-card"><Metric label="Total tickets"  value={String(tickets.length)} /></div>
      <div className="operations-panel metric-card"><Metric label="SLA compliance" value={compliance ? `${compliance.compliance_pct}%` : "—"} /></div>
      <div className="operations-panel metric-card"><Metric label="Open tickets"   value={String(tickets.filter((t) => !["Resolved","Closed"].includes(t.status)).length)} /></div>

      <section className="operations-panel reporting-panel">
        <h3>Tickets by type</h3>
        {byType.length === 0 ? <div className="empty-state">No ticket volume yet.</div> : byType.map(([type, n]) => (
          <div className="report-row" key={type}><span>{type}</span><strong>{n} {n === 1 ? "ticket" : "tickets"}</strong></div>
        ))}
      </section>

      <section className="operations-panel reporting-panel">
        <h3>Tickets by channel</h3>
        {byChannel.length === 0 ? <div className="empty-state">No ticket volume yet.</div> : byChannel.map(([ch, n]) => (
          <div className="report-row" key={ch}><span>{ch}</span><strong>{n} {n === 1 ? "ticket" : "tickets"}</strong></div>
        ))}
      </section>

      <section className="operations-panel reporting-panel">
        <h3>Tickets by priority</h3>
        {byPriority.length === 0 ? <div className="empty-state">No ticket volume yet.</div> : byPriority.map(([pr, n]) => (
          <div className="report-row" key={pr}>
            <span className={`priority priority-${pr.toLowerCase()}`}>{pr}</span>
            <strong>{n} {n === 1 ? "ticket" : "tickets"}</strong>
          </div>
        ))}
      </section>
    </section>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default App;
