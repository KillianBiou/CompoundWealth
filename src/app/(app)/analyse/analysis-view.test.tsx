import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AnalysisPageView } from "./analysis-view";
import type {
  DiversificationResult,
  FeeAnalysisResult,
  IncomeAnalysisResult,
  SimulatorDefaults,
} from "@/lib/analysis/scanners";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  Line: () => <div />,
  Pie: () => <div />,
  Cell: () => <div />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

const fees: FeeAnalysisResult = {
  annualCostCents: 214_00,
  feeRate: 0.0031,
  lines: [
    {
      positionId: "pos-1",
      name: "MSCI World Swap PEA",
      isin: "IE0002XZSHO1",
      envelopeName: "PEA Trade Republic",
      ter: 0.002,
      custodyRate: 0,
      transactionFeesCents: 12_00,
      annualCostCents: 140_00,
      valueCents: 70_000_00,
    },
  ],
  transactionFeesCents: 12_00,
  totalValueCents: 70_000_00,
  projectedLossCents: [
    { horizonYears: 10, lossCents: 1_200_00 },
    { horizonYears: 20, lossCents: 4_830_00 },
    { horizonYears: 30, lossCents: 11_000_00 },
  ],
  worstTer: { name: "MSCI World Swap PEA", ter: 0.002 },
};

const income: IncomeAnalysisResult = {
  cashTwelveMonthsCents: 237_00,
  projectedTwelveMonthsCents: 500_00,
  capitalizedTwelveMonthsCents: 260_00,
  lines: [
    {
      positionId: "pos-1",
      name: "NVIDIA",
      isin: "US67066G1040",
      envelopeName: "CTO Trade Republic",
      kind: "cash",
      twelveMonthsCents: 237_00,
      projectedCents: 237_00,
      yieldOnValue: 0.0044,
    },
  ],
  yieldOnValue: 0.0031,
  monthlyCalendar: [{ year: 2026, month: 5, amountCents: 118_00 }],
};

const sectors: DiversificationResult = {
  lines: [
    {
      sector: "Technologie",
      amountCents: 34_000_00,
      share: 0.34,
      contributors: [{ name: "MSCI World Swap PEA", amountCents: 34_000_00 }],
    },
    {
      sector: "Finance",
      amountCents: 16_000_00,
      share: 0.16,
      contributors: [{ name: "MSCI World Swap PEA", amountCents: 16_000_00 }],
    },
  ],
  score: 6,
  alerts: [],
  totalCents: 100_000_00,
};

const regions: DiversificationResult = {
  lines: [
    {
      sector: "US",
      amountCents: 58_000_00,
      share: 0.58,
      contributors: [{ name: "MSCI World Swap PEA", amountCents: 58_000_00 }],
    },
    {
      sector: "Europe",
      amountCents: 27_000_00,
      share: 0.27,
      contributors: [{ name: "MSCI France", amountCents: 27_000_00 }],
    },
  ],
  score: 5,
  alerts: [],
  totalCents: 100_000_00,
};

const simulatorDefaults: SimulatorDefaults = {
  investedWealthCents: 70_000_00,
  savingsWealthCents: 30_000_00,
  monthlySavingsCents: 1_150_00,
  monthlyDcaCents: 300_00,
  equityReturn: 0.07,
  savingsReturn: 0.03,
  returnSource: "historique",
};

function renderView() {
  return render(
    <AnalysisPageView
      fees={fees}
      income={income}
      sectors={sectors}
      regions={regions}
      simulatorDefaults={simulatorDefaults}
      monthlyExpensesCents={1_500_00}
    />,
  );
}

describe("AnalysisPageView", () => {
  it("affiche les six cartes scanners avec leurs KPI", () => {
    renderView();
    expect(screen.getByText("Frais")).toBeInTheDocument();
    expect(screen.getByText("Revenus passifs")).toBeInTheDocument();
    expect(screen.getByText("Secteurs")).toBeInTheDocument();
    expect(screen.getByText("Géographie")).toBeInTheDocument();
    expect(screen.getByText("Simulateur")).toBeInTheDocument();
    expect(screen.getByText("Abonnements")).toBeInTheDocument();
  });

  it("le badge frais reflète le taux (0,31 % → Faible)", () => {
    renderView();
    expect(screen.getByText("Faible")).toBeInTheDocument();
  });

  it("ouvre le panneau détaillé au clic sur la carte Frais", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    expect(screen.getByText("Scanner de frais")).toBeInTheDocument();
    expect(screen.getByText("MSCI World Swap PEA")).toBeInTheDocument();
    expect(screen.getByText(/Impact estimé sur 20 ans/)).toBeInTheDocument();
  });

  it("ferme le panneau au clic sur Fermer", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    fireEvent.click(screen.getByRole("button", { name: "Fermer le panneau" }));
    expect(screen.queryByText("Scanner de frais")).not.toBeInTheDocument();
  });

  it("la carte Abonnements est un placeholder désactivé", () => {
    renderView();
    const card = screen.getByText("Abonnements").closest("button");
    expect(card).toBeDisabled();
    expect(screen.getByText(/bientôt/i)).toBeInTheDocument();
  });

  it("le panneau secteurs affiche le score et le secteur dominant", () => {
    renderView();
    fireEvent.click(screen.getByText("Secteurs"));
    expect(screen.getByText("Diversification sectorielle")).toBeInTheDocument();
    expect(screen.getAllByText("6/10").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Technologie").length).toBeGreaterThan(0);
  });
});
