import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("The Support Hub MVP", () => {
  it("starts with a Microsoft-ready login before showing operational systems", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Sign in to The Support Hub" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with Microsoft" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: /reporting/i })).toBeInTheDocument();
    expect(screen.getByText("SLA risk")).toBeInTheDocument();
    expect(screen.getByText("Knowledge gaps")).toBeInTheDocument();
  });

  it("lets an agent create a phone ticket and records it in the queue and reporting", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Continue with Microsoft" }));
    await user.click(screen.getByRole("button", { name: /new phone ticket/i }));
    await user.type(screen.getByLabelText("Customer"), "Hadley Advisory");
    await user.type(screen.getByLabelText("Contact"), "Maya Patel");
    await user.type(screen.getByLabelText("Issue summary"), "Cannot access client portal");
    await user.selectOptions(screen.getByLabelText("Priority"), "P2");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    const queue = screen.getByRole("region", { name: "Agent ticket queue" });
    expect(within(queue).getByText("Cannot access client portal")).toBeInTheDocument();
    expect(within(queue).getByText("Hadley Advisory")).toBeInTheDocument();
    expect(within(queue).getByText("Phone")).toBeInTheDocument();
    expect(within(queue).getByText("P2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /reporting/i }));
    expect(screen.getByText("Tickets by channel")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("1 ticket")).toBeInTheDocument();
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
