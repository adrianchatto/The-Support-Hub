import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Ban,
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
  Headphones,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  RotateCcw,
  Search,
  ShieldCheck,
  Ticket as TicketIcon,
} from "lucide-react";
import {
  addTicket,
  createInitialState,
  derivePriority,
  getChannelCounts,
  resolveCustomerAgentRequest,
  searchPublishedArticles,
} from "./domain/supportHub";
import type {
  BotDecision,
  KnowledgeArticle,
  ImpactLevel,
  RequestType,
  SupportChannel,
  Ticket,
  TicketCategory,
  TicketStatus,
  TimelineEntry,
  UrgencyLevel,
} from "./domain/supportHub";
import "./App.css";

type Surface = "tickets" | "customers" | "knowledge" | "customer-site" | "slas" | "reporting";

type CustomerAccount = {
  active: boolean;
  email: string;
  id: string;
  lastTicket: string;
  name: string;
  primaryContact: string;
};

const surfaces = [
  { id: "tickets" as const, label: "Tickets", icon: TicketIcon },
  { id: "customers" as const, label: "Customers", icon: Building2 },
  { id: "knowledge" as const, label: "Knowledge", icon: BookOpen },
  { id: "customer-site" as const, label: "Customer site", icon: Headphones },
  { id: "slas" as const, label: "SLAs", icon: Clock3 },
  { id: "reporting" as const, label: "Reporting", icon: BarChart3 },
];

const initialCustomers: CustomerAccount[] = [
  {
    active: true,
    email: "support@hadley.example",
    id: "CUS-001",
    lastTicket: "Client portal access",
    name: "Hadley Advisory",
    primaryContact: "Maya Patel",
  },
  {
    active: true,
    email: "qa@neovance.example",
    id: "CUS-002",
    lastTicket: "Contact lens QA evaluation",
    name: "Neovance",
    primaryContact: "Sam Noor",
  },
  {
    active: true,
    email: "ops@outbound.example",
    id: "CUS-003",
    lastTicket: "Reporting update",
    name: "Outbound campaigns",
    primaryContact: "Nadia Lewis",
  },
];

const emptyTicket = {
  category: "General" as TicketCategory,
  channel: "Phone" as SupportChannel,
  contactEmail: "",
  contactName: "",
  countryCode: "+971",
  contactPhone: "",
  customer: "",
  impact: "Medium" as ImpactLevel,
  parentTicketId: "",
  requestType: "Incident" as RequestType,
  summary: "",
  urgency: "Medium" as UrgencyLevel,
};

const emptyCustomerDraft = {
  email: "",
  name: "",
  primaryContact: "",
};

