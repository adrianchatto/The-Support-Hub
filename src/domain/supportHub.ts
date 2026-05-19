export type SupportChannel = "Email" | "Phone" | "Chat" | "Portal";

export type TicketPriority = "P1" | "P2" | "P3" | "P4";

export type TicketStatus = "New" | "Open" | "Pending" | "Resolved" | "Closed";

export type KnowledgeArticleAudience = "Customer" | "Internal";

export type KnowledgeArticleStatus = "Draft" | "Published";

export type Ticket = {
  id: string;
  channel: SupportChannel;
  customer: string;
  contact?: string;
  summary: string;
  priority: TicketPriority;
  status: TicketStatus;
  linkedArticleIds: string[];
};

export type KnowledgeArticle = {
  id: string;
  title: string;
  summary: string;
  body: string;
  audience: KnowledgeArticleAudience;
  status: KnowledgeArticleStatus;
};

export type ReportingEvent = {
  type: "ticket.created" | "chat.answered" | "chat.escalated";
  ticketId: string;
  channel: SupportChannel;
  customer: string;
};

export type SupportHubState = {
  tickets: Ticket[];
  articles: KnowledgeArticle[];
  events: ReportingEvent[];
};

export type AddTicketInput = {
  channel: SupportChannel;
  customer: string;
  contact?: string;
  summary: string;
  priority: TicketPriority;
  linkedArticleIds?: string[];
};

export type EscalateChatInput = {
  customer: string;
  message: string;
  suggestedArticleIds: string[];
};

export type ResolveCustomerAgentRequestInput = {
  customer: string;
  message: string;
};

export type BotDecision =
  | {
      outcome: "answered";
      articleId: string;
      message: string;
    }
  | {
      outcome: "ticket_created";
      ticketId: string;
      message: string;
    };

export type BotResolution = SupportHubState & {
  botDecision: BotDecision;
};

export type ChannelCount = {
  channel: SupportChannel;
  count: number;
};

const TICKET_ID_START = 1001;

export function createInitialState(): SupportHubState {
  return {
    tickets: [],
    articles: [
      {
        id: "KB-001",
        title: "Reset your portal password",
        summary: "Recover portal access with the approved password reset flow.",
        body: "Use the password reset flow from the portal sign-in page to regain account access.",
        audience: "Customer",
        status: "Published",
      },
      {
        id: "KB-002",
        title: "Internal escalation routing",
        summary: "Internal-only guidance for routing complex access incidents.",
        body: "Internal playbook for routing complex account access incidents.",
        audience: "Internal",
        status: "Published",
      },
    ],
    events: [],
  };
}

export function addTicket(state: SupportHubState, input: AddTicketInput): SupportHubState {
  const ticket: Ticket = {
    id: nextTicketId(state),
    channel: input.channel,
    customer: input.customer,
    contact: input.contact,
    summary: input.summary,
    priority: input.priority,
    status: "New",
    linkedArticleIds: input.linkedArticleIds ?? [],
  };

  return {
    ...state,
    tickets: [...state.tickets, ticket],
    events: [
      ...state.events,
      {
        type: "ticket.created",
        ticketId: ticket.id,
        channel: ticket.channel,
        customer: ticket.customer,
      },
    ],
  };
}

export function escalateChatToTicket(
  state: SupportHubState,
  input: EscalateChatInput,
): SupportHubState {
  const ticket: Ticket = {
    id: nextTicketId(state),
    channel: "Chat",
    customer: input.customer,
    summary: summarizeChat(input.message),
    priority: "P2",
    status: "New",
    linkedArticleIds: input.suggestedArticleIds,
  };

  return {
    ...state,
    tickets: [...state.tickets, ticket],
    events: [
      ...state.events,
      {
        type: "chat.escalated",
        ticketId: ticket.id,
        channel: "Chat",
        customer: input.customer,
      },
    ],
  };
}

export function resolveCustomerAgentRequest(
  state: SupportHubState,
  input: ResolveCustomerAgentRequestInput,
): BotResolution {
  const matchingArticle = searchPublishedArticles(state, input.message)[0];

  if (matchingArticle) {
    return {
      ...state,
      events: [
        ...state.events,
        {
          type: "chat.answered",
          ticketId: "",
          channel: "Chat",
          customer: input.customer,
        },
      ],
      botDecision: {
        outcome: "answered",
        articleId: matchingArticle.id,
        message: `We found guidance in ${matchingArticle.title}.`,
      },
    };
  }

  const next = escalateChatToTicket(state, {
    customer: input.customer,
    message: input.message,
    suggestedArticleIds: [],
  });
  const ticket = next.tickets.at(-1);

  if (!ticket) {
    throw new Error("Expected chat escalation to create a ticket");
  }

  return {
    ...next,
    botDecision: {
      outcome: "ticket_created",
      ticketId: ticket.id,
      message: "We could not resolve that from the knowledge base, so we created a ticket.",
    },
  };
}

export function searchPublishedArticles(
  state: SupportHubState,
  query: string,
): KnowledgeArticle[] {
  const normalizedQuery = normalize(query);
  const queryTokens = normalizedQuery
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .filter((token) => !["how", "the", "and", "with"].includes(token));

  return state.articles.filter((article) => {
    if (article.status !== "Published" || article.audience !== "Customer") {
      return false;
    }

    const searchableText = normalize(`${article.title} ${article.body}`);
    return (
      searchableText.includes(normalizedQuery) ||
      queryTokens.some((token) => searchableText.includes(token))
    );
  });
}

export function getChannelCounts(state: SupportHubState): ChannelCount[] {
  return state.tickets.reduce<ChannelCount[]>((counts, ticket) => {
    const existingCount = counts.find((count) => count.channel === ticket.channel);

    if (existingCount) {
      existingCount.count += 1;
      return counts;
    }

    return [...counts, { channel: ticket.channel, count: 1 }];
  }, []);
}

function nextTicketId(state: SupportHubState): string {
  return `TCK-${TICKET_ID_START + state.tickets.length}`;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function summarizeChat(message: string): string {
  const normalizedMessage = normalize(message);

  if (normalizedMessage.includes("password")) {
    return "Chat escalation: password reset";
  }

  if (normalizedMessage.includes("billing")) {
    return "Chat escalation: billing exception";
  }

  return `Chat escalation: ${message.trim()}`;
}
