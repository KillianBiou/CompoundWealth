import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithI18n } from "../../../../../tests/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LivretChart, type LivretPointRow } from "./livret-chart";

const day = 24 * 60 * 60 * 1000;
const now = Date.now();

const chartData: { date: number }[][] = [];

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart-container">{children}</div>
  ),
  AreaChart: ({
    children,
    data,
  }: {
    children: React.ReactNode;
    data: { date: number }[];
  }) => {
    chartData.push(data);
    return <div>{children}</div>;
  },
  Area: () => <div />,
  CartesianGrid: () => <div />,
  ReferenceLine: () => <div />,
  Tooltip: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
}));

function makeSeries(): LivretPointRow[] {
  const points: LivretPointRow[] = [];
  // un an d'historique (quinzaines ~15 j) puis 12 mois de projection
  for (let offset = -400; offset <= 360; offset += 15) {
    points.push({
      date: new Date(now + offset * day),
      balanceCents: Math.max(0, 100_000 + offset * 100),
      overCapCents: 0,
    });
  }
  return points;
}

describe("LivretChart", () => {
  beforeEach(() => {
    chartData.length = 0;
  });

  it("n'affiche que l'histoire : aucun point dans le futur", () => {
    renderWithI18n(
      <LivretChart series={makeSeries()} showCap={false} onToggleCap={vi.fn()} />,
    );
    const data = chartData[chartData.length - 1];
    expect(data.length).toBeGreaterThan(0);
    const dates = data.map((p) => p.date);
    expect(Math.max(...dates)).toBeLessThanOrEqual(now);
    // grille quinzaine : le dernier point passé est à moins de 15 j de maintenant
    expect(Math.max(...dates)).toBeGreaterThan(now - 16 * day);
  });

  it("sélecteur de période : le bouton 1 mois limite la fenêtre à ~30 jours", async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <LivretChart series={makeSeries()} showCap={false} onToggleCap={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "1 mois" }));
    const data = chartData[chartData.length - 1];
    const dates = data.map((p) => p.date);
    expect(Math.max(...dates)).toBeLessThanOrEqual(now);
    // ancre = dernier point avant la fenêtre (≤ cutoff, à moins de 15 j avant) :
    // pas de backfill avant le premier versement
    expect(Math.min(...dates)).toBeGreaterThan(now - 45 * day);
    expect(Math.min(...dates)).toBeLessThanOrEqual(now - 30 * day);
  });

  it("les 7 boutons de période sont rendus, tout sélectionné par défaut", () => {
    renderWithI18n(
      <LivretChart series={makeSeries()} showCap={false} onToggleCap={vi.fn()} />,
    );
    for (const label of ["1 sem", "1 mois", "3 mois", "6 mois", "1 an", "2 ans", "Tout"]) {
      expect(screen.getByRole("button", { name: label })).toBeTruthy();
    }
    expect(screen.getByRole("button", { name: "Tout" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("série vide : message d'aide", () => {
    renderWithI18n(
      <LivretChart series={[]} showCap={false} onToggleCap={vi.fn()} />,
    );
    expect(
      screen.getByText("Ajoutez un premier versement pour voir l'évolution de votre livret."),
    ).toBeTruthy();
  });
});
