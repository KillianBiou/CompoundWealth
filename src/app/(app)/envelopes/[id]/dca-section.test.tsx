import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DcaSection } from "./dca-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/server/actions", () => ({
  createDcaAction: vi.fn(),
  toggleDcaLineAction: vi.fn(),
  deleteDcaLineAction: vi.fn(),
}));

const positions = [
  {
    symbol: "CW8",
    quantity: 12,
    unitPriceCents: 12_000,
    valuations: [{ valueCents: 144_000 }],
  },
];

describe("DcaSection", () => {
  it("affiche l'état vide quand aucun plan n'existe", () => {
    render(
      <DcaSection envelopeId="env-1" envelopeType="PEA" plans={[]} positions={positions} />,
    );
    expect(
      screen.getByText(/Aucun investissement régulier pour le moment/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Planifier un investissement régulier/)).toBeInTheDocument();
  });

  it("affiche les KPI 1 mois, 3 mois et 1 an avec montant et versements", () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    render(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          {
            id: "plan-1",
            frequency: "MONTHLY",
            startDate,
            active: true,
            lines: [
              { id: "line-1", isin: "LU1681043599", name: "CW8 — MSCI World", maxAmountCents: 150_000, active: true },
            ],
          },
        ]}
        positions={positions}
      />,
    );
    expect(screen.getByText("1 mois", { selector: ".uppercase" })).toBeInTheDocument();
    expect(screen.getByText("3 mois", { selector: ".uppercase" })).toBeInTheDocument();
    expect(screen.getByText("1 an", { selector: ".uppercase" })).toBeInTheDocument();
    expect(screen.getAllByText(/versement/).length).toBeGreaterThan(0);
  });

  it("affiche l'estimation parts entières pour un PEA (≈ 12 parts)", () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    render(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          {
            id: "plan-1",
            frequency: "MONTHLY",
            startDate,
            active: true,
            lines: [
              { id: "line-1", isin: "LU1681043599", name: "CW8 — MSCI World", maxAmountCents: 150_000, active: true },
            ],
          },
        ]}
        positions={positions}
      />,
    );
    expect(screen.getAllByText(/≈.*1 440,00 €/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12 parts/).length).toBeGreaterThan(0);
  });

  it("affiche une ligne en pause comme telle", () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    render(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          {
            id: "plan-1",
            frequency: "MONTHLY",
            startDate,
            active: true,
            lines: [
              { id: "line-1", isin: "LU1681043599", name: "CW8 — MSCI World", maxAmountCents: 150_000, active: false },
            ],
          },
        ]}
        positions={positions}
      />,
    );
    expect(screen.getByText("En pause")).toBeInTheDocument();
    expect(screen.getByText("Reprendre")).toBeInTheDocument();
  });

  it("affiche la périodicité et la prochaine échéance", () => {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    render(
      <DcaSection
        envelopeId="env-1"
        envelopeType="CTO"
        plans={[
          {
            id: "plan-1",
            frequency: "QUARTERLY",
            startDate,
            active: true,
            lines: [
              { id: "line-1", isin: "LU1681043599", name: "CW8 — MSCI World", maxAmountCents: 150_000, active: true },
            ],
          },
        ]}
        positions={positions}
      />,
    );
    const frequencyCells = screen.getAllByText("3 mois");
    expect(frequencyCells.length).toBeGreaterThan(0);
  });
});
