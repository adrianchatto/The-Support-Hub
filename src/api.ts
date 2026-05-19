// Typed API client — talks to the Fastify backend
// BASE is always empty — the browser uses same-origin paths and Nginx
// proxies /api/ to the internal api container. No env var needed.

const BASE = "";
const TOKEN_KEY = "support_hub_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers: { ...headers, ...init?.headers },
    ...init,
  });

  // Force re-login on auth failure
  if (res.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error("Session expired — please log in again");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // If the response is HTML (proxy error page, 502, etc.) don't show raw markup
    if (text.trimStart().startsWith("<")) {
      const labels: Record<number, string> = {
        502: "The server is unavailable (502). Check that the API is running and JWT_SECRET is set in Coolify.",
        503: "Service temporarily unavailable (503). Try again in a moment.",
        504: "Gateway timeout (504). The API took too long to respond.",
      };
      throw new Error(labels[res.status] ?? `Server error (${res.status}). Check deployment logs.`);
    }
    // Try to parse a JSON error message
    let errorMessage = text || `${res.status} error`;
    try {
      const json = JSON.parse(text);
      errorMessage = json.error ?? json.message ?? errorMessage;
    } catch {
      // text is not JSON — use it as-is
    }
    throw new Error(errorMessage);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "agent" | "supervisor" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team_id: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  department: string | null;
  location: string | null;
  created_at: string;
};

export type TicketType = "incident" | "service_request" | "question";

export type Ticket = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  contact_name: string | null;
  summary: string;
  channel: string;
  priority: string;
  status: string;
  ticket_type: TicketType;
  category: string | null;
  assigned_agent_id: string | null;
  problem_id: string | null;
  first_response_due_at: string | null;
  resolution_due_at: string | null;
  created_at: string;
};

export type Article = {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: string | null;
  tags: string[];
  audience: string;
  status: "Draft" | "Pending Review" | "Published" | "Archived";
  created_at: string;
  updated_at: string;
};

export type SlaPolicy = {
  id: string;
  name: string;
  priority: string;
  category: string | null;
  first_response_minutes: number;
  resolution_minutes: number;
};

export type SlaCompliance = {
  total: number;
  green: number;
  amber: number;
  red: number;
  none: number;
  compliance_pct: number;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_name: string;
  body: string;
  visibility: "internal" | "customer";
  created_at: string;
};

export type ArticleSuggestion = {
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
};

export type ProblemStatus = "Open" | "Under Investigation" | "Resolved" | "Closed";

export type Problem = {
  id: string;
  title: string;
  description: string | null;
  status: ProblemStatus;
  created_at: string;
  updated_at: string;
};

