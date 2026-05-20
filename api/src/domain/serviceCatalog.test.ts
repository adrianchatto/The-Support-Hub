import { describe, expect, it } from "vitest";
import { mockQuery } from "../../tests/setup.js";
import {
  createApplication,
  createTicketCategory,
  listApplications,
  listTicketCategories,
  updateApplication,
  updateTicketCategory,
} from "./serviceCatalog.js";

const APPLICATION = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Microsoft 365",
  description: "Email, Teams, SharePoint and OneDrive",
  owner_user_id: "22222222-2222-4222-8222-222222222222",
  status: "active",
  criticality: "high",
  created_at: new Date("2026-05-20T09:00:00Z"),
  updated_at: new Date("2026-05-20T09:00:00Z"),
};

const CATEGORY = {
  id: "33333333-3333-4333-8333-333333333333",
  name: "Access",
  description: "Login, permissions and account requests",
  active: true,
  created_at: new Date("2026-05-20T09:00:00Z"),
  updated_at: new Date("2026-05-20T09:00:00Z"),
};

describe("service catalog applications", () => {
  it("lists active applications first by name", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [APPLICATION] });

    const applications = await listApplications();

    expect(applications).toEqual([APPLICATION]);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ORDER BY status ASC, name ASC/);
  });

  it("creates an application owned by a supervisor", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [APPLICATION] });

    const application = await createApplication({
      name: "Microsoft 365",
      description: "Email, Teams, SharePoint and OneDrive",
      ownerUserId: "22222222-2222-4222-8222-222222222222",
      status: "active",
      criticality: "high",
    });

    expect(application.name).toBe("Microsoft 365");
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO applications/);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ON CONFLICT \(name\) DO UPDATE/);
  });

  it("updates application metadata without deleting history", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...APPLICATION, criticality: "critical" }] });

    const application = await updateApplication("app-1", { criticality: "critical" });

    expect(application.criticality).toBe("critical");
    expect(mockQuery.mock.calls[0][0]).toMatch(/updated_at = NOW\(\)/);
  });
});

describe("ticket categories", () => {
  it("lists ticket categories by active state and name", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CATEGORY] });

    const categories = await listTicketCategories();

    expect(categories).toEqual([CATEGORY]);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ORDER BY active DESC, name ASC/);
  });

  it("creates a reusable ticket category", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CATEGORY] });

    const category = await createTicketCategory({
      name: "Access",
      description: "Login, permissions and account requests",
      active: true,
    });

    expect(category.active).toBe(true);
    expect(mockQuery.mock.calls[0][0]).toMatch(/INSERT INTO ticket_categories/);
    expect(mockQuery.mock.calls[0][0]).toMatch(/ON CONFLICT \(name\) DO UPDATE/);
  });

  it("can disable a category without deleting it", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...CATEGORY, active: false }] });

    const category = await updateTicketCategory("cat-1", { active: false });

    expect(category.active).toBe(false);
  });
});
