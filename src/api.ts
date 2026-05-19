// Typed API client — talks to the Fastify backend
// BASE is always empty — the browser uses same-origin paths and Nginx
// proxies /api/ to the internal api container. No env var needed.

const BASE = "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  department: string | null;
  location: string | null;
  created_at: string;
};

export type Ticket = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  contact_name: string | null;
  summary: string;
  channel: string;
  priority: string;
  status: string;
  category: string | null;
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
  status: "Draft" | "Published" | "Archived";
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

export type ArticleSuggestion = {
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
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
  list: (params?: { status?: string; priority?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return request<Ticket[]>(`/api/v1/tickets${q ? `?${q}` : ""}`);
  },
  create: (data: {
    customerName: string;
    customerId?: string;
    summary: string;
    channel: string;
    priority: string;
    category?: string;
  }) => request<Ticket>("/api/v1/tickets", { method: "POST", body: JSON.stringify(data) }),
  updateStatus: (id: string, status: string) =>
    request<Ticket>(`/api/v1/tickets/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};

// ─── Articles ─────────────────────────────────────────────────────────────────

export const articlesApi = {
  list: (params?: { status?: string; search?: string }) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
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
