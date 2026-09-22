import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { tradeRepublicAdapter } from "./trade-republic";

describe("CSV réel Trade Republic (exemple du dépôt)", () => {
  it("reconstruit PEA et CTO avec positions, versements et historique", () => {
    const content = fs.readFileSync("example/TradeRepublicExportExample.csv", "utf8");
    const result = tradeRepublicAdapter.parse(content);
    expect(result.envelopes).toHaveLength(2);

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
    expect(cto.positions).toHaveLength(6);
    expect(cto.depositsCents).toBe(100_859);
  });
});