export type ProblemTicket = {
  id: string;
  summary: string;
  status: string;
  priority: string;
  customer_name: string;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: AuthUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<AuthUser>("/api/v1/auth/me"),
};

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersApi = {
  list: ()                        => request<User[]>("/api/v1/users"),
  agents: ()                      => request<User[]>("/api/v1/users/agents"),
  get: (id: string)               => request<User>(`/api/v1/users/${id}`),
  create: (data: {
    email: string; name: string; role: UserRole; password: string; teamId?: string;
  })                              => request<User>("/api/v1/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: {
    name?: string; role?: UserRole; password?: string; teamId?: string | null;
  })                              => request<User>(`/api/v1/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string)            => request<void>(`/api/v1/users/${id}`, { method: "DELETE" }),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export const customersApi = {
  list: (search?: string) =>
    request<Customer[]>(`/api/v1/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  get: (id: string) => request<Customer>(`/api/v1/customers/${id}`),
  create: (data: Partial<Customer>) =>
    request<Customer>("/api/v1/customers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Customer>) =>
    request<Customer>(`/api/v1/customers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/v1/customers/${id}`, { method: "DELETE" }),
};

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const ticketsApi = {
  list: (params?: { status?: string; priority?: string; ticketType?: string }) => {
    const cleaned = Object.fromEntries(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const q = new URLSearchParams(cleaned).toString();
    return request<Ticket[]>(`/api/v1/tickets${q ? `?${q}` : ""}`);
  },
  create: (data: {
    customerName: string;
    customerId?: string;
    summary: string;
    channel: string;
    priority: string;
    ticketType?: TicketType;
    category?: string;
  }) => request<Ticket>("/api/v1/tickets", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request<Ticket>(`/api/v1/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  assign: (id: string, agentId: string) =>
    request<Ticket>(`/api/v1/tickets/${id}/assign`, { method: "PATCH", body: JSON.stringify({ agentId }) }),
  getMessages: (id: string) =>
    request<TicketMessage[]>(`/api/v1/tickets/${id}/messages`),
  addMessage: (id: string, data: { authorName: string; body: string; visibility: "internal" | "customer" }) =>
    request<TicketMessage>(`/api/v1/tickets/${id}/messages`, { method: "POST", body: JSON.stringify(data) }),
};

// ─── Problems ─────────────────────────────────────────────────────────────────

export const problemsApi = {
  list: () => request<Problem[]>("/api/v1/problems"),
  get: (id: string) => request<Problem>(`/api/v1/problems/${id}`),
  create: (data: { title: string; description?: string }) =>
    request<Problem>("/api/v1/problems", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; description?: string; status?: ProblemStatus }) =>
    request<Problem>(`/api/v1/problems/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/v1/problems/${id}`, { method: "DELETE" }),
  tickets: (id: string) => request<ProblemTicket[]>(`/api/v1/problems/${id}/tickets`),
  linkTicket: (problemId: string, ticketId: string) =>
    request<void>(`/api/v1/problems/${problemId}/link`, { method: "POST", body: JSON.stringify({ ticketId }) }),
  unlinkTicket: (problemId: string, ticketId: string) =>
    request<void>(`/api/v1/problems/${problemId}/link/${ticketId}`, { method: "DELETE" }),
};

// ─── Articles ─────────────────────────────────────────────────────────────────

export const articlesApi = {
  list: (params?: { status?: string; search?: string }) => {
    const cleaned = Object.fromEntries(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== "")
    );
    const q = new URLSearchParams(cleaned).toString();
    return request<Article[]>(`/api/v1/articles${q ? `?${q}` : ""}`);
  },
  get: (id: string) => request<Article>(`/api/v1/articles/${id}`),
  create: (data: Partial<Article>) =>
    request<Article>("/api/v1/articles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Article>) =>
    request<Article>(`/api/v1/articles/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  publish: (id: string) =>
    request<Article>(`/api/v1/articles/${id}/publish`, { method: "POST" }),
  archive: (id: string) =>
    request<Article>(`/api/v1/articles/${id}/archive`, { method: "POST" }),
  delete: (id: string) => request<void>(`/api/v1/articles/${id}`, { method: "DELETE" }),
  submitForReview: (id: string) =>
    request<Article>(`/api/v1/articles/${id}/submit-for-review`, { method: "POST" }),
  reject: (id: string) =>
    request<Article>(`/api/v1/articles/${id}/reject`, { method: "POST" }),
  suggest: (conversationSummary: string) =>
    request<ArticleSuggestion>("/api/v1/articles/suggest", {
      method: "POST",
      body: JSON.stringify({ conversationSummary }),
    }),
};

// ─── SLA policies ─────────────────────────────────────────────────────────────

export const slaApi = {
  list: () => request<SlaPolicy[]>("/api/v1/sla-policies"),
  compliance: () => request<SlaCompliance>("/api/v1/sla-policies/compliance"),
  upsert: (data: {
    name: string;
    priority: string;
    category?: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
  }) => request<SlaPolicy>("/api/v1/sla-policies", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/api/v1/sla-policies/${id}`, { method: "DELETE" }),
};
