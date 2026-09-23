import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WealthChart } from "./wealth-chart";
import type { ValuationPoint } from "@/lib/portfolio/series";

const areaRenders: { dataKey: string | undefined; hide: boolean | undefined }[] = [];

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: (props: { dataKey?: string; hide?: boolean }) => {
    areaRenders.push({ dataKey: props.dataKey, hide: props.hide });
    return <div data-testid={`area-${props.dataKey}`} />;
  },
  Line: () => <div />,
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

const day = 24 * 60 * 60 * 1000;
const now = Date.now();
const valuations: ValuationPoint[] = [
  { date: new Date(now - 30 * day), valueCents: 1_000_000 },
  { date: new Date(now - 15 * day), valueCents: 1_100_000 },
  { date: new Date(now), valueCents: 1_200_000 },
];
const invested: ValuationPoint[] = [
  { date: new Date(now - 30 * day), valueCents: 900_000 },
  { date: new Date(now), valueCents: 900_000 },
];
const savingsSeries: ValuationPoint[] = [
  { date: new Date(now - 30 * day), valueCents: 2_000_000 },
  { date: new Date(now), valueCents: 2_050_000 },
];
const equitySeries: ValuationPoint[] = [...valuations];

describe("WealthChart ordre d'empilement", () => {
  it("l'épargne est toujours rendue avant les actions, quel que soit l'ordre des toggles", async () => {
    areaRenders.length = 0;
    const { rerender } = render(
      <WealthChart
        valuations={valuations}
        envelopeToggles={[
          { id: "pea", label: "PEA", kind: "equity", series: equitySeries, investedSeries: invested },
          { id: "livret", label: "Livret A", kind: "savings", series: savingsSeries },
        ]}
        visible={{ pea: true, livret: true }}
        onToggleEnvelope={vi.fn()}
      />,
    );
    // toggle la épargne off puis on dans un ordre quelconque
    rerender(
      <WealthChart
        valuations={valuations}
        envelopeToggles={[
          { id: "pea", label: "PEA", kind: "equity", series: equitySeries, investedSeries: invested },
          { id: "livret", label: "Livret A", kind: "savings", series: savingsSeries },
        ]}
        visible={{ pea: true, livret: false }}
        onToggleEnvelope={vi.fn()}
      />,
    );
    rerender(
      <WealthChart
        valuations={valuations}
        envelopeToggles={[
          { id: "livret", label: "Livret A", kind: "savings", series: savingsSeries },
          { id: "pea", label: "PEA", kind: "equity", series: equitySeries, investedSeries: invested },
        ]}
        visible={{ livret: true, pea: true }}
        onToggleEnvelope={vi.fn()}
      />,
    );
    // à chaque rendu, la première Area est l'épargne, la deuxième les actions
    const savingsIdx = areaRenders.findIndex((r) => r.dataKey === "savings");
    const equityIdx = areaRenders.findIndex((r) => r.dataKey === "equity");
    expect(savingsIdx).toBeGreaterThanOrEqual(0);
    expect(equityIdx).toBeGreaterThan(savingsIdx);
    // les deux séries sont toujours montées : l'ordre ne peut pas être permuté au remontage
    const savingsRendered = areaRenders.filter((r) => r.dataKey === "savings");
    const equityRendered = areaRenders.filter((r) => r.dataKey === "equity");
    expect(savingsRendered.length).toBeGreaterThan(1);
    expect(equityRendered.length).toBeGreaterThan(1);
    expect(screen.getByTestId("area-savings")).toBeInTheDocument();
    expect(screen.getByTestId("area-equity")).toBeInTheDocument();
  });

  it("masque l'épargne sans la démonter quand aucune enveloppe épargne n'est visible", () => {
    areaRenders.length = 0;
    render(
      <WealthChart
        valuations={valuations}
        envelopeToggles={[
          { id: "pea", label: "PEA", kind: "equity", series: equitySeries, investedSeries: invested },
          { id: "livret", label: "Livret A", kind: "savings", series: savingsSeries },
        ]}
        visible={{ pea: true, livret: false }}
        onToggleEnvelope={vi.fn()}
      />,
    );
    expect(areaRenders.find((r) => r.dataKey === "savings")?.hide).toBe(true);
    expect(areaRenders.find((r) => r.dataKey === "equity")?.hide).toBe(false);
  });

  it("la performance « hors versements » inclut l'investi d'épargne : un dépôt livret n'est pas compté comme du gain", () => {
    areaRenders.length = 0;
    // Épargne : dépôt de 20 000 € à mi-période, puis 500 € d'intérêts
    const savingsInvested: ValuationPoint[] = [
      { date: new Date(now - 30 * day), valueCents: 0 },
      { date: new Date(now - 15 * day), valueCents: 2_000_000 },
    ];
    const savingsSeriesWithDeposit: ValuationPoint[] = [
      { date: new Date(now - 30 * day), valueCents: 0 },
      { date: new Date(now - 15 * day), valueCents: 2_000_000 },
      { date: new Date(now), valueCents: 2_050_000 },
    ];
    // Actions : 9 000 € investis, valent 9 500 € en fin de période (+500 €)
    const equityInvested: ValuationPoint[] = [
      { date: new Date(now - 30 * day), valueCents: 900_000 },
    ];
    const equitySeriesFinal: ValuationPoint[] = [
      { date: new Date(now - 30 * day), valueCents: 900_000 },
      { date: new Date(now), valueCents: 950_000 },
    ];
    // Patrimoine total = épargne + actions
    const totalValuations: ValuationPoint[] = [
      { date: new Date(now - 30 * day), valueCents: 900_000 },
      { date: new Date(now - 15 * day), valueCents: 2_900_000 },
      { date: new Date(now), valueCents: 3_000_000 },
    ];
    render(
      <WealthChart
        valuations={totalValuations}
        envelopeToggles={[
          {
            id: "livret",
            label: "Livret A",
            kind: "savings",
            series: savingsSeriesWithDeposit,
            investedSeries: savingsInvested,
          },
          {
            id: "pea",
            label: "PEA",
            kind: "equity",
            series: equitySeriesFinal,
            investedSeries: equityInvested,
          },
        ]}
        visible={{ livret: true, pea: true }}
        onToggleEnvelope={vi.fn()}
      />,
    );
    // Gain réel : 500 € d'intérêts livret + 500 € de plus-value actions = 1 000 €
    expect(screen.getByText(/1[\s\u00A0\u202F]000,00[\s\u00A0\u202F]€/)).toBeInTheDocument();
    // Ancien bug : les 20 000 € de dépôt livret comptaient comme gain (+21 000 €)
    expect(screen.queryByText(/21[\s\u00A0\u202F]000,00[\s\u00A0\u202F]€/)).not.toBeInTheDocument();
  });
});
