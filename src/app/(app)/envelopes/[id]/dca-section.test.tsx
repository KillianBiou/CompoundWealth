import { screen, within } from "@testing-library/react";
import { renderWithToast } from "../../../../../tests/test-utils";
import userEvent from "@testing-library/user-event";
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

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  Cell: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Tooltip: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
}));

const positions = [
  {
    symbol: "CW8",
    quantity: 12,
    unitPriceCents: 12_000,
    valuations: [{ valueCents: 144_000 }],
  },
];

function monthlyPlan(
  lines: { id: string; isin: string; name: string; maxAmountCents: number; active: boolean }[],
) {
  const today = new Date();
  return {
    id: "plan-1",
    frequency: "MONTHLY" as const,
    startDate: new Date(today.getFullYear(), today.getMonth(), 1),
    active: true,
    lines,
  };
}

describe("DcaSection", () => {
  it("affiche l'état vide quand aucun plan n'existe", () => {
    renderWithToast(
      <DcaSection envelopeId="env-1" envelopeType="PEA" plans={[]} positions={positions} />,
    );
    expect(
      screen.getByText(/Aucun investissement régulier pour le moment/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Planifier un investissement régulier/)).toBeInTheDocument();
  });

  it("affiche le récapitulatif avec le montant engagé en vert", () => {
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: true,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    const engaged = screen.getByText(/Engagé sur 1 mois/);
    expect(engaged).toBeInTheDocument();
    const engagedValue = engaged.parentElement?.querySelector("p.text-positive");
    expect(engagedValue).not.toBeNull();
    expect(engagedValue?.textContent).toContain("€");
  });

  it("affiche le montant max de chaque ligne en vert dans la table", () => {
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: true,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    const amount = screen.getByText("1 500,00 €");
    expect(amount).toHaveClass("text-positive");
  });

  it("affiche l'estimation parts entières pour un PEA (≈ 12 parts)", () => {
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: true,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    expect(screen.getAllByText(/12 parts/).length).toBeGreaterThan(0);
  });

  it("affiche une ligne en pause comme telle", () => {
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: false,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    expect(screen.getByText("En pause")).toBeInTheDocument();
    expect(screen.getByText("Reprendre")).toBeInTheDocument();
  });

  it("bascule la période du récapitulatif au clic (1 mois → 3 mois)", async () => {
    const user = userEvent.setup();
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: true,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    expect(screen.getByText(/Engagé sur 1 mois/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "3 mois" }));
    expect(screen.getByText(/Engagé sur 3 mois/)).toBeInTheDocument();
  });

  it("bascule le type de visualisation au clic (Barres → Anneau → Treemap)", async () => {
    const user = userEvent.setup();
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: true,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    expect(screen.getByRole("button", { name: /Barres/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /Treemap/ }));
    expect(screen.getByRole("button", { name: /Treemap/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /Anneau/ }));
    expect(screen.getByRole("button", { name: /Anneau/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("donne aux boutons pause/supprimer l'apparence d'éléments cliquables", () => {
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="PEA"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: true,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    expect(screen.getByRole("button", { name: "Mettre en pause" })).toHaveClass(
      "cursor-pointer",
    );
    expect(screen.getByRole("button", { name: "Supprimer" })).toHaveClass("cursor-pointer");
  });

  it("affiche la répartition avec le ticker de chaque position", () => {
    renderWithToast(
      <DcaSection
        envelopeId="env-1"
        envelopeType="CTO"
        plans={[
          monthlyPlan([
            {
              id: "line-1",
              isin: "LU1681043599",
              name: "CW8 — MSCI World",
              maxAmountCents: 150_000,
              active: true,
            },
            {
              id: "line-2",
              isin: "FR001400U5Q4",
              name: "DCAM — Amundi PEA Monde",
              maxAmountCents: 50_000,
              active: true,
            },
          ]),
        ]}
        positions={positions}
      />,
    );
    const legend = screen.getAllByText("CW8");
    expect(legend.length).toBeGreaterThan(0);
    const legendItems = screen.getAllByText(/DCAM/);
    expect(legendItems.length).toBeGreaterThan(0);
    const recap = screen.getByText(/Répartition par position/);
    expect(within(recap.parentElement?.parentElement ?? recap).getAllByText(/CW8|DCAM/).length).toBeGreaterThan(0);
  });
});
