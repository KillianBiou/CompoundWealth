import { describe, expect, it } from "vitest";
import { parseEtfDetailCsv, getEtfDetailByIsin, getAllEtfDetails } from "./etf-detail";
import {
  buildSimulatorDefaults,
  DEFAULT_EQUITY_RETURN,
  historicalCagr,
  simulateTwoTracks,
} from "./scanners";
import type { AnalysisPosition } from "./scanners";

const CSV = `isin,ticker,ticker_yahoo,name,emitter,index_tracked,asset_class,region,sector_focus,ter,replication,distributing,dividend_yield_2023,dividend_yield_2024,dividend_yield_2025,currency,exchange,domicile,ucits,pea_eligible,established,fund_size_musd,holdings_count,notes
IE0002XZSHO1,WPEA,WPEA.PA,"iShares MSCI World Swap PEA UCITS ETF EUR (Acc)",BlackRock,MSCI World Swap PEA,Equity,World,All sectors,0.25,Swap,False,0,0,0,EUR,Euronext Paris,Ireland,True,True,2018,6300,1350,"USER HOLDING; swap-based PEA World; capitalizing"
IE00BP3QZJ36,IFRE,IS3U.DE,iShares MSCI France UCITS ETF,BlackRock,MSCI France,Equity,France,All sectors,0.25,Physical,True,3.1,3.2,3.0,EUR,Xetra,Ireland,True,True,2012,1200,75,"USER HOLDING (alias IFRE on Euronext; Yahoo IS3U); distributing"`;

describe("parseEtfDetailCsv", () => {
  it("parse les 134 ETF du fichier réel du dépôt", () => {
    const details = getAllEtfDetails();
    expect(details.length).toBeGreaterThanOrEqual(120);
    const wpea = getEtfDetailByIsin("IE0002XZSHO1");
    expect(wpea).not.toBeNull();
    expect(wpea!.ter).toBeCloseTo(0.002, 6);
    expect(wpea!.distributing).toBe(false);
    expect(wpea!.userHolding).toBe(true);
    expect(wpea!.region).toBe("World");
    expect(wpea!.topHoldings.length).toBeGreaterThan(0);
    expect(wpea!.countries.length).toBeGreaterThan(0);
    expect(wpea!.sectors.length).toBeGreaterThan(0);
  });

  it("convertit les pourcents en fractions (TER 0,25 → 0,0025)", () => {
    const parsed = parseEtfDetailCsv(CSV);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].ter).toBeCloseTo(0.0025, 6);
    expect(parsed[1].dividendYield2025).toBeCloseTo(0.03, 6);
    expect(parsed[1].distributing).toBe(true);
  });

  it("ignore les lignes sans ISIN valide", () => {
    const bad = `isin,ticker
XXXX,ABC`;
    expect(parseEtfDetailCsv(bad)).toHaveLength(0);
  });

  it("retourne une liste vide pour un contenu vide", () => {
    expect(parseEtfDetailCsv("")).toHaveLength(0);
  });
});

describe("historicalCagr", () => {
  const now = new Date("2026-09-24T12:00:00Z");

  it("calcule un CAGR positif en neutralisant les versements", () => {
    // V_start 10 000 → V_end 12 000 sur ~1 an, 1 000 € versés en cours de route
    // gain réel = 12 000 − 10 000 − 1 000 = 1 000 → 10 % sur un an
    const valuations = [
      { date: new Date("2025-09-01"), valueCents: 1_000_000 },
      { date: new Date("2026-09-24"), valueCents: 1_200_000 },
    ];
    const invested = [
      { date: new Date("2025-09-01"), valueCents: 1_000_000 },
      { date: new Date("2026-03-01"), valueCents: 1_100_000 },
    ];
    const cagr = historicalCagr(valuations, invested, now);
    expect(cagr).not.toBeNull();
    expect(cagr!).toBeCloseTo(0.1, 1);
  });

  it("retourne null si l'historique est trop court (< 6 mois)", () => {
    const valuations = [
      { date: new Date("2026-07-01"), valueCents: 1_000_000 },
      { date: new Date("2026-09-01"), valueCents: 1_050_000 },
    ];
    expect(historicalCagr(valuations, [], now)).toBeNull();
  });

  it("ne gonfle pas le rendement quand les versements dominent (DCA)", () => {
    // départ à 1 000 €, 12 versements de 500 €, valeur finale 7 200 € sur ~1 an
    // l'ancienne formule (gain / capital initial) donnait ~+68 %/an ;
    // pondéré par le temps, le rendement réel est modeste
    const valuations = [
      { date: new Date("2025-09-01"), valueCents: 100_000 },
      ...Array.from({ length: 12 }, (_, i) => ({
        date: new Date(2025, 9 + i, 1),
        valueCents: 100_000 + (i + 1) * 50_000 + (i + 1) * 1_000,
      })),
    ];
    const invested = [
      { date: new Date("2025-09-01"), valueCents: 100_000 },
      ...Array.from({ length: 12 }, (_, i) => ({
        date: new Date(2025, 9 + i, 1),
        valueCents: 100_000 + (i + 1) * 50_000,
      })),
    ];
    const cagr = historicalCagr(valuations, invested, now);
    expect(cagr).not.toBeNull();
    expect(cagr!).toBeLessThan(0.25);
    expect(cagr!).toBeGreaterThan(0);
  });
});

