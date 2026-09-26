import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "../../../../tests/test-utils";
import { GoalCard, needsAttention, statusTone } from "./goal-card";
import type { GoalSummary } from "@/server/queries";
import type { GoalStatus } from "@/lib/goals/progress";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

function makeGoal(overrides: Partial<GoalSummary> = {}): GoalSummary {
  return {
    id: "goal-1",
    type: "DOWN_PAYMENT",
    name: "Apport appartement",
    icon: "target",
    targetAmountCents: 6_000_000,
    targetRentCents: null,
    targetMonths: null,
    targetDate: new Date("2029-06-01"),
    withdrawalRate: null,
    monthlyExpensesCents: null,
    monthlyContributionCents: 50_000,
    createdAt: new Date("2024-01-01"),
    envelopes: [
      {
        id: "env-1",
        name: "PEA Bourse",
        type: "PEA",
        broker: "Trade Republic",
        valueCents: 1_820_000,
        series: [],
        dcaMonthlyCents: 10_000,
        closedAt: null,
      },
    ],
    linkedValueCents: 1_820_000,
    effectiveMonthlyContributionCents: 60_000,
    metrics: {
      progress: 1_820_000 / 6_000_000,
      displayProgress: 1_820_000 / 6_000_000,
      requiredTrajectory: 0.4,
      monthsCovered: null,
      currentRentCents: null,
      capitalTargetCents: 6_000_000,
      requiredReturn: 0.12,
      realisticReturn: 0.06,
      requiredMonthlySavingsCents: 100_000,
      requiredMonthlySavingsAtReturnCents: 80_000,
      status: "underfunded",
    },
    monthlySeries: [],
    linkedSeries: [],
    ...overrides,
  };
}

describe("GoalCard", () => {
  it("affiche actuel et cible en évidence avec la flèche, et le statut en badge", () => {
    renderWithI18n(<GoalCard goal={makeGoal()} />);
    expect(screen.getByText("Apport appartement")).toBeTruthy();
    // actuel → cible en évidence
    expect(screen.getAllByText(/18 200,00 €/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/60 000,00 €/).length).toBeGreaterThanOrEqual(1);
    // statut sous-financé = warning
    expect(screen.getByText("Sous-financé")).toBeTruthy();
    // pourcentage de progression affiché
    expect(screen.getByText("30 %")).toBeTruthy();
  });

  it("cliquable → /buts/[id]", () => {
    renderWithI18n(<GoalCard goal={makeGoal()} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/buts/goal-1");
  });

  it("matelas : affiche les mois de couverture actuels / cibles", () => {
    const goal = makeGoal({
      id: "goal-sn",
      type: "SAFETY_NET",
      name: "Matelas de sécurité",
      targetAmountCents: null,
      targetMonths: 6,
      monthlyExpensesCents: 150_000,
      linkedValueCents: 600_000,
      metrics: {
        progress: 4 / 6,
        displayProgress: 4 / 6,
        requiredTrajectory: 0,
        monthsCovered: 4,
        currentRentCents: null,
        capitalTargetCents: 900_000,
        requiredReturn: null,
        realisticReturn: null,
        requiredMonthlySavingsCents: 300_000,
        requiredMonthlySavingsAtReturnCents: null,
        status: "onTrack",
      },
    });
    renderWithI18n(<GoalCard goal={goal} />);
    expect(screen.getByText(/6 mois/)).toBeTruthy();
    expect(screen.getByText("Sur la bonne voie")).toBeTruthy();
  });

  it("barre de progression plafonnée à 100 % même surfinancé", () => {
    const goal = makeGoal({
      metrics: {
        progress: 1.8,
        displayProgress: 1,
        requiredTrajectory: 0.4,
        monthsCovered: null,
        currentRentCents: null,
        capitalTargetCents: 6_000_000,
        requiredReturn: null,
        realisticReturn: null,
        requiredMonthlySavingsCents: 0,
        requiredMonthlySavingsAtReturnCents: null,
        status: "overfunded",
      },
    });
    renderWithI18n(<GoalCard goal={goal} />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
  });

  it("FIRE : rente actuelle en évidence et capital équivalent", () => {
    const goal = makeGoal({
      id: "goal-fire",
      type: "FIRE",
      name: "Ma rente",
      targetAmountCents: null,
      targetRentCents: 85_000,
      withdrawalRate: 0.04,
      linkedValueCents: 12_720_000,
      metrics: {
        progress: 12_720_000 / 25_500_000,
        displayProgress: 12_720_000 / 25_500_000,
        requiredTrajectory: 0.2,
        monthsCovered: null,
        currentRentCents: 42_400,
        capitalTargetCents: 25_500_000,
        requiredReturn: null,
        realisticReturn: null,
        requiredMonthlySavingsCents: 100_000,
        requiredMonthlySavingsAtReturnCents: null,
        status: "onTrack",
      },
    });
    renderWithI18n(<GoalCard goal={goal} />);
    expect(screen.getAllByText(/424,00 €/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/850,00 €/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/255 000,00 €/).length).toBeGreaterThanOrEqual(1);
  });
});

describe("statusTone / needsAttention", () => {
  it("sémantique des tons : atteint/bonne voie = positive, alerte/retard = negative", () => {
    expect(statusTone("achieved")).toBe("positive");
    expect(statusTone("onTrack")).toBe("positive");
    expect(statusTone("alert")).toBe("negative");
    expect(statusTone("late")).toBe("negative");
    expect(statusTone("compromised")).toBe("warning");
    expect(statusTone("underfunded")).toBe("warning");
    expect(statusTone("surplus")).toBe("accent");
    expect(statusTone("overfunded")).toBe("neutral");
  });

  it("needsAttention : compromis, sous-financé, en retard, alerte", () => {
    const attention: GoalStatus[] = ["compromised", "underfunded", "late", "alert"];
    for (const s of attention) expect(needsAttention(s)).toBe(true);
    const fine: GoalStatus[] = ["onTrack", "achieved", "surplus", "overfunded"];
    for (const s of fine) expect(needsAttention(s)).toBe(false);
  });
});
