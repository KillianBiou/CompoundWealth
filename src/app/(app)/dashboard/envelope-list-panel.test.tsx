import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithToast } from "../../../../tests/test-utils";
import { EnvelopeListPanel } from "./envelope-list-panel";
import type { EnvelopeSummary } from "@/server/queries";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const equityEnvelope: EnvelopeSummary = {
  id: "env-pea",
  type: "PEA",
  name: "PEA Croissance",
  broker: "Trade Republic",
  openedAt: new Date("2024-06-01"),
  closedAt: null,
  investedCents: 1_000_000,
  hasUnknownInvested: false,
  valueCents: 1_200_000,
  gainCents: 200_000,
  positionsCount: 3,
  series: [],
  investedSeries: [],
  envelopeType: "PEA",
  dcaMonthlyCents: 15_000,
  dcaMonthlyPayments: 2,
};

const savingsEnvelope: EnvelopeSummary = {
  id: "env-livret",
  type: "LIVRET_A",
  name: "Livret A Banque",
  broker: null,
  openedAt: new Date("2025-01-27"),
  closedAt: null,
  investedCents: 30_000_000,
  hasUnknownInvested: false,
  valueCents: 30_100_000,
  gainCents: 100_000,
  positionsCount: 0,
  series: [],
  investedSeries: [],
  envelopeType: "LIVRET_A",
  overCapCents: 7_050_000,
};

function renderPanel(
  visible: Record<string, boolean> = {},
  overrides: Partial<Parameters<typeof EnvelopeListPanel>[0]> = {},
) {
  const onToggleEnvelope = vi.fn();
  const onToggleCategory = vi.fn();
  const allVisible = {
    "env-pea": true,
    "env-livret": true,
    ...visible,
  };
  renderWithToast(
    <EnvelopeListPanel
      envelopes={[equityEnvelope, savingsEnvelope]}
      visible={allVisible}
      onToggleEnvelope={onToggleEnvelope}
      onToggleCategory={onToggleCategory}
      {...overrides}
    />,
  );
  return { onToggleEnvelope, onToggleCategory };
}

describe("EnvelopeListPanel", () => {
  it("regroupe les enveloppes par catégorie Épargne et Investissement", () => {
    renderPanel();
    expect(screen.getByText("Épargne")).toBeInTheDocument();
    expect(screen.getByText("Investissement")).toBeInTheDocument();
    expect(screen.getByText("PEA Croissance")).toBeInTheDocument();
    expect(screen.getByText("Livret A Banque")).toBeInTheDocument();
  });

  it("affiche le total de chaque catégorie", () => {
    renderPanel();
    expect(screen.getAllByText(/301[\s\u00A0\u202F]000,00[\s\u00A0\u202F]€/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/12[\s\u00A0\u202F]000,00[\s\u00A0\u202F]€/).length).toBeGreaterThan(0);
  });

  it("affiche le DCA mensuel d'une enveloppe d'investissement", () => {
    renderPanel();
    expect(screen.getByText(/DCA 1 mois :/)).toBeInTheDocument();
    expect(screen.getByText(/150,00[\s\u00A0\u202F]€/)).toBeInTheDocument();
  });

  it("signale le dépassement de plafond du livret A", () => {
    renderPanel();
    expect(screen.getAllByText(/au-dessus du plafond|hors plafond/).length).toBeGreaterThan(0);
  });

  it("bascule la visibilité d'une enveloppe individuelle", async () => {
    const { onToggleEnvelope } = renderPanel();
    const toggles = screen
      .getAllByRole("switch")
      .filter((el) => el.getAttribute("aria-label")?.includes("PEA Croissance"));
    expect(toggles.length).toBeGreaterThan(0);
    await userEvent.click(toggles[0]);
    expect(onToggleEnvelope).toHaveBeenCalledWith("env-pea");
  });

  it("bascule toute une catégorie via le header", async () => {
    const { onToggleCategory } = renderPanel();
    const labels = screen
      .getAllByRole("switch")
      .filter((el) => el.getAttribute("aria-label")?.includes("catégorie entière"));
    expect(labels.length).toBe(2);
    await userEvent.click(labels[0]);
    expect(onToggleCategory).toHaveBeenCalledWith("savings");
  });

  it("propose les trois dispositions depuis le groupe de boutons", async () => {
    renderPanel();
    const group = screen.getByRole("group", { name: "Disposition des enveloppes" });
    expect(within(group).getByTitle("Détaillée")).toBeInTheDocument();
    expect(within(group).getByTitle("Semi-compacte")).toBeInTheDocument();
    expect(within(group).getByTitle("Compacte")).toBeInTheDocument();
  });

  it("affiche une ligne compacte par enveloppe en vue compacte", async () => {
    renderPanel();
    await userEvent.click(screen.getByTitle("Compacte"));
    expect(screen.getAllByText("PEA Croissance").length).toBeGreaterThan(0);
  });

  it("replie et déplie une catégorie", async () => {
    renderPanel();
    const buttons = screen
      .getAllByRole("button")
      .filter((el) => el.getAttribute("aria-expanded") !== null);
    const savingsHeader = buttons.find((el) => el.textContent?.includes("Épargne"));
    expect(savingsHeader).toBeTruthy();
    expect(screen.getByText("Livret A Banque")).toBeInTheDocument();
    await userEvent.click(savingsHeader!);
    expect(screen.queryByText("Livret A Banque")).not.toBeInTheDocument();
    await userEvent.click(savingsHeader!);
    expect(screen.getByText("Livret A Banque")).toBeInTheDocument();
  });

});
