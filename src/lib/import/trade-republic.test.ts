import { describe, expect, it } from "vitest";
import { parseCsv, csvToRecords } from "./csv";
import { tradeRepublicAdapter } from "./trade-republic";
import { detectBrokerAdapter, parseBrokerImport } from ".";

const SAMPLE_CSV = [
  '"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency"',
  '"2025-09-25T12:26:05.316Z","2025-09-25","PEA","TRADING","BUY","FUND","MSCI World Swap PEA EUR (Acc)","IE0002XZSHO1","76.0000000000","5.8510000000","-444.68","-1.00","","EUR"',
  '"2025-10-02T09:00:40.627Z","2025-10-02","PEA","TRADING","BUY","FUND","MSCI World Swap PEA EUR (Acc)","IE0002XZSHO1","50.0000000000","5.9500000000","-297.50","","","EUR"',
  '"2025-10-02T09:00:40.627Z","2025-10-02","DEFAULT","TRADING","BUY","STOCK","NVIDIA","US67066G1040","0.6158390000","162.3800000000","-100.00","","","EUR"',
  '"2025-10-03T10:00:00.000Z","2025-10-03","DEFAULT","CASH","DIVIDEND","STOCK","NVIDIA","US67066G1040","1.2084000000","","0.010000","","","EUR"',
  '"2025-10-04T08:00:00.000Z","2025-10-04","DEFAULT","CASH","PRIVATE_MARKET_BUY","PRIVATE_FUND","Private Equity","LU3176111881","","","-5.000000","","","EUR"',
].join("\n");

describe("parseCsv / csvToRecords", () => {
  it("gère les guillemets, virgules et fins de ligne", () => {
    const rows = parseCsv(SAMPLE_CSV);
    expect(rows).toHaveLength(6);
    expect(rows[0][0]).toBe("datetime");
    expect(rows[1][7]).toBe("IE0002XZSHO1");
  });

  it("convertit les lignes en enregistrements par en-tête", () => {
    const records = csvToRecords(SAMPLE_CSV);
    expect(records).toHaveLength(5);
    expect(records[0].symbol).toBe("IE0002XZSHO1");
    expect(records[2].account_type).toBe("DEFAULT");
  });
});

describe("tradeRepublicAdapter", () => {
  it("détecte le format par l'en-tête", () => {
    expect(tradeRepublicAdapter.detect(SAMPLE_CSV)).toBe(true);
    expect(tradeRepublicAdapter.detect("date;type;montant")).toBe(false);
  });

  it("regarde les BUY TRADING uniquement", () => {
    const result = tradeRepublicAdapter.parse(SAMPLE_CSV);
    expect(result.broker).toBe("Trade Republic");
    const pea = result.envelopes.find((e) => e.type === "PEA");
    expect(pea).toBeDefined();
    expect(pea!.positions).toHaveLength(1);
    expect(result.envelopes.find((e) => e.type === "CTO")).toBeDefined();
    const cto = result.envelopes.find((e) => e.type === "CTO")!;
    expect(cto.positions.map((p) => p.isin)).toEqual(["US67066G1040"]);
    expect(result.envelopes.find((e) => e.type === "PRIV")).toBeUndefined();
  });

  it("route un BUY TRADING PRIVATE_FUND vers l'enveloppe Non coté", () => {
    const csv = [
      '"datetime","date","account_type","category","type","asset_class","name","symbol","shares","price","amount","fee","tax","currency"',
      '"2026-05-08T08:29:30.133Z","2026-05-08","DEFAULT","TRADING","BUY","PRIVATE_FUND","Private Equity","LU3176111881","0.0469690000","106.4523000000","","","","EUR"',
    ].join("\n");
    const result = tradeRepublicAdapter.parse(csv);
    const priv = result.envelopes.find((e) => e.type === "PRIV")!;
    expect(priv).toBeDefined();
    expect(priv.name).toBe("Non coté Trade Republic");
    expect(priv.openedAt).toBe("2026-05-08");
    expect(priv.depositsCents).toBe(500);
    expect(priv.positions).toHaveLength(1);
    const position = priv.positions[0];
    expect(position.isin).toBe("LU3176111881");
    expect(position.category).toBe("FUND");
    expect(position.quantity).toBeCloseTo(0.046969, 6);
    expect(position.investedCents).toBe(500);
    expect(position.unitPriceCents).toBe(10_645);
    expect(position.valuations).toEqual([
      { date: "2026-05-08", valueCents: Math.round(0.046969 * 10_645) },
    ]);
  });

  it("cumule parts, investi et valorisations pour un même ISIN", () => {
    const result = tradeRepublicAdapter.parse(SAMPLE_CSV);
    const pea = result.envelopes.find((e) => e.type === "PEA")!;
    const world = pea.positions[0];
    expect(world.quantity).toBe(126);
    expect(world.investedCents).toBe(44468 + 100 + 29750);
    expect(world.unitPriceCents).toBe(595);
    expect(world.firstBoughtAt).toBe("2025-09-25");
    expect(world.valuations).toEqual([
      { date: "2025-09-25", valueCents: 76 * 585 },
      { date: "2025-10-02", valueCents: 126 * 595 },
    ]);
  });

  it("calcule les versements cumulés par enveloppe", () => {
    const result = tradeRepublicAdapter.parse(SAMPLE_CSV);
    const pea = result.envelopes.find((e) => e.type === "PEA")!;
    const cto = result.envelopes.find((e) => e.type === "CTO")!;
    expect(pea.depositsCents).toBe(44468 + 100 + 29750);
    expect(cto.depositsCents).toBe(10000);
    expect(pea.openedAt).toBe("2025-09-25");
  });

  it("compte les lignes ignorées (dividendes, cash, etc.)", () => {
    const result = tradeRepublicAdapter.parse(SAMPLE_CSV);
    expect(result.skippedRows).toBe(2);
  });
});

describe("detectBrokerAdapter / parseBrokerImport", () => {
  it("retourne l'adaptateur Trade Republic", () => {
    expect(detectBrokerAdapter(SAMPLE_CSV)?.id).toBe("trade-republic");
  });

  it("lève une erreur pour un format inconnu", () => {
    expect(() => parseBrokerImport("foo,bar\n1,2")).toThrow("Format de fichier non reconnu");
  });
});
