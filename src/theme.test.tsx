import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const apiMocks = vi.hoisted(() => ({
  getToken: vi.fn(),
  me: vi.fn(),
  ticketsList: vi.fn(),
  slaCompliance: vi.fn(),
}));

vi.mock("./api", () => ({
  authApi: {
    login: vi.fn(),
    me: apiMocks.me,
  },
  getToken: apiMocks.getToken,
  setToken: vi.fn(),
  clearToken: vi.fn(),
  usersApi: {
    list: vi.fn(),
    agents: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  customersApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  ticketsApi: {
    list: apiMocks.ticketsList,
    create: vi.fn(),
    updateStatus: vi.fn(),
    messages: vi.fn(),
    addMessage: vi.fn(),
    assign: vi.fn(),
    linkProblem: vi.fn(),
  },
  problemsApi: {
    list: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    linkTicket: vi.fn(),
    unlinkTicket: vi.fn(),
    tickets: vi.fn(),
  },
  articlesApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    suggestions: vi.fn(),
    generateDraft: vi.fn(),
  },
  slaApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    compliance: apiMocks.slaCompliance,
  },
}));

function installStorage(initialTheme: string | null = null) {
  const store = new Map<string, string>();
  if (initialTheme) store.set("support_hub_theme", initialTheme);

  const storage = {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() { return store.size; },
  } satisfies Storage;

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: storage,
  });

  return storage;
}

function installSystemTheme(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? prefersDark : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function mockSignedInUser() {
  apiMocks.getToken.mockReturnValue("stored-token");
  apiMocks.me.mockResolvedValue({
    id: "user-1",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
  });
  apiMocks.ticketsList.mockResolvedValue([]);
  apiMocks.slaCompliance.mockResolvedValue({
    total: 0,
    green: 0,
    amber: 0,
    red: 0,
    none: 0,
    compliance_pct: 100,
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.documentElement.removeAttribute("data-theme");
});

describe("dark mode", () => {
  it("defaults to the system dark preference when no saved preference exists", async () => {
    installStorage();
    installSystemTheme(true);
    mockSignedInUser();

    render(<App />);

    expect(await screen.findByLabelText("Switch to light mode")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("restores a saved theme preference before showing the workspace", async () => {
    installStorage("dark");
    installSystemTheme(false);
    mockSignedInUser();

    render(<App />);

    expect(await screen.findByLabelText("Switch to light mode")).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("toggles the theme from the sidebar identity panel and persists the selection", async () => {
    const storage = installStorage();
    installSystemTheme(false);
    mockSignedInUser();
    const user = userEvent.setup();

    render(<App />);

    const toggle = await screen.findByLabelText("Switch to dark mode");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    await user.click(toggle);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(storage.setItem).toHaveBeenCalledWith("support_hub_theme", "dark");
    expect(screen.getByLabelText("Switch to light mode")).toBeInTheDocument();
  });
});