const emptyArticleDraft = {
  summary: "",
  title: "",
};

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeSurface, setActiveSurface] = useState<Surface>("tickets");
  const [state, setState] = useState(() => createInitialState());
  const [customers, setCustomers] = useState<CustomerAccount[]>(initialCustomers);
  const [isCustomerFormOpen, setIsCustomerFormOpen] = useState(false);
  const [customerDraft, setCustomerDraft] = useState(emptyCustomerDraft);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [ticketDraft, setTicketDraft] = useState(emptyTicket);
  const [contactErrors, setContactErrors] = useState({ email: "", phone: "" });
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [isArticleDraftOpen, setIsArticleDraftOpen] = useState(false);
  const [articleDraft, setArticleDraft] = useState(emptyArticleDraft);
  const [knowledgeMode, setKnowledgeMode] = useState<"library" | "low-helpfulness">("library");
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [portalQuery, setPortalQuery] = useState("");
  const [botMessage, setBotMessage] = useState("");
  const [botDecision, setBotDecision] = useState<BotDecision | null>(null);
  const [slaPolicy, setSlaPolicy] = useState({
    firstResponseHours: 4,
    name: "Standard support",
    resolutionHours: 24,
  });

  const portalArticles = useMemo(
    () => searchPublishedArticles(state, portalQuery),
    [portalQuery, state],
  );
  const knowledgeArticles = useMemo(
    () =>
      state.articles.filter((article) => {
        const query = knowledgeQuery.trim().toLowerCase();
        if (!query) {
          return true;
        }

        return `${article.title} ${article.summary} ${article.body}`.toLowerCase().includes(query);
      }),
    [knowledgeQuery, state.articles],
  );
  const channelCounts = useMemo(() => getChannelCounts(state), [state]);
  const slaWallboard = useMemo(() => getSlaWallboard(state.tickets), [state.tickets]);

  function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const e164Phone = toE164Phone(ticketDraft.countryCode, ticketDraft.contactPhone);

    const nextErrors = {
      email: isValidEmail(ticketDraft.contactEmail) ? "" : "Enter a valid email address.",
      phone: e164Phone ? "" : "Enter a valid E.164 phone number.",
    };
    setContactErrors(nextErrors);

    if (nextErrors.email || !e164Phone) {
      return;
    }

    const contactPhone = e164Phone;

    setState((currentState) =>
      addTicket(currentState, {
        channel: ticketDraft.channel,
        category: ticketDraft.category,
        contact: ticketDraft.contactName,
        contactEmail: ticketDraft.contactEmail,
        contactPhone,
        customer: ticketDraft.customer,
        impact: ticketDraft.impact,
        parentTicketId: ticketDraft.parentTicketId || undefined,
        requestType: ticketDraft.requestType,
        summary: ticketDraft.summary,
        urgency: ticketDraft.urgency,
      }),
    );
    setTicketDraft(emptyTicket);
    setContactErrors({ email: "", phone: "" });
    setIsTicketFormOpen(false);
  }

  function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingCustomerId) {
      setCustomers((currentCustomers) =>
        currentCustomers.map((customer) =>
          customer.id === editingCustomerId
            ? {
                ...customer,
                email: customerDraft.email,
                name: customerDraft.name,
                primaryContact: customerDraft.primaryContact,
              }
            : customer,
        ),
      );
      setEditingCustomerId(null);
      setCustomerDraft(emptyCustomerDraft);
      setIsCustomerFormOpen(false);
      return;
    }

    setCustomers((currentCustomers) => [
      ...currentCustomers,
      {
        active: true,
        email: customerDraft.email,
        id: `CUS-${String(currentCustomers.length + 1).padStart(3, "0")}`,
        lastTicket: "No tickets yet",
        name: customerDraft.name,
        primaryContact: customerDraft.primaryContact,
      },
    ]);
    setCustomerDraft(emptyCustomerDraft);
    setIsCustomerFormOpen(false);
  }

  function editCustomer(customer: CustomerAccount) {
    setEditingCustomerId(customer.id);
    setCustomerDraft({
      email: customer.email,
      name: customer.name,
      primaryContact: customer.primaryContact,
    });
    setIsCustomerFormOpen(true);
  }

  function toggleCustomerStatus(customerId: string) {
    setCustomers((currentCustomers) =>
      currentCustomers.map((customer) =>
        customer.id === customerId ? { ...customer, active: !customer.active } : customer,
      ),
    );
  }

  function startTicketWork(ticketId: string) {
    setState((currentState) => ({
      ...currentState,
      tickets: currentState.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: ticket.status === "New" ? "Open" : ticket.status,
              timeline:
                ticket.status === "New"
                  ? [...ticket.timeline, createTimelineEntry("Agent started work")]
                  : [...ticket.timeline, createTimelineEntry("Agent resumed work")],
            }
          : ticket,
      ),
    }));
  }

  function updateTicketStatus(ticketId: string, status: TicketStatus) {
    setState((currentState) => ({
      ...currentState,
      tickets: currentState.tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, status, timeline: [...ticket.timeline, createTimelineEntry(`Status changed to ${status}`)] }
          : ticket,
      ),
    }));
  }

  function addTicketNote(ticketId: string, note: string) {
    setState((currentState) => ({
      ...currentState,
      tickets: currentState.tickets.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, timeline: [...ticket.timeline, createTimelineEntry(`Agent note: ${note}`)] }
          : ticket,
      ),
    }));
  }

  function saveArticleDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((currentState) => ({
      ...currentState,
      articles: [
        ...currentState.articles,
        {
          audience: "Internal",
          body: articleDraft.summary,
          id: `KB-${String(currentState.articles.length + 1).padStart(3, "0")}`,
          status: "Draft",
          summary: articleDraft.summary,
          title: articleDraft.title,
        },
      ],
    }));
    setArticleDraft(emptyArticleDraft);
    setIsArticleDraftOpen(false);
  }

  function requestAgent() {
    const next = resolveCustomerAgentRequest(state, {
      customer: "Hadley Advisory",
      message: botMessage,
    });
    const { botDecision: decision, ...nextState } = next;
    setState(nextState);
    setBotDecision(decision);
  }

  if (!isSignedIn) {
    return <LoginScreen onSignIn={() => setIsSignedIn(true)} />;
  }

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
          <ShieldCheck aria-hidden="true" size={18} />
          <div>
            <strong>Microsoft SSO ready</strong>
            <span>Entra ID integration path</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Service operations workspace</p>
            <h2>{surfaceTitle(activeSurface)}</h2>
          </div>
          <div className="topbar-actions">
            <span className={`status-pill ${slaWallboard.tone}`}>
              <span>SLA risk</span>
              <strong>{slaWallboard.label}</strong>
            </span>
            <span className="status-pill">
              <span>Knowledge gaps</span>
              <strong>4</strong>
            </span>
          </div>
        </header>

        {activeSurface === "tickets" && (
          <TicketsSurface
            contactErrors={contactErrors}
            createTicket={createTicket}
            customers={customers}
            isTicketFormOpen={isTicketFormOpen}
            addTicketNote={addTicketNote}
            selectedTicketId={selectedTicketId}
            setIsTicketFormOpen={setIsTicketFormOpen}
            setSelectedTicketId={setSelectedTicketId}
            setTicketDraft={setTicketDraft}
            setTicketSearch={setTicketSearch}
            slaWallboard={slaWallboard}
            startTicketWork={startTicketWork}
            ticketDraft={ticketDraft}
            ticketSearch={ticketSearch}
            tickets={state.tickets}
            updateTicketStatus={updateTicketStatus}
          />
        )}

        {activeSurface === "customers" && (
          <CustomersSurface
            customerDraft={customerDraft}
            customers={customers}
            editCustomer={editCustomer}
            editingCustomerId={editingCustomerId}
            isCustomerFormOpen={isCustomerFormOpen}
            saveCustomer={saveCustomer}
            setCustomerDraft={setCustomerDraft}
            setIsCustomerFormOpen={setIsCustomerFormOpen}
            toggleCustomerStatus={toggleCustomerStatus}
          />
        )}

        {activeSurface === "knowledge" && (
          <KnowledgeSurface
            articleDraft={articleDraft}
            articles={knowledgeArticles}
            isArticleDraftOpen={isArticleDraftOpen}
            knowledgeMode={knowledgeMode}
            knowledgeQuery={knowledgeQuery}
            saveArticleDraft={saveArticleDraft}
            selectedArticleId={selectedArticleId}
            setArticleDraft={setArticleDraft}
            setIsArticleDraftOpen={setIsArticleDraftOpen}
            setKnowledgeMode={setKnowledgeMode}
            setKnowledgeQuery={setKnowledgeQuery}
            setSelectedArticleId={setSelectedArticleId}
          />
        )}

        {activeSurface === "customer-site" && (
          <CustomerSiteSurface
            articles={portalArticles}
            botDecision={botDecision}
            botMessage={botMessage}
            portalQuery={portalQuery}
            requestAgent={requestAgent}
            setBotDecision={setBotDecision}
            setBotMessage={setBotMessage}
            setPortalQuery={setPortalQuery}
          />
        )}

        {activeSurface === "slas" && (
          <SlaSurface slaPolicy={slaPolicy} setSlaPolicy={setSlaPolicy} slaWallboard={slaWallboard} />
        )}

        {activeSurface === "reporting" && (
          <ReportingSurface channelCounts={channelCounts} ticketCount={state.tickets.length} />
        )}
      </main>
    </div>
  );
}

function LoginScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <main className="login-page">
      <section className="login-hero" aria-labelledby="login-heading">
        <div className="login-copy">
          <div className="brand-lockup">
            <div className="brand-mark">SH</div>
            <p className="eyebrow">Enterprise service management</p>
          </div>
          <h1 id="login-heading">Sign in to The Support Hub</h1>
          <p>Secure access for service teams, knowledge owners, managers, and future customer operations teams.</p>
        </div>
        <div className="login-panel">
          <LockKeyhole aria-hidden="true" size={28} />
          <h2>Workspace access</h2>
          <button className="microsoft-button" onClick={onSignIn} type="button">
            Continue with Microsoft
          </button>
          <p className="auth-note">Demo sign-in only. Real Microsoft challenge is not wired yet.</p>
          <div className="login-meta">
            <span>Single sign-on</span>
            <span>Role-based access</span>
            <span>Audit-ready sessions</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function TicketsSurface({
  addTicketNote,
  contactErrors,
  createTicket,
  customers,
  isTicketFormOpen,
  selectedTicketId,
  setIsTicketFormOpen,
  setSelectedTicketId,
  setTicketDraft,
  setTicketSearch,
  slaWallboard,
  startTicketWork,
  ticketDraft,
  ticketSearch,
  tickets,
  updateTicketStatus,
}: {
  addTicketNote: (ticketId: string, note: string) => void;
  contactErrors: { email: string; phone: string };
  createTicket: (event: FormEvent<HTMLFormElement>) => void;
  customers: CustomerAccount[];
  isTicketFormOpen: boolean;
  selectedTicketId: string | null;
  setIsTicketFormOpen: (value: boolean) => void;
  setSelectedTicketId: (value: string | null) => void;
  setTicketDraft: Dispatch<SetStateAction<typeof emptyTicket>>;
  setTicketSearch: (value: string) => void;
  slaWallboard: SlaWallboard;
  startTicketWork: (ticketId: string) => void;
  ticketDraft: typeof emptyTicket;
  ticketSearch: string;
  tickets: Ticket[];
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
}) {
  const filteredTickets = tickets.filter((ticket) => {
    const query = ticketSearch.trim().toLowerCase();
    if (!query) {
      return true;
    }
    return [
      ticket.id,
      ticket.summary,
      ticket.customer,
      ticket.contact,
      ticket.channel,
      ticket.priority,
      ticket.status,
      ticket.requestType,
      ticket.category,
      ticket.parentTicketId,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null;

  return (
    <section className="surface-grid">
      <div className="operations-panel queue-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Agent workspace</p>
            <h3>Live queue</h3>
          </div>
          <button className="primary-button" onClick={() => setIsTicketFormOpen(true)} type="button">
            New ticket
          </button>
        </div>

        {isTicketFormOpen && (
          <form className="ticket-form" onSubmit={createTicket}>
            <label>
              Customer
              <select
                onChange={(event) => setTicketDraft((ticket) => ({ ...ticket, customer: event.target.value }))}
                required
                value={ticketDraft.customer}
              >
                <option value="">Select customer</option>
                {customers.filter((customer) => customer.active).map((customer) => (
                  <option key={customer.id} value={customer.name}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contact name
              <input
                onChange={(event) => setTicketDraft((ticket) => ({ ...ticket, contactName: event.target.value }))}
                required
                value={ticketDraft.contactName}
              />
            </label>
            <label>
              Contact email
              <input
                onChange={(event) => setTicketDraft((ticket) => ({ ...ticket, contactEmail: event.target.value }))}
                required
                value={ticketDraft.contactEmail}
              />
              {contactErrors.email && <span className="field-error">{contactErrors.email}</span>}
            </label>
            <label>
              Country code
              <select
                onChange={(event) => setTicketDraft((ticket) => ({ ...ticket, countryCode: event.target.value }))}
                value={ticketDraft.countryCode}
              >
                <option value="+971">🇦🇪 UAE +971</option>
                <option value="+44">🇬🇧 UK +44</option>
                <option value="+1">🇺🇸 US +1</option>
                <option value="+966">🇸🇦 Saudi Arabia +966</option>
              </select>
            </label>
            <label>
              Contact phone
              <input
                onChange={(event) => setTicketDraft((ticket) => ({ ...ticket, contactPhone: event.target.value }))}
                required
                value={ticketDraft.contactPhone}
              />
              {contactErrors.phone && <span className="field-error">{contactErrors.phone}</span>}
            </label>
            <label className="span-2">
              Description
              <input
                onChange={(event) => setTicketDraft((ticket) => ({ ...ticket, summary: event.target.value }))}
                required
                value={ticketDraft.summary}
              />
            </label>
            <label>
              Record type
              <select
                onChange={(event) =>
                  setTicketDraft((ticket) => ({ ...ticket, requestType: event.target.value as RequestType }))
                }
                value={ticketDraft.requestType}
              >
                <option value="Incident">Incident</option>
                <option value="Service Request">Service Request</option>
                <option value="Question">Question</option>
                <option value="Service Review">Service Review</option>
                <option value="Problem">Problem</option>
              </select>
            </label>
            <label>
              Category
              <select
                onChange={(event) =>
                  setTicketDraft((ticket) => ({ ...ticket, category: event.target.value as TicketCategory }))
                }
                value={ticketDraft.category}
              >
                <option value="General">General</option>
                <option value="Access">Access</option>
                <option value="Billing">Billing</option>
                <option value="Service review">Service review</option>
                <option value="Knowledge">Knowledge</option>
              </select>
            </label>
            <label>
              Channel
              <select
                onChange={(event) =>
                  setTicketDraft((ticket) => ({ ...ticket, channel: event.target.value as SupportChannel }))
                }
                value={ticketDraft.channel}
              >
                <option value="Phone">Phone</option>
                <option value="Email">Email</option>
                <option value="Portal">Portal</option>
                <option value="Chat">Chat</option>
              </select>
            </label>
            <label>
              Impact
              <select
                onChange={(event) =>
                  setTicketDraft((ticket) => ({ ...ticket, impact: event.target.value as ImpactLevel }))
                }
                value={ticketDraft.impact}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
            <label>
              Urgency
              <select
                onChange={(event) =>
                  setTicketDraft((ticket) => ({ ...ticket, urgency: event.target.value as UrgencyLevel }))
                }
                value={ticketDraft.urgency}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
            <label>
              Group under parent ticket
              <select
                onChange={(event) => setTicketDraft((ticket) => ({ ...ticket, parentTicketId: event.target.value }))}
                value={ticketDraft.parentTicketId}
              >
                <option value="">No parent ticket</option>
                {tickets.map((ticket) => (
                  <option key={ticket.id} value={ticket.id}>
                    {ticket.id}
                  </option>
                ))}
              </select>
            </label>
            <div className="calculated-priority">
              <span>Calculated priority</span>
              <strong>{derivePriority(ticketDraft.impact, ticketDraft.urgency)}</strong>
            </div>
            <button className="primary-button" type="submit">
              Create ticket
            </button>
          </form>
        )}

        <label className="search-field ticket-search">
          <Search aria-hidden="true" size={18} />
          Search tickets
          <input
            onChange={(event) => setTicketSearch(event.target.value)}
            placeholder="Search by customer, summary, channel or priority"
            value={ticketSearch}
          />
        </label>

        <section aria-label="Agent ticket queue" className="queue-table">
          <div className="queue-header">
            <span>Summary</span>
            <span>Customer</span>
            <span>Type</span>
            <span>Channel</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Action</span>
          </div>
          {tickets.length === 0 ? (
            <div className="empty-state">No tickets yet.</div>
          ) : filteredTickets.length === 0 ? (
            <div className="empty-state">No tickets match that search.</div>
          ) : (
            filteredTickets.map((ticket) => (
              <div className="queue-row" key={ticket.id}>
                <strong>{ticket.summary}</strong>
                <span>{ticket.customer}</span>
                <span className="badge">{ticket.requestType}</span>
                <span className="badge">{ticket.channel}</span>
                <span className={`priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                <span>{ticket.status}</span>
                <button className="link-button" onClick={() => setSelectedTicketId(ticket.id)} type="button">
                  Open {ticket.id}
                </button>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="operations-panel side-panel">
        <h3>SLA risk</h3>
        <div className={`sla-wallboard ${slaWallboard.tone}`}>
          <strong>{slaWallboard.label}</strong>
          <span>{slaWallboard.detail}</span>
        </div>
        <Metric label="Breaching" value={String(slaWallboard.breaching)} />
        <Metric label="Due soon" value={String(slaWallboard.dueSoon)} />
        <Metric label="All good" value={String(slaWallboard.healthy)} />
      </div>

      {selectedTicket && (
        <TicketDetail
          addTicketNote={(note) => addTicketNote(selectedTicket.id, note)}
          startTicketWork={() => startTicketWork(selectedTicket.id)}
          ticket={selectedTicket}
          updateTicketStatus={(status) => updateTicketStatus(selectedTicket.id, status)}
        />
      )}
    </section>
  );
}

function TicketDetail({
  addTicketNote,
  startTicketWork,
  ticket,
  updateTicketStatus,
}: {
  addTicketNote: (note: string) => void;
  startTicketWork: () => void;
  ticket: Ticket;
  updateTicketStatus: (status: TicketStatus) => void;
}) {
  const [noteDraft, setNoteDraft] = useState("");

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addTicketNote(noteDraft);
    setNoteDraft("");
  }

  return (
    <section aria-label="Ticket detail" className="operations-panel ticket-detail">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">{ticket.id}</p>
          <h3>{ticket.summary}</h3>
        </div>
        <span className="badge">{openDuration(ticket.createdAt)}</span>
      </div>
      <div className="detail-grid">
        <div>
          <span>Customer</span>
          <strong>{ticket.customer}</strong>
        </div>
        <div>
          <span>Contact</span>
          <strong>{ticket.contact}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{ticket.contactEmail}</strong>
        </div>
        <div>
          <span>Phone</span>
          <strong>{ticket.contactPhone}</strong>
        </div>
        <div>
          <span>Record type</span>
          <strong>{ticket.requestType}</strong>
        </div>
        <div>
          <span>Category</span>
          <strong>{ticket.category}</strong>
        </div>
        <div>
          <span>Impact / urgency</span>
          <strong>{`${ticket.impact} / ${ticket.urgency}`}</strong>
        </div>
        <div>
          <span>Problem review</span>
          <strong>{ticket.problemCandidate ? "Problem candidate" : "No problem signal"}</strong>
        </div>
        {ticket.parentTicketId && (
          <div>
            <span>Group</span>
            <strong>Grouped under {ticket.parentTicketId}</strong>
          </div>
        )}
      </div>
      <label>
        Ticket status
        <select onChange={(event) => updateTicketStatus(event.target.value as TicketStatus)} value={ticket.status}>
          <option value="New">New</option>
          <option value="Open">Open</option>
          <option value="Pending">Pending</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </label>
      <div className="detail-actions">
        <button className="primary-button" disabled={ticket.status !== "New"} onClick={startTicketWork} type="button">
          Start work
        </button>
        <span>New changes to Open when an agent starts work. SLA risk is still time-driven.</span>
      </div>
      <form className="ticket-note-form" onSubmit={saveNote}>
        <label>
          Add ticket update
          <textarea
            onChange={(event) => setNoteDraft(event.target.value)}
            rows={3}
            value={noteDraft}
          />
        </label>
        <button className="secondary-button" disabled={noteDraft.trim().length === 0} type="submit">
          Add update
        </button>
      </form>
      <div className="timeline">
        <h4>Timeline</h4>
        {ticket.timeline.map((entry, index) => (
          <div className="timeline-entry" key={`${entry.message}-${entry.createdAt}-${index}`}>
            <time aria-label="Timeline timestamp" dateTime={entry.createdAt}>
              {formatTimelineTime(entry.createdAt)}
            </time>
            <span>{entry.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CustomersSurface({
  customerDraft,
  customers,
  editCustomer,
  editingCustomerId,
  isCustomerFormOpen,
  saveCustomer,
  setCustomerDraft,
  setIsCustomerFormOpen,
  toggleCustomerStatus,
}: {
  customerDraft: typeof emptyCustomerDraft;
  customers: CustomerAccount[];
  editCustomer: (customer: CustomerAccount) => void;
  editingCustomerId: string | null;
  isCustomerFormOpen: boolean;
  saveCustomer: (event: FormEvent<HTMLFormElement>) => void;
  setCustomerDraft: Dispatch<SetStateAction<typeof emptyCustomerDraft>>;
  setIsCustomerFormOpen: (value: boolean) => void;
  toggleCustomerStatus: (customerId: string) => void;
}) {
  return (
    <section className="surface-grid">
      <div className="operations-panel queue-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CRM foundation</p>
            <h3>Customer management</h3>
          </div>
          <button
            className="primary-button"
            onClick={() => {
              setIsCustomerFormOpen(true);
            }}
            type="button"
          >
            Add customer
          </button>
        </div>
        {isCustomerFormOpen && (
          <form className="ticket-form" onSubmit={saveCustomer}>
            <h3 className="span-2">{editingCustomerId ? "Edit customer" : "Add customer"}</h3>
            <label>
              Customer name
              <input
                onChange={(event) => setCustomerDraft((draft) => ({ ...draft, name: event.target.value }))}
                required
                value={customerDraft.name}
              />
            </label>
            <label>
              Primary contact
              <input
                onChange={(event) => setCustomerDraft((draft) => ({ ...draft, primaryContact: event.target.value }))}
                required
                value={customerDraft.primaryContact}
              />
            </label>
            <label>
              Customer email
              <input
                onChange={(event) => setCustomerDraft((draft) => ({ ...draft, email: event.target.value }))}
                required
                type="email"
                value={customerDraft.email}
              />
            </label>
            <button className="primary-button" type="submit">
              Save customer
            </button>
          </form>
        )}
        <section aria-label="Customer accounts" className="customer-table">
          <div className="customer-header">
            <span>Customer</span>
            <span>Primary contact</span>
            <span>Email</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {customers.map((customer) => (
            <div className="customer-row" key={customer.id}>
              <strong>{customer.name}</strong>
              <span>{customer.primaryContact}</span>
              <span>{customer.email}</span>
              <span className={`status-badge ${customer.active ? "active" : "inactive"}`}>
                {customer.active ? "Active" : "Inactive"}
              </span>
              <div className="row-actions">
                <button
                  aria-label={`Edit ${customer.name}`}
                  className="icon-button"
                  data-tooltip="Edit customer"
                  onClick={() => editCustomer(customer)}
                  type="button"
                >
                  <Edit3 aria-hidden="true" size={17} />
                </button>
                <button
                  aria-label={`${customer.active ? "Disable" : "Enable"} ${customer.name}`}
                  className="icon-button"
                  data-tooltip={customer.active ? "Disable customer" : "Enable customer"}
                  onClick={() => toggleCustomerStatus(customer.id)}
                  type="button"
                >
                  {customer.active ? <Ban aria-hidden="true" size={17} /> : <RotateCcw aria-hidden="true" size={17} />}
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
      <aside className="operations-panel side-panel">
        <h3>Customer data</h3>
        <Metric label="Managed customers" value={String(customers.length)} />
        <Metric label="CRM depth" value="MVP" />
      </aside>
    </section>
  );
}

function KnowledgeSurface({
  articleDraft,
  articles,
  isArticleDraftOpen,
  knowledgeMode,
  knowledgeQuery,
  saveArticleDraft,
  selectedArticleId,
  setArticleDraft,
  setIsArticleDraftOpen,
  setKnowledgeMode,
  setKnowledgeQuery,
  setSelectedArticleId,
}: {
  articleDraft: typeof emptyArticleDraft;
  articles: KnowledgeArticle[];
  isArticleDraftOpen: boolean;
  knowledgeMode: "library" | "low-helpfulness";
  knowledgeQuery: string;
  saveArticleDraft: (event: FormEvent<HTMLFormElement>) => void;
  selectedArticleId: string | null;
  setArticleDraft: Dispatch<SetStateAction<typeof emptyArticleDraft>>;
  setIsArticleDraftOpen: (value: boolean) => void;
  setKnowledgeMode: (value: "library" | "low-helpfulness") => void;
  setKnowledgeQuery: (value: string) => void;
  setSelectedArticleId: (value: string | null) => void;
}) {
  const lowHelpfulnessArticles = articles.filter((article) => article.id === "KB-001");
  const selectedArticle = articles.find((article) => article.id === selectedArticleId);

  return (
    <section className="knowledge-layout">
      <div className="operations-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Knowledge hub</p>
            <h3>Article library</h3>
          </div>
          <button className="secondary-button" onClick={() => setIsArticleDraftOpen(true)} type="button">
            Draft article
          </button>
        </div>
        {isArticleDraftOpen && (
          <form className="ticket-form" onSubmit={saveArticleDraft}>
            <h3 className="span-2">Draft knowledge article</h3>
            <label>
              Article title
              <input
                onChange={(event) => setArticleDraft((draft) => ({ ...draft, title: event.target.value }))}
                required
                value={articleDraft.title}
              />
            </label>
            <label>
              Article summary
              <input
                onChange={(event) => setArticleDraft((draft) => ({ ...draft, summary: event.target.value }))}
                required
                value={articleDraft.summary}
              />
            </label>
            <button className="primary-button" type="submit">
              Save draft
            </button>
          </form>
        )}
        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          Search knowledge
          <input
            onChange={(event) => setKnowledgeQuery(event.target.value)}
            placeholder="Search published articles"
            value={knowledgeQuery}
          />
        </label>
        {knowledgeMode === "library" ? (
          <ArticleResults articles={articles} />
        ) : (
          <section className="review-panel">
            <h3>Low-helpfulness articles</h3>
            {lowHelpfulnessArticles.map((article) => (
              <article className="recommendation-card" key={article.id}>
                <h4>{article.title}</h4>
                <p>Clarify the reset steps and add troubleshooting checks before escalation.</p>
                <button className="secondary-button" onClick={() => setSelectedArticleId(article.id)} type="button">
                  Review {article.title}
                </button>
              </article>
            ))}
          </section>
        )}
        {selectedArticle && (
          <section className="article-editor">
            <h3>Edit article</h3>
            <label>
              Article title
              <input readOnly value={selectedArticle.title} />
            </label>
            <label>
              AI recommendation
              <textarea
                readOnly
                rows={4}
                value="Clarify the reset steps, add screenshots, list common failure reasons, and include when to contact support."
              />
            </label>
          </section>
        )}
      </div>
      <aside className="operations-panel side-panel">
        <h3>Knowledge gaps</h3>
        <Metric label="Repeated questions" value="18" />
        <button
          aria-label="Low-helpfulness articles"
          className="metric metric-button"
          onClick={() => setKnowledgeMode("low-helpfulness")}
          type="button"
        >
          <span>Low-helpfulness articles</span>
          <strong>5</strong>
        </button>
        <Metric label="Drafts awaiting review" value="9" />
      </aside>
    </section>
  );
}

function CustomerSiteSurface({
  articles,
  botDecision,
  botMessage,
  portalQuery,
  requestAgent,
  setBotDecision,
  setBotMessage,
  setPortalQuery,
}: {
  articles: KnowledgeArticle[];
  botDecision: BotDecision | null;
  botMessage: string;
  portalQuery: string;
  requestAgent: () => void;
  setBotDecision: (value: BotDecision | null) => void;
  setBotMessage: (value: string) => void;
  setPortalQuery: (value: string) => void;
}) {
  return (
    <section className="customer-site" aria-labelledby="customer-site-heading">
      <header className="customer-hero">
        <div>
          <p className="eyebrow">Customer support website</p>
          <h2 id="customer-site-heading">Hadley Advisory Support</h2>
          <p>Search service guidance, check active requests, or ask for help.</p>
        </div>
        <div className="portal-status">
          <CheckCircle2 aria-hidden="true" size={18} />
          Client access active
        </div>
      </header>
      <div className="customer-grid">
        <div className="portal-search operations-panel">
          <label className="search-field">
            <Search aria-hidden="true" size={18} />
            Search knowledge
            <input
              onChange={(event) => setPortalQuery(event.target.value)}
              placeholder="Search support articles"
              value={portalQuery}
            />
          </label>
          <ArticleResults articles={articles} />
        </div>
        <div className="operations-panel bot-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Assistant</p>
              <h3>Service concierge</h3>
            </div>
            <MessageSquareText aria-hidden="true" size={22} />
          </div>
          <label>
            Ask the support bot
            <textarea
              onChange={(event) => {
                setBotMessage(event.target.value);
                setBotDecision(null);
              }}
              rows={6}
              value={botMessage}
            />
          </label>
          <button
            className="primary-button"
            disabled={botMessage.trim().length === 0}
            onClick={requestAgent}
            type="button"
          >
            Ask to speak to an agent
          </button>
          {botDecision && <p className={`bot-decision ${botDecision.outcome}`}>{botDecision.message}</p>}
        </div>
      </div>
    </section>
  );
}

function SlaSurface({
  setSlaPolicy,
  slaPolicy,
  slaWallboard,
}: {
  setSlaPolicy: (value: { firstResponseHours: number; name: string; resolutionHours: number }) => void;
  slaPolicy: { firstResponseHours: number; name: string; resolutionHours: number };
  slaWallboard: SlaWallboard;
}) {
  return (
    <section className="surface-grid">
      <div className="operations-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Service levels</p>
            <h3>SLA policies</h3>
          </div>
          <span className={`status-pill ${slaWallboard.tone}`}>{slaWallboard.label}</span>
        </div>
        <form className="ticket-form sla-form">
          <label className="span-2">
            Policy name
            <input onChange={(event) => setSlaPolicy({ ...slaPolicy, name: event.target.value })} value={slaPolicy.name} />
          </label>
          <label>
            First response target
            <input
              min={1}
              onChange={(event) => setSlaPolicy({ ...slaPolicy, firstResponseHours: Number(event.target.value) })}
              type="number"
              value={slaPolicy.firstResponseHours}
            />
          </label>
          <label>
            Resolution target
            <input
              min={1}
              onChange={(event) => setSlaPolicy({ ...slaPolicy, resolutionHours: Number(event.target.value) })}
              type="number"
              value={slaPolicy.resolutionHours}
            />
          </label>
        </form>
      </div>
      <div className="operations-panel side-panel">
        <h3>Wallboard preview</h3>
        <div className={`sla-wallboard ${slaWallboard.tone}`}>
          <strong>{slaWallboard.label}</strong>
          <span>{slaWallboard.detail}</span>
        </div>
      </div>
    </section>
  );
}

function ReportingSurface({
  channelCounts,
  ticketCount,
}: {
  channelCounts: Array<{ channel: string; count: number }>;
  ticketCount: number;
}) {
  return (
    <section className="reporting-grid">
      <div className="metric-card">
        <LayoutDashboard aria-hidden="true" size={22} />
        <Metric label="Open tickets" value={String(ticketCount)} />
      </div>
      <div className="metric-card">
        <Metric label="SLA compliance" value="94%" />
      </div>
      <div className="metric-card">
        <Metric label="Self-service rate" value="31%" />
      </div>
      <section className="operations-panel reporting-panel">
        <h3>Tickets by channel</h3>
        {channelCounts.length === 0 ? (
          <div className="empty-state">No ticket volume yet.</div>
        ) : (
          channelCounts.map((item) => (
            <div className="report-row" key={item.channel}>
              <span>{item.channel}</span>
              <strong>{`${item.count} ${item.count === 1 ? "ticket" : "tickets"}`}</strong>
            </div>
          ))
        )}
      </section>
    </section>
  );
}

function ArticleResults({ articles }: { articles: KnowledgeArticle[] }) {
  if (articles.length === 0) {
    return <div className="empty-state">No articles match that search.</div>;
  }
  return (
    <div className="article-list">
      {articles.map((article) => (
        <article aria-label={article.title} className="article-row" key={article.id}>
          <BookOpen aria-hidden="true" size={20} />
          <div>
            <h4>{article.title}</h4>
            <p>{article.summary}</p>
          </div>
          <span className="badge">{article.status}</span>
        </article>
      ))}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function surfaceTitle(surface: Surface): string {
  const titles: Record<Surface, string> = {
    customers: "Customers",
    "customer-site": "Customer website",
    knowledge: "Knowledge management",
    reporting: "Management reporting",
    slas: "SLA configuration",
    tickets: "Ticket operations",
  };
  return titles[surface];
}

type SlaWallboard = {
  breaching: number;
  detail: string;
  dueSoon: number;
  healthy: number;
  label: string;
  tone: "green" | "amber" | "red";
};

function getSlaWallboard(tickets: Ticket[]): SlaWallboard {
  const breaching = tickets.filter((ticket) => ticket.priority === "P1").length;
  const dueSoon = tickets.filter((ticket) => ticket.priority === "P2").length;
  const healthy = tickets.filter((ticket) => ticket.priority === "P3" || ticket.priority === "P4").length;
  if (breaching > 0) {
    return {
      breaching,
      detail: "Immediate action required on breached high-priority work.",
      dueSoon,
      healthy,
      label: "Breaching",
      tone: "red",
    };
  }
  if (dueSoon > 0) {
    return {
      breaching,
      detail: "Some tickets are approaching their SLA target.",
      dueSoon,
      healthy,
      label: "Due soon",
      tone: "amber",
    };
  }
  return {
    breaching,
    detail: tickets.length === 0 ? "No open tickets are at risk." : "All open tickets are inside SLA.",
    dueSoon,
    healthy,
    label: "All clear",
    tone: "green",
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function toE164Phone(countryCode: string, localNumber: string): string | null {
  const normalizedCountryCode = countryCode.replace(/[^\d+]/g, "");
  const normalizedLocal = localNumber.replace(/\D/g, "").replace(/^0+/, "");
  const e164 = `${normalizedCountryCode}${normalizedLocal}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

function createTimelineEntry(message: string): TimelineEntry {
  return {
    message,
    createdAt: new Date().toISOString(),
  };
}

function formatTimelineTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function openDuration(createdAt: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 1) {
    return "Open for less than a minute";
  }
  if (minutes === 1) {
    return "Open for 1 minute";
  }
  return `Open for ${minutes} minutes`;
}

export default App;