describe("buildSimulatorDefaults", () => {
  const now = new Date("2026-09-24T12:00:00Z");

  function position(overrides: Partial<AnalysisPosition> = {}): AnalysisPosition {
    return {
      id: "p1",
      name: "World",
      isin: "IE0002XZSHO1",
      symbol: null,
      envelopeId: "e1",
      envelopeName: "PEA",
      envelopeType: "PEA",
      category: "ETF",
      valueCents: 50_000_00,
      investedCents: 45_000_00,
      ter: 0.0025,
      boughtAt: new Date("2025-09-01"),
      investments: [{ date: new Date("2026-09-01"), amountCents: 30_000_00 }],
      cashIncomeCents: [],
      isStock: false,
      ...overrides,
    };
  }

  it("sépare l'investissement de l'épargne ; défaut = DCA actif uniquement", () => {
    const positions = [
      position(),
      position({
        id: "p2",
        envelopeType: "LIVRET_A",
        category: "LIVRET_A",
        valueCents: 8_000_00,
        investments: [],
      }),
    ];
    const defaults = buildSimulatorDefaults({
      positions,
      equityValuations: [],
      equityInvested: [],
      dcaMonthlyCents: 40_000,
      savingsRate: 0.017,
      now,
    });
    expect(defaults.investedWealthCents).toBe(50_000_00);
    expect(defaults.savingsWealthCents).toBe(8_000_00);
    expect(defaults.monthlySavingsCents).toBe(40_000);
    expect(defaults.monthlyDcaCents).toBe(40_000);
    expect(defaults.savingsReturn).toBe(0.017);
    // pas d'historique exploitable → moyenne long terme
    expect(defaults.returnSource).toBe("moyenne");
    expect(defaults.equityReturn).toBe(DEFAULT_EQUITY_RETURN);
  });

  it("utilise le CAGR historique quand il est exploitable", () => {
    const positions = [position()];
    const valuations = [
      { date: new Date("2025-09-01"), valueCents: 1_000_000 },
      { date: new Date("2026-09-24"), valueCents: 1_100_000 },
    ];
    const invested = [
      { date: new Date("2025-09-01"), valueCents: 1_000_000 },
    ];
    const defaults = buildSimulatorDefaults({
      positions,
      equityValuations: valuations,
      equityInvested: invested,
      dcaMonthlyCents: 0,
      savingsRate: 0.017,
      now,
    });
    expect(defaults.returnSource).toBe("historique");
    expect(defaults.equityReturn).not.toBe(DEFAULT_EQUITY_RETURN);
  });
});

describe("simulateTwoTracks", () => {
  it("compose l'investissement au rendement actions et l'épargne au taux livret", () => {
    const result = simulateTwoTracks({
      investedWealthCents: 100_000_00,
      savingsWealthCents: 20_000_00,
      monthlyInvestedCents: 30_000,
      monthlySavingsCents: 10_000,
      equityReturn: 0.07,
      savingsReturn: 0.017,
      inflation: 0.02,
      horizonYears: 10,
    });
    expect(result.points).toHaveLength(11);
    const first = result.points[0];
    const last = result.points[10];
    expect(first.totalCents).toBe(120_000_00);
    // l'investissement croît plus vite que l'épargne
    expect(last.investedCents).toBeGreaterThan(last.savingsCents);
    // euros constants sous le nominal
    expect(last.totalRealCents).toBeLessThan(last.totalCents);
  });

  it("l'épargne seule progresse au taux livret sans composition actions", () => {
    const result = simulateTwoTracks({
      investedWealthCents: 0,
      savingsWealthCents: 10_000_00,
      monthlyInvestedCents: 0,
      monthlySavingsCents: 0,
      equityReturn: 0.07,
      savingsReturn: 0.017,
      inflation: 0.0,
      horizonYears: 1,
    });
    expect(result.points[1].savingsCents).toBeCloseTo(1_017_100, -3);
  });
});
