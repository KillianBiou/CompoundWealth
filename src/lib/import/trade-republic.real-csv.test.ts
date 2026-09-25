import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { tradeRepublicAdapter } from "./trade-republic";

describe("CSV réel Trade Republic (exemple du dépôt)", () => {
  it("reconstruit PEA et CTO avec positions, versements et historique", () => {
    const content = fs.readFileSync("example/TradeRepublicExportExample.csv", "utf8");
    const result = tradeRepublicAdapter.parse(content);
    expect(result.envelopes).toHaveLength(3);
    const pea = result.envelopes.find((e) => e.type === "PEA")!;
    expect(pea.positions).toHaveLength(4);
    expect(pea.depositsCents).toBe(1_045_206);
    expect(pea.openedAt).toBe("2025-09-25");
    const world = pea.positions.find((p) => p.isin === "IE0002XZSHO1")!;
    expect(world.quantity).toBeCloseTo(1131, 5);
    expect(world.investedCents).toBe(741_064);
    expect(world.unitPriceCents).toBe(692);
    expect(world.valuations.length).toBeGreaterThanOrEqual(12);
    expect(world.valuations[world.valuations.length - 1].date).toBe("2026-09-02");
    const cto = result.envelopes.find((e) => e.type === "CTO")!;
    expect(cto.positions).toHaveLength(4);
    expect(cto.depositsCents).toBe(93_859);
  });

  it("isole les fonds non cotés (Private Markets) dans une enveloppe PRIV dédiée", () => {
    const content = fs.readFileSync("example/TradeRepublicExportExample.csv", "utf8");
    const result = tradeRepublicAdapter.parse(content);
    const priv = result.envelopes.find((e) => e.type === "PRIV")!;
    expect(priv).toBeDefined();
    expect(priv.name).toBe("Non coté Trade Republic");
    expect(priv.positions).toHaveLength(2);
    expect(priv.depositsCents).toBe(7_000);
    expect(priv.openedAt).toBe("2026-05-08");
    const eqt = priv.positions.find((p) => p.isin === "LU3176111881")!;
    expect(eqt.category).toBe("FUND");
    expect(eqt.quantity).toBeCloseTo(0.3235, 4);
    expect(eqt.investedCents).toBe(3_500);
    expect(eqt.valuations).toHaveLength(5);
    expect(eqt.valuations[eqt.valuations.length - 1]).toEqual({
      date: "2026-09-03",
      valueCents: Math.round(0.3235 * 10_957),
    });
    const apollo = priv.positions.find((p) => p.isin === "LU3170240538")!;
    expect(apollo.category).toBe("FUND");
    expect(apollo.quantity).toBeCloseTo(0.322, 4);
    expect(apollo.investedCents).toBe(3_500);
  });
});
