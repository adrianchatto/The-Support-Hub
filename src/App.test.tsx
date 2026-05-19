import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("The Support Hub MVP", () => {
  it("starts with a Microsoft-ready login before showing operational systems", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Sign in to The Support Hub" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Microsoft" })).toBeInTheDocument();
    expect(screen.getByText("Demo sign-in only. Real Microsoft challenge is not wired yet.")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Staff workspace" })).not.toBeInTheDocument();
  });

  it("shows a professional staff workspace after Microsoft sign-in", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));

    expect(screen.getByRole("heading", { name: "The Support Hub" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Staff workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tickets/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /knowledge/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /customer site/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /SLAs/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reporting/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "SLA risk" })).toBeInTheDocument();
    expect(screen.getByText("Knowledge gaps")).toBeInTheDocument();
    expect(screen.queryByText(/Dubai service desk pilot/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("All clear").length).toBeGreaterThan(0);
    expect(screen.getByText("No open tickets are at risk.")).toBeInTheDocument();
  });

  it("lets an agent create and search tickets, then records the channel in reporting", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /new ticket/i }));
    await user.selectOptions(screen.getByLabelText("Customer"), "Hadley Advisory");
    await user.type(screen.getByLabelText("Contact name"), "Maya Patel");
    await user.type(screen.getByLabelText("Contact email"), "maya@hadley.example");
    expect(screen.getByLabelText("Country code")).toHaveValue("+971");
    expect(screen.getByRole("option", { name: "🇦🇪 UAE +971" })).toBeInTheDocument();
    expect(screen.getByLabelText("Contact phone")).toHaveValue("");
    expect(screen.getByLabelText("Contact phone")).not.toHaveAttribute("placeholder", "501234567");
    await user.type(screen.getByLabelText("Contact phone"), "501234567");
    await user.selectOptions(screen.getByLabelText("Record type"), "Incident");
    await user.selectOptions(screen.getByLabelText("Category"), "Access");
    await user.selectOptions(screen.getByLabelText("Impact"), "High");
    await user.selectOptions(screen.getByLabelText("Urgency"), "Medium");
    await user.type(screen.getByLabelText("Description"), "Cannot access client portal");
    await user.selectOptions(screen.getByLabelText("Channel"), "Email");
    expect(screen.queryByLabelText("Priority")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    const queue = screen.getByRole("region", { name: "Agent ticket queue" });
    expect(within(queue).getByText("Cannot access client portal")).toBeInTheDocument();
    expect(within(queue).getByText("Hadley Advisory")).toBeInTheDocument();
    expect(within(queue).getByText("Email")).toBeInTheDocument();
    expect(within(queue).getByText("P2")).toBeInTheDocument();
    expect(within(queue).getByText("Incident")).toBeInTheDocument();
    expect(screen.getAllByText("Due soon").length).toBeGreaterThan(0);

    await user.clear(screen.getByLabelText("Search tickets"));
    await user.type(screen.getByLabelText("Search tickets"), "no match");
    expect(within(queue).queryByText("Cannot access client portal")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search tickets"));
    await user.type(screen.getByLabelText("Search tickets"), "client portal");
    expect(within(queue).getByText("Cannot access client portal")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reporting/i }));
    expect(screen.getByText("Tickets by channel")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
  });

  it("validates customer contact email and phone before creating a ticket", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /new ticket/i }));
    await user.selectOptions(screen.getByLabelText("Customer"), "Neovance");
    await user.type(screen.getByLabelText("Contact name"), "Sam Noor");
    await user.type(screen.getByLabelText("Contact email"), "not-an-email");
    await user.type(screen.getByLabelText("Contact phone"), "123");
    await user.type(screen.getByLabelText("Description"), "Contact lens QA evaluation");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid E.164 phone number.")).toBeInTheDocument();
    const queue = screen.getByRole("region", { name: "Agent ticket queue" });
    expect(within(queue).queryByText("Contact lens QA evaluation")).not.toBeInTheDocument();
  });

  it("opens a ticket detail view with contact details, age, timeline, start-work status, and notes", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /new ticket/i }));
    await user.selectOptions(screen.getByLabelText("Customer"), "Hadley Advisory");
    await user.type(screen.getByLabelText("Contact name"), "Maya Patel");
    await user.type(screen.getByLabelText("Contact email"), "maya@hadley.example");
    await user.type(screen.getByLabelText("Contact phone"), "501234567");
    await user.selectOptions(screen.getByLabelText("Record type"), "Incident");
    await user.selectOptions(screen.getByLabelText("Category"), "Access");
    await user.selectOptions(screen.getByLabelText("Impact"), "High");
    await user.selectOptions(screen.getByLabelText("Urgency"), "High");
    await user.type(screen.getByLabelText("Description"), "Cannot access client portal");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));
    await user.click(screen.getByRole("button", { name: "Open TCK-1001" }));

    const detail = screen.getByRole("region", { name: "Ticket detail" });
    expect(within(detail).getByRole("heading", { name: "Cannot access client portal" })).toBeInTheDocument();
    expect(within(detail).getByText("maya@hadley.example")).toBeInTheDocument();
    expect(within(detail).getByText("+971501234567")).toBeInTheDocument();
    expect(within(detail).getByText("Incident")).toBeInTheDocument();
    expect(within(detail).getByText("Access")).toBeInTheDocument();
    expect(within(detail).getByText("Problem candidate")).toBeInTheDocument();
    expect(within(detail).getByText(/Open for/)).toBeInTheDocument();
    expect(within(detail).getByText("Ticket created")).toBeInTheDocument();
    expect(within(detail).getAllByLabelText("Timeline timestamp")[0]).toHaveTextContent(/\d{2}:\d{2}/);

    await user.click(within(detail).getByRole("button", { name: "Start work" }));
    expect(within(detail).getByLabelText("Ticket status")).toHaveValue("Open");
    expect(within(detail).getByText("Agent started work")).toBeInTheDocument();

    await user.type(within(detail).getByLabelText("Add ticket update"), "Confirmed the user can reach the sign-in page.");
    await user.click(within(detail).getByRole("button", { name: "Add update" }));
    expect(within(detail).getByText("Agent note: Confirmed the user can reach the sign-in page.")).toBeInTheDocument();
  });

  it("supports ITIL classification and grouping related tickets", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /new ticket/i }));
    await user.selectOptions(screen.getByLabelText("Customer"), "Hadley Advisory");
    await user.type(screen.getByLabelText("Contact name"), "Maya Patel");
    await user.type(screen.getByLabelText("Contact email"), "maya@hadley.example");
    await user.type(screen.getByLabelText("Contact phone"), "501234567");
    await user.selectOptions(screen.getByLabelText("Record type"), "Question");
    await user.selectOptions(screen.getByLabelText("Category"), "Service review");
    await user.selectOptions(screen.getByLabelText("Impact"), "Low");
    await user.selectOptions(screen.getByLabelText("Urgency"), "Low");
    await user.type(screen.getByLabelText("Description"), "Can we review monthly service performance?");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await user.click(screen.getByRole("button", { name: /new ticket/i }));
    await user.selectOptions(screen.getByLabelText("Customer"), "Hadley Advisory");
    await user.type(screen.getAllByLabelText("Contact name")[0], "Maya Patel");
    await user.type(screen.getAllByLabelText("Contact email")[0], "maya@hadley.example");
    await user.type(screen.getAllByLabelText("Contact phone")[0], "501234567");
    await user.selectOptions(screen.getAllByLabelText("Record type")[0], "Service Request");
    await user.selectOptions(screen.getAllByLabelText("Group under parent ticket")[0], "TCK-1001");
    await user.type(screen.getAllByLabelText("Description")[0], "Please add finance users to the review pack.");
    await user.click(screen.getAllByRole("button", { name: "Create ticket" })[0]);

    await user.click(screen.getByRole("button", { name: "Open TCK-1002" }));
    const detail = screen.getByRole("region", { name: "Ticket detail" });
    expect(within(detail).getByText("Service Request")).toBeInTheDocument();
    expect(within(detail).getByText("Grouped under TCK-1001")).toBeInTheDocument();
  });

  it("provides a customer management area used by ticket customer selection", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /customers/i }));

    expect(screen.getByRole("heading", { name: "Customer management" })).toBeInTheDocument();
    expect(screen.getByText("Hadley Advisory")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add customer" }));
    await user.type(screen.getByLabelText("Customer name"), "Aster Clinics");
    await user.type(screen.getByLabelText("Primary contact"), "Leena Thomas");
    await user.type(screen.getByLabelText("Customer email"), "leena@aster.example");
    await user.click(screen.getByRole("button", { name: "Save customer" }));

    await user.click(screen.getByRole("button", { name: /tickets/i }));
    await user.click(screen.getByRole("button", { name: /new ticket/i }));
    expect(screen.getByRole("option", { name: "Aster Clinics" })).toBeInTheDocument();
  });

  it("lets an agent edit and disable customer records", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /customers/i }));
    await user.click(screen.getByRole("button", { name: "Edit Hadley Advisory" }));
    expect(screen.getByRole("button", { name: "Edit Hadley Advisory" })).toHaveClass("icon-button");
    expect(screen.getByRole("button", { name: "Edit Hadley Advisory" })).toHaveAttribute("data-tooltip", "Edit customer");

    await user.clear(screen.getByLabelText("Customer name"));
    await user.type(screen.getByLabelText("Customer name"), "Hadley Advisory Group");
    await user.clear(screen.getByLabelText("Primary contact"));
    await user.type(screen.getByLabelText("Primary contact"), "Maya Shah");
    await user.click(screen.getByRole("button", { name: "Save customer" }));

    expect(screen.getByText("Hadley Advisory Group")).toBeInTheDocument();
    expect(screen.getByText("Maya Shah")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Disable Hadley Advisory Group" })).toHaveClass("icon-button");
    expect(screen.getByRole("button", { name: "Disable Hadley Advisory Group" })).toHaveAttribute("data-tooltip", "Disable customer");
    await user.click(screen.getByRole("button", { name: "Disable Hadley Advisory Group" }));
    expect(screen.getByText("Inactive")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tickets/i }));
    await user.click(screen.getByRole("button", { name: /new ticket/i }));
    expect(screen.queryByRole("option", { name: "Hadley Advisory Group" })).not.toBeInTheDocument();
  });

  it("provides an SLA setup section for policy configuration", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /SLAs/i }));

    expect(screen.getByRole("heading", { name: "SLA policies" })).toBeInTheDocument();
    expect(screen.getByLabelText("Policy name")).toHaveValue("Standard support");
    expect(screen.getByLabelText("First response target")).toHaveValue(4);
    expect(screen.getByLabelText("Resolution target")).toHaveValue(24);

    await user.clear(screen.getByLabelText("Policy name"));
    await user.type(screen.getByLabelText("Policy name"), "Priority support");
    expect(screen.getByDisplayValue("Priority support")).toBeInTheDocument();
  });

  it("supports drafting articles and reviewing low-helpfulness recommendations", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /knowledge/i }));
    await user.click(screen.getByRole("button", { name: "Draft article" }));

    expect(screen.getByRole("heading", { name: "Draft knowledge article" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Article title"), "Contact lens QA evaluation");
    await user.type(screen.getByLabelText("Article summary"), "How to prepare contact lens QA evidence.");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    expect(screen.getByRole("article", { name: "Contact lens QA evaluation" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Low-helpfulness articles" }));
    expect(screen.getByRole("heading", { name: "Low-helpfulness articles" })).toBeInTheDocument();
    expect(screen.getByText("Clarify the reset steps and add troubleshooting checks before escalation.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Review Reset your portal password" }));
    expect(screen.getByDisplayValue("Reset your portal password")).toBeInTheDocument();
  });

  it("keeps the customer website separate and does not expose manual escalation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /customer site/i }));

    expect(screen.getByRole("heading", { name: "Hadley Advisory Support" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search knowledge"), "password reset");
    expect(screen.getByRole("article", { name: "Reset your portal password" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /escalate to agent/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask to speak to an agent" })).toBeInTheDocument();
  });

  it("lets the bot decide whether a customer agent request becomes a ticket", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /customer site/i }));
    await user.type(screen.getByLabelText("Ask the support bot"), "I need help with a billing exception");
    await user.click(screen.getByRole("button", { name: "Ask to speak to an agent" }));

    expect(screen.getByText("We could not resolve that from the knowledge base, so we created a ticket.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tickets/i }));
    const queue = screen.getByRole("region", { name: "Agent ticket queue" });
    expect(within(queue).getByText("Chat escalation: billing exception")).toBeInTheDocument();
    expect(within(queue).getByText("Chat")).toBeInTheDocument();
  });
});
