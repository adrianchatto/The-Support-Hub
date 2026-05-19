import { FormEvent, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  Headphones,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Search,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import {
  addTicket,
  createInitialState,
  getChannelCounts,
  resolveCustomerAgentRequest,
  searchPublishedArticles,
} from "./domain/supportHub";
import type { BotDecision, KnowledgeArticle, TicketPriority } from "./domain/supportHub";
import "./App.css";

type Surface = "tickets" | "knowledge" | "customer-site" | "reporting";

const surfaces: Array<{ id: Surface; label: string; icon: typeof Ticket }> = [
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "customer-site", label: "Customer site", icon: Headphones },
  { id: "reporting", label: "Reporting", icon: BarChart3 },
];

const emptyPhoneTicket = {
  customer: "",
  contact: "",
  summary: "",
  priority: "P3" as TicketPriority,
};

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [activeSurface, setActiveSurface] = useState<Surface>("tickets");
  const [state, setState] = useState(() => createInitialState());
  const [isPhoneFormOpen, setIsPhoneFormOpen] = useState(false);
  const [phoneTicket, setPhoneTicket] = useState(emptyPhoneTicket);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [portalQuery, setPortalQuery] = useState("");
  const [botMessage, setBotMessage] = useState("");
  const [botDecision, setBotDecision] = useState<BotDecision | null>(null);

  const portalArticles = useMemo(
    () => searchPublishedArticles(state, portalQuery),
    [portalQuery, state],
  );
  const knowledgeArticles = useMemo(
    () => searchPublishedArticles(state, knowledgeQuery || "password"),
    [knowledgeQuery, state],
  );
  const channelCounts = useMemo(() => getChannelCounts(state), [state]);

  function createPhoneTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((currentState) =>
      addTicket(currentState, {
        channel: "Phone",
        customer: phoneTicket.customer,
        contact: phoneTicket.contact,
        summary: phoneTicket.summary,
        priority: phoneTicket.priority,
      }),
    );
    setPhoneTicket(emptyPhoneTicket);
    setIsPhoneFormOpen(false);
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
            <p className="eyebrow">Dubai service desk pilot</p>
            <h2>{surfaceTitle(activeSurface)}</h2>
          </div>
          <div className="topbar-actions">
            <span className="status-pill">SLA risk: 2 watched</span>
            <span className="status-pill">
              <span>Knowledge gaps</span>
              <strong>4</strong>
            </span>
          </div>
        </header>

        {activeSurface === "tickets" && (
          <TicketsSurface
            createPhoneTicket={createPhoneTicket}
            isPhoneFormOpen={isPhoneFormOpen}
            phoneTicket={phoneTicket}
            setIsPhoneFormOpen={setIsPhoneFormOpen}
            setPhoneTicket={setPhoneTicket}
            tickets={state.tickets}
          />
        )}

        {activeSurface === "knowledge" && (
          <KnowledgeSurface
            articles={knowledgeArticles}
            knowledgeQuery={knowledgeQuery}
            setKnowledgeQuery={setKnowledgeQuery}
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
          <p>
            Secure access for service teams, knowledge owners, managers, and future customer
            operations teams.
          </p>
        </div>
        <div className="login-panel">
          <LockKeyhole aria-hidden="true" size={28} />
          <h2>Workspace access</h2>
          <button className="microsoft-button" onClick={onSignIn} type="button">
            Continue with Microsoft
          </button>
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
  createPhoneTicket,
  isPhoneFormOpen,
  phoneTicket,
  setIsPhoneFormOpen,
  setPhoneTicket,
  tickets,
}: {
  createPhoneTicket: (event: FormEvent<HTMLFormElement>) => void;
  isPhoneFormOpen: boolean;
  phoneTicket: typeof emptyPhoneTicket;
  setIsPhoneFormOpen: (value: boolean) => void;
  setPhoneTicket: (value: typeof emptyPhoneTicket | ((value: typeof emptyPhoneTicket) => typeof emptyPhoneTicket)) => void;
  tickets: ReturnType<typeof createInitialState>["tickets"];
}) {
  return (
    <section className="surface-grid">
      <div className="operations-panel queue-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Agent workspace</p>
            <h3>Live queue</h3>
          </div>
          <button className="primary-button" onClick={() => setIsPhoneFormOpen(true)} type="button">
            New phone ticket
          </button>
        </div>

        {isPhoneFormOpen && (
          <form className="ticket-form" onSubmit={createPhoneTicket}>
            <label>
              Customer
              <input
                onChange={(event) =>
                  setPhoneTicket((ticket) => ({ ...ticket, customer: event.target.value }))
                }
                required
                value={phoneTicket.customer}
              />
            </label>
            <label>
              Contact
              <input
                onChange={(event) =>
                  setPhoneTicket((ticket) => ({ ...ticket, contact: event.target.value }))
                }
                required
                value={phoneTicket.contact}
              />
            </label>
            <label className="span-2">
              Issue summary
              <input
                onChange={(event) =>
                  setPhoneTicket((ticket) => ({ ...ticket, summary: event.target.value }))
                }
                required
                value={phoneTicket.summary}
              />
            </label>
            <label>
              Priority
              <select
                onChange={(event) =>
                  setPhoneTicket((ticket) => ({
                    ...ticket,
                    priority: event.target.value as TicketPriority,
                  }))
                }
                value={phoneTicket.priority}
              >
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
                <option value="P4">P4</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              Create ticket
            </button>
          </form>
        )}

        <section aria-label="Agent ticket queue" className="queue-table">
          <div className="queue-header">
            <span>Summary</span>
            <span>Customer</span>
            <span>Channel</span>
            <span>Priority</span>
            <span>Status</span>
          </div>
          {tickets.length === 0 ? (
            <div className="empty-state">No active tickets yet.</div>
          ) : (
            tickets.map((ticket) => (
              <div className="queue-row" key={ticket.id}>
                <strong>{ticket.summary}</strong>
                <span>{ticket.customer}</span>
                <span className="badge">{ticket.channel}</span>
                <span className={`priority ${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
                <span>{ticket.status}</span>
              </div>
            ))
          )}
        </section>
      </div>

      <div className="operations-panel side-panel">
        <h3>SLA risk</h3>
        <Metric label="Due soon" value="2" />
        <Metric label="Awaiting customer" value="7" />
        <Metric label="Unassigned" value="3" />
      </div>
    </section>
  );
}

function KnowledgeSurface({
  articles,
  knowledgeQuery,
  setKnowledgeQuery,
}: {
  articles: KnowledgeArticle[];
  knowledgeQuery: string;
  setKnowledgeQuery: (value: string) => void;
}) {
  return (
    <section className="knowledge-layout">
      <div className="operations-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Knowledge hub</p>
            <h3>Article library</h3>
          </div>
          <button className="secondary-button" type="button">
            Draft article
          </button>
        </div>
        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          Search knowledge
          <input
            onChange={(event) => setKnowledgeQuery(event.target.value)}
            placeholder="Search published articles"
            value={knowledgeQuery}
          />
        </label>
        <ArticleResults articles={articles} />
      </div>
      <aside className="operations-panel side-panel">
        <h3>Knowledge gaps</h3>
        <Metric label="Repeated questions" value="18" />
        <Metric label="Low-helpfulness articles" value="5" />
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
    tickets: "Ticket operations",
    knowledge: "Knowledge management",
    "customer-site": "Customer website",
    reporting: "Management reporting",
  };

  return titles[surface];
}

export default App;
