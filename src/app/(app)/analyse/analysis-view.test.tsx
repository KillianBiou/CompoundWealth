import { screen, fireEvent } from "@testing-library/react";
import { renderWithI18n } from "../../../../tests/test-utils";
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
      symbol: "IE0002XZSHO1",
      envelopeName: "PEA Trade Republic",
      ter: 0.002,
      custodyRate: 0,
      transactionFeesCents: 12_00,
      annualCostCents: 140_00,
      valueCents: 70_000_00,
    },
    {
      positionId: "pos-2",
      name: "NVIDIA",
      isin: "US67066G1040",
      symbol: "US67066G1040",
      envelopeName: "CTO Trade Republic",
      ter: null,
      custodyRate: 0,
      transactionFeesCents: 3_00,
      annualCostCents: 0,
      valueCents: 30_000_00,
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
  lines: [
    {
      positionId: "pos-1",
      name: "NVIDIA",
      isin: "US67066G1040",
      symbol: "US67066G1040",
      envelopeName: "CTO Trade Republic",
      twelveMonthsCents: 237_00,
      projectedCents: 237_00,
      yieldOnValue: 0.0044,
      paymentMonths: [2, 5, 8, 11],
      paymentsPerYear: 4,
      nextPayment: { year: 2026, month: 8, amountCents: 59_00 },
    },
  ],
  excludedLines: [
    {
      positionId: "pos-3",
      name: "MSCI World Swap PEA",
      isin: "IE0002XZSHO1",
      symbol: "IE0002XZSHO1",
      envelopeName: "PEA Trade Republic",
      reason: "capitalizing",
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
const countries: DiversificationResult = {
  lines: [
    {
      sector: "United States",
      amountCents: 58_000_00,
      share: 0.58,
      contributors: [{ name: "MSCI World Swap PEA", amountCents: 58_000_00 }],
    },
    {
      sector: "France",
      amountCents: 27_000_00,
      share: 0.27,
      contributors: [{ name: "MSCI France", amountCents: 27_000_00 }],
    },
    {
      sector: "Autres pays",
      amountCents: 5_000_00,
      share: 0.05,
      contributors: [{ name: "MSCI World Swap PEA", amountCents: 5_000_00 }],
    },
  ],
  score: 5,
  alerts: [],
  totalCents: 100_000_00,
};

const economies: DiversificationResult = {
  lines: [
    {
      sector: "Developpe",
      amountCents: 85_000_00,
      share: 0.85,
      contributors: [{ name: "MSCI World Swap PEA", amountCents: 58_000_00 }],
    },
    {
      sector: "Emergent",
      amountCents: 15_000_00,
      share: 0.15,
      contributors: [{ name: "MSCI World Swap PEA", amountCents: 15_000_00 }],
    },
  ],
  score: 4,
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
  return renderWithI18n(
    <AnalysisPageView
      fees={fees}
      income={income}
      sectors={sectors}
      regions={regions}
      countries={countries}
      economies={economies}
      simulatorDefaults={simulatorDefaults}
      etfDetails={{
        [fees.lines[0].isin ?? "IE0002XZSHO1"]: {
          isin: fees.lines[0].isin ?? "IE0002XZSHO1",
          ticker: "WPEA",
          tickerYahoo: "WPEA.PA",
          name: "iShares MSCI World Swap PEA UCITS ETF EUR (Acc)",
          emitter: "BlackRock Asset Management Ireland",
          indexTracked: "MSCI World",
          assetClass: "Equity",
          region: "World",
          sectorFocus: "All sectors",
          ter: 0.002,
          replication: "Swap",
          distributing: false,
          dividendYield2025: null,
          currency: "EUR",
          exchange: "Euronext Paris",
          domicile: "Ireland",
          ucits: true,
          fundSizeMusd: 6300,
          holdingsCount: 1282,
          peaEligible: true,
          userHolding: true,
          notes: "",
          trName: "iShares MSCI World Swap PEA UCITS ETF EUR (Acc)",
          provider: "iShares",
          fundCurrency: "EUR",
          currencyRisk: "Currency unhedged",
          wkn: "A3E1JV",
          holdingsAsOf: "",
          dataAsOf: "2026-09-25",
          topHoldings: [
            { name: "Apple", weight: 0.0563 },
            { name: "NVIDIA Corp.", weight: 0.0513 },
          ],
          countries: [
            { name: "United States", weight: 0.695 },
            { name: "Japan", weight: 0.0552 },
            { name: "United Kingdom", weight: 0.0377 },
            { name: "Canada", weight: 0.0346 },
            { name: "Switzerland", weight: 0.0271 },
            { name: "France", weight: 0.0217 },
            { name: "Germany", weight: 0.0215 },
            { name: "Netherlands", weight: 0.0165 },
            { name: "Australia", weight: 0.0164 },
            { name: "Ireland", weight: 0.0102 },
            { name: "Other", weight: 0.0641 },
          ],
          sectors: [
            { name: "Technology", weight: 0.3452 },
            { name: "Finance", weight: 0.1869 },
          ],
        },
      }}
      actionDetails={{
        US67066G1040: {
          name: "NVIDIA",
          ticker: "NVDA",
          tickerYahoo: "NVDA",
          isin: "US67066G1040",
          country: "United States",
          sector: "Technology",
          exchange: "NASDAQ",
          longName: "NVIDIA Corporation",
          currency: "USD",
          price: 224.58,
          previousClose: 225.51,
          marketCap: 5_422_933_082_112,
          trailingPe: 28.5,
          forwardPe: 14.32,
          priceToBook: 23.68,
          dividendYield: 0.0044,
          dividendRate: 1,
          payoutRatio: 0.0354,
          beta: 2.217,
          volume: 76_420_503,
          averageVolume3Month: 126_051_807,
          fiftyTwoWeekHigh: 236.54,
          fiftyTwoWeekLow: 164.27,
          fiftyDayAverage: 215.62,
          twoHundredDayAverage: 199.28,
          industry: "Semiconductors",
          website: "https://www.nvidia.com",
          hqCity: "Santa Clara",
          hqState: "CA",
          fullTimeEmployees: 42000,
          businessSummary: "NVIDIA Corporation operates as a data center scale AI infrastructure company.",
          notes: "",
          dataAsOf: "2026-09-25",
        },
      }}
    />,
  );
}

describe("AnalysisPageView", () => {
  it("affiche les cinq cartes scanners avec leurs KPI", () => {
    renderView();
    expect(screen.getByText("Frais")).toBeInTheDocument();
    expect(screen.getByText("Dividendes & intérêts")).toBeInTheDocument();
    expect(screen.getByText("Exposition")).toBeInTheDocument();
    expect(screen.getByText("Simulateur de patrimoine")).toBeInTheDocument();
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
    expect(card).not.toBeNull();
    expect(card).toBeDisabled();
    expect(card!.textContent?.match(/bientôt/i)).toBeTruthy();
  });

  it("le panneau exposition affiche les onglets sectoriel et géographique", () => {
    renderView();
    fireEvent.click(screen.getAllByText("Exposition")[0]);
    expect(screen.getByText("Géographique")).toBeInTheDocument();
    expect(screen.getByText("Sectoriel")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Sectoriel"));
    expect(screen.getAllByText("Technologie").length).toBeGreaterThan(0);
  });
  it("le sélecteur géographique bascule entre zones et pays détaillés", () => {
    renderView();
    fireEvent.click(screen.getAllByText("Exposition")[0]);
    expect(screen.getByText("Zones")).toBeInTheDocument();
    expect(screen.getByText(/Pays \(2\)/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Pays \(2\)/));
    expect(screen.getAllByText("United States").length).toBeGreaterThan(0);
    expect(screen.getByText("Autres pays")).toBeInTheDocument();
  });
  it("la vue économie classe l'exposition développé / émergent / frontière", () => {
    renderView();
    fireEvent.click(screen.getAllByText("Exposition")[0]);
    fireEvent.click(screen.getByText("Économie"));
    expect(screen.getAllByText(/Marchés développés/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Marchés émergents/)).toBeInTheDocument();
    expect(screen.queryByText(/Marchés frontières/)).not.toBeInTheDocument();
  });

  it("ouvre le panneau ETF au clic sur une ligne du scanner de frais", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    fireEvent.click(screen.getByText("MSCI World Swap PEA"));
    // panneau ETF : titre = nom distant, onglets présents
    expect(
      screen.getAllByText("iShares MSCI World Swap PEA UCITS ETF EUR (Acc)")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Général")).toBeInTheDocument();
    expect(screen.getByText("Détails")).toBeInTheDocument();
    expect(screen.getByText("Diversification")).toBeInTheDocument();
    // identité de l'ETF visible dans l'onglet Général
    expect(screen.getByText("MSCI World")).toBeInTheDocument();
  });
  it("ouvre le panneau action au clic sur une action du scanner de frais", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    fireEvent.click(screen.getByText("NVIDIA"));
    expect(
      screen.getAllByText("NVIDIA Corporation").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Général")).toBeInTheDocument();
    expect(screen.getByText("Entreprise")).toBeInTheDocument();
  });
  it("ouvre le panneau action au clic sur une action du scanner de revenus", () => {
    renderView();
    fireEvent.click(screen.getByText("Dividendes & intérêts"));
    fireEvent.click(screen.getByText("NVIDIA"));
    expect(
      screen.getAllByText("NVIDIA Corporation").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Entreprise"));
    expect(
      screen.getByText((_, element) =>
        element?.textContent === "Santa Clara, CA · United States",
      ),
    ).toBeInTheDocument();
  });

  it("l'onglet Détails liste les top valeurs de l'ETF", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    fireEvent.click(screen.getByText("MSCI World Swap PEA"));
    fireEvent.click(screen.getByText("Détails"));
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("NVIDIA Corp.")).toBeInTheDocument();
    expect(screen.getByText(/poids cumulé/)).toBeInTheDocument();
  });

  it("l'onglet Diversification montre les pays principaux puis le repli", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    fireEvent.click(screen.getByText("MSCI World Swap PEA"));
    fireEvent.click(screen.getByText("Diversification"));
    expect(screen.getByText("Pays représentés")).toBeInTheDocument();
    expect(screen.getByText("Secteurs")).toBeInTheDocument();
    expect(screen.getByText("États-Unis")).toBeInTheDocument();
  });
  it("l'onglet Diversification déplie « Autres » pour révéler tous les pays", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    fireEvent.click(screen.getByText("MSCI World Swap PEA"));
    fireEvent.click(screen.getByText("Diversification"));
    // replié : seuls les 4 premiers pays + la ligne « Autres » dépliable
    const expand = screen.getAllByRole("button", { name: /Autres/ })[0];
    expect(expand).toBeInTheDocument();
    expect(screen.queryByText("Allemagne")).not.toBeInTheDocument();
    // dépliage : les pays étendus apparaissent avec leurs poids
    fireEvent.click(expand);
    expect(screen.getByText("Allemagne")).toBeInTheDocument();
    expect(screen.getByText("Suisse")).toBeInTheDocument();
    // replier masque à nouveau les pays étendus
    fireEvent.click(screen.getByRole("button", { name: /Replier/ }));
    expect(screen.queryByText("Allemagne")).not.toBeInTheDocument();
  });
  it("l'onglet Détails affiche 10 valeurs puis déplie par 10", () => {
    renderView();
    fireEvent.click(screen.getByText("Frais"));
    fireEvent.click(screen.getByText("MSCI World Swap PEA"));
    fireEvent.click(screen.getByText("Détails"));
    // 10 valeurs visibles pour WPEA (fonds PEA), pas de bouton +
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText(/poids cumulé/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Afficher/ }),
    ).not.toBeInTheDocument();
  });
});
