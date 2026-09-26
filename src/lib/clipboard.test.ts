import { describe, expect, it, vi } from "vitest";
import {
  copyTextToClipboard,
  envelopeToMarkdown,
  envelopesToMarkdown,
  type ClipboardEnvelope,
} from "./clipboard";

const peaNvelope: ClipboardEnvelope = {
  name: "PEA Trade Republic",
  type: "PEA",
  broker: "Trade Republic",
  openedAt: new Date("2024-01-15"),
  valueCents: 11_231_00,
  investedCents: 10_450_00,
  positions: [
    {
      name: "iShares MSCI World Swap PEA",
      symbol: "WPEA",
      isin: "IE0002XZSHO1",
      category: "ETF",
      quantity: 12.5,
      investedCents: 10_450_00,
      currentValueCents: 11_231_00,
      boughtAt: new Date("2024-01-15"),
      valuationDate: new Date("2025-02-28"),
      investments: [
        { date: new Date("2024-01-15"), amountCents: 5_000_00 },
        { date: new Date("2024-02-15"), amountCents: 5_450_00 },
      ],
    },
  ],
  dcaLines: [
    {
      isin: "IE0002XZSHO1",
      name: "iShares MSCI World Swap PEA",
      maxAmountCents: 750_00,
      frequency: "MONTHLY",
    },
  ],
};

const livret: ClipboardEnvelope = {
  name: "Livret A",
  type: "LIVRET_A",
  broker: null,
  openedAt: null,
  valueCents: 30_500_00,
  investedCents: 30_000_00,
  positions: [],
  deposits: [
    { date: new Date("2024-01-15"), amountCents: 20_000_00 },
    { date: new Date("2024-06-15"), amountCents: 10_000_00 },
  ],
  interestRate: 0.017,
};

describe("envelopeToMarkdown", () => {
  it("inclut nom, type, courtier, valeurs et positions", () => {
    const md = envelopeToMarkdown(peaNvelope);
    expect(md).toContain("PEA Trade Republic");
    expect(md).toContain("PEA");
    expect(md).toContain("courtier : Trade Republic");
    expect(md).toContain("valeur : 11231.00 €");
    expect(md).toContain("investi : 10450.00 €");
    expect(md).toContain("iShares MSCI World Swap PEA");
    expect(md).toContain("ISIN IE0002XZSHO1");
    expect(md).toContain("12.5 parts");
    expect(md).toContain("premier achat 2024-01-15");
  });

  it("liste les versements détaillés d'une position", () => {
    const md = envelopeToMarkdown(peaNvelope);
    expect(md).toContain("versements : 2024-01-15 : 5000.00 € ; 2024-02-15 : 5450.00 €");
  });

  it("liste les lignes DCA actives", () => {
    const md = envelopeToMarkdown(peaNvelope);
    expect(md).toContain("DCA actifs");
    expect(md).toContain("750.00 € · MONTHLY");
  });

  it("sérialise un livret avec taux et dépôts", () => {
    const md = envelopeToMarkdown(livret);
    expect(md).toContain("Livret A");
    expect(md).toContain("taux : 1,70 %/an");
    expect(md).toContain("Dépôts");
    expect(md).toContain("- 2024-01-15 : 20000.00 €");
    expect(md).not.toContain("Positions");
  });

  it("affiche « ? » quand l'investi est inconnu (état des lieux)", () => {
    const md = envelopeToMarkdown({
      ...peaNvelope,
      investedCents: null,
      positions: [
        { ...peaNvelope.positions[0], investedCents: null },
      ],
    });
    // l'en-tête omet l'investi global inconnu, la position affiche « ? »
    expect(md).not.toContain("investi :");
    expect(md).toContain("investi ? €");
  });
});

describe("envelopesToMarkdown", () => {
  it("produit un document avec en-tête daté et toutes les enveloppes", () => {
    const md = envelopesToMarkdown([peaNvelope, livret]);
    expect(md).toContain("# Portefeuille CompoundWealth");
    expect(md).toContain("PEA Trade Republic");
    expect(md).toContain("Livret A");
  });

  it("retourne seulement l'en-tête sans enveloppes", () => {
    const md = envelopesToMarkdown([]);
    expect(md).toContain("# Portefeuille CompoundWealth");
    expect(md).not.toContain("###");
  });
});

describe("copyTextToClipboard", () => {
  it("utilise l'API clipboard et retourne true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const ok = await copyTextToClipboard("test");
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("test");
  });

  it("retourne false si les deux méthodes échouent", async () => {
    Object.assign(navigator, { clipboard: { writeText: () => Promise.reject() } });
    document.execCommand = () => false;
    const ok = await copyTextToClipboard("test");
    expect(ok).toBe(false);
  });
});
