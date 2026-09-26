import { describe, expect, it } from "vitest";
import { worldGrowthFromPoints } from "./world-growth";

const DAY = 24 * 3600 * 1000;
const d = (s: string) => new Date(`${s}T00:00:00Z`);

function linearPoints(from: string, to: string, startCents = 100_000): {
  date: Date;
  closeCents: number;
}[] {
  const start = d(from);
  const end = d(to);
  const days = Math.round((end.getTime() - start.getTime()) / DAY);
  const points: { date: Date; closeCents: number }[] = [];
  for (let i = 0; i <= days; i++) {
    points.push({
      date: new Date(start.getTime() + i * DAY),
      closeCents: startCents + (i * startCents) / days, // +100 % sur la période
    });
  }
  return points;
}

describe("worldGrowthFromPoints", () => {
  it("rejoue les versements au cours du jour (marche d'escalier DCA)", () => {
    const points = linearPoints("2024-01-01", "2024-12-31");
    const growth = worldGrowthFromPoints(
      [{ date: d("2024-01-01"), amountCents: 50_000 }],
      points,
      null,
    );
    // un seul versement au premier cours : toute la croissance du World
    expect(growth).not.toBeNull();
    expect(growth!.referenceValueCents).toBeCloseTo(100_000, -3);
    expect(growth!.cumulative).toBeCloseTo(1, 2);
  });

  it("capital au cutoff : la référence « 1y » inclut la croissance World du capital initial", () => {
    // sans startValueCents, l'escalier « 1y » ignorait le capital présent au
    // cutoff (le versement du premier jour) : le verdict « 1y » contredisait
    // le verdict « all » (référence amputée de ~capital × croissance World)
    const points = linearPoints("2024-01-01", "2024-12-31");
    const periodStart = d("2024-07-01");
    const flows = [{ date: d("2024-10-01"), amountCents: 10_000 }];
    const withoutCapital = worldGrowthFromPoints(flows, points, periodStart, 0);
    const withCapital = worldGrowthFromPoints(flows, points, periodStart, 50_000);
    expect(withoutCapital).not.toBeNull();
    expect(withCapital).not.toBeNull();
    // +100 % de World sur la période ; le capital de 50 000 € achète au cours
    // du cutoff (≈ 150 000, mi-parcours) et finit à 50 000 × 200/150 ≈ 66 667 €
    expect(withCapital!.referenceValueCents).toBeCloseTo(
      withoutCapital!.referenceValueCents + (50_000 * 200_000) / 150_000,
      -3,
    );
  });

  it("échoue gracieusement sans historique suffisant", () => {
    expect(worldGrowthFromPoints([], [], null)).toBeNull();
    const single = [{ date: d("2024-01-01"), closeCents: 100_000 }];
    expect(worldGrowthFromPoints([], single, null)).toBeNull();
  });
});
