import { beforeEach, describe, expect, it, vi } from "vitest";
import { ticketsApi, clearToken } from "./api";

describe("ticketsApi", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => [],
      })),
    );
    clearToken();
  });

  it("builds clean ticket queue filter query strings", async () => {
    await ticketsApi.list({
      priority: "",
      search: "portal access",
      status: "Open",
      ticketType: "incident",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/tickets?search=portal+access&status=Open&ticketType=incident",
      expect.any(Object),
    );
  });
});
