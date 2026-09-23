import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PositionsTable } from "./positions-table";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/server/actions", () => ({
  deletePositionAction: vi.fn(),
  createPositionAction: vi.fn(),
}));

const base = {
  id: "pos-1",
  name: "CW8 — MSCI World",
  symbol: "CW8",
  category: "ETF",
  boughtAt: new Date("2026-01-15"),
  valuationDate: new Date("2026-09-20"),
  valuationSource: "yahoo",
};

function row(investedCents: number | null, currentValueCents: number | null) {
  return { ...base, investedCents, currentValueCents };
}

describe("PositionsTable", () => {
  it("colore la valeur actuelle en vert avec le % de bénéfice", () => {
    render(
      <PositionsTable envelopeId="env-1" positions={[row(100_000, 120_000)]} />,
    );
    const value = screen.getByText(/1[\s\u00a0\u202f]200,00[\s\u00a0\u202f]\u20ac/);
    expect(value).toHaveClass("text-positive");
    const percent = screen.getByText(/\(\+20[\s\u00a0\u202f]*%/);
    expect(percent).toHaveClass("text-positive");
  });

  it("colore la valeur actuelle en rouge avec le % de perte", () => {
    render(
      <PositionsTable envelopeId="env-1" positions={[row(100_000, 80_000)]} />,
    );
    const value = screen.getByText(/800,00[\s\u00a0\u202f]\u20ac/);
    expect(value).toHaveClass("text-negative");
    const percent = screen.getByText(/\(-20[\s\u00a0\u202f]*%/);
    expect(percent).toHaveClass("text-negative");
  });

  it("garde une valeur neutre à gain nul", () => {
    render(
      <PositionsTable envelopeId="env-1" positions={[row(100_000, 100_000)]} />,
    );
    const values = screen.getAllByText(/1[\s\u00a0\u202f]000,00[\s\u00a0\u202f]€/);
    expect(values.length).toBeGreaterThan(1);
    const currentValue = values[values.length - 1];
    expect(currentValue).toHaveClass("text-text-primary");
    expect(screen.getByText(/\(0[\s\u00a0\u202f]*%/)).toHaveClass("text-text-muted");
  });

  it("n'affiche pas de % sans montant investi (état des lieux)", () => {
    render(
      <PositionsTable envelopeId="env-1" positions={[row(null, 120_000)]} />,
    );
    expect(screen.getByText(/1[\s\u00a0\u202f]200,00[\s\u00a0\u202f]\u20ac/)).toBeInTheDocument();
    const valueCell = screen.getByText(/1[\s\u00a0\u202f]200,00[\s\u00a0\u202f]\u20ac/).closest("td");
    expect(valueCell?.textContent ?? "").not.toMatch(/\(%/);
  });

  it("affiche l'investi en gris neutre, pas en vert", () => {
    render(
      <PositionsTable envelopeId="env-1" positions={[row(100_000, 120_000)]} />,
    );
    const invested = screen.getByText(/1[\s\u00a0\u202f]000,00[\s\u00a0\u202f]\u20ac/);
    expect(invested).toHaveClass("text-text-secondary");
    expect(invested).not.toHaveClass("text-positive");
  });

  it("donne aux boutons d'action l'apparence d'éléments cliquables", () => {
    render(
      <PositionsTable envelopeId="env-1" positions={[row(100_000, 120_000)]} />,
    );
    const deleteButton = screen.getByRole("button", { name: "Supprimer" });
    expect(deleteButton).toHaveClass("cursor-pointer");
  });
});
