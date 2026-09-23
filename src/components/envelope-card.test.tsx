import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EnvelopeCard } from "./envelope-card";
import type { EnvelopeSummary } from "@/server/queries";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

const base: EnvelopeSummary = {
  id: "env-1",
  type: "PEA",
  name: "PEA Bourse",
  broker: "Trade Republic",
  openedAt: new Date("2024-06-01"),
  closedAt: null,
  investedCents: 100_000,
  hasUnknownInvested: false,
  valueCents: 120_000,
  gainCents: 20_000,
  positionsCount: 2,
  series: [],
  investedSeries: [],
};

describe("EnvelopeCard", () => {
  it("affiche le nom, le type et la valeur", () => {
    render(<EnvelopeCard envelope={base} />);
    expect(screen.getByText("PEA Bourse")).toBeInTheDocument();
    expect(screen.getByText("PEA")).toBeInTheDocument();
    expect(screen.getByText(/Trade Republic/)).toBeInTheDocument();
  });

  it("affiche le gain en vert avec flèche hausse", () => {
    render(<EnvelopeCard envelope={base} />);
    const gain = document.querySelector("p.text-positive");
    expect(gain?.textContent).toContain("↗");
    expect(gain?.textContent).toContain("200,00");
  });

  it("affiche la perte en corail avec flèche baisse", () => {
    render(
      <EnvelopeCard
        envelope={{ ...base, valueCents: 90_000, gainCents: -10_000 }}
      />,
    );
    const loss = document.querySelector("p.text-negative");
    expect(loss?.textContent).toContain("↘");
    expect(loss?.textContent).toContain("100,00");
  });

  it("état des lieux : gain non calculable affiché explicitement", () => {
    const { container } = render(
      <EnvelopeCard
        envelope={{ ...base, gainCents: null, hasUnknownInvested: true }}
      />,
    );
    expect(container.textContent).toContain("État des lieux");
    expect(container.querySelector("p.text-negative")).toBeNull();
    expect(container.querySelector("p.text-positive")).toBeNull();
  });
});
