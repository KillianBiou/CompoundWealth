import { describe, expect, it } from "vitest";
import {
  LIVRET_A_DEPOSIT_CAP_CENTS,
  buildLivretBalanceSeries,
  nextFortnightStart,
  projectOneYear,
  type LivretEvent,
} from "./livret";

const d = (s: string) => new Date(s);

describe("nextFortnightStart", () => {
  it("un versement en début de mois produit dès le 16", () => {
    expect(nextFortnightStart(d("2026-03-02")).toISOString().slice(0, 10)).toBe("2026-03-16");
  });
  it("un versement après le 15 produit dès le 1er du mois suivant", () => {
    expect(nextFortnightStart(d("2026-03-17")).toISOString().slice(0, 10)).toBe("2026-04-01");
  });
  it("un versement le 15 lui-même produit dès le 16", () => {
    expect(nextFortnightStart(d("2026-03-15")).toISOString().slice(0, 10)).toBe("2026-03-16");
  });
});

describe("buildLivretBalanceSeries", () => {
  it("capitalise les intérêts annuellement au 1er janvier", () => {
    const events: LivretEvent[] = [{ date: d("2025-12-20"), amountCents: 10_000 }];
    const series = buildLivretBalanceSeries(events, 0.015, d("2027-03-01"), 14);
    const beforeNewYear = series.find((p) => p.date.toISOString().slice(0, 10) === "2026-12-16");
    const afterNewYear = series.find((p) => p.date.toISOString().slice(0, 10) === "2027-01-01");
    expect(beforeNewYear).toBeDefined();
    expect(afterNewYear).toBeDefined();
    expect(beforeNewYear!.balanceCents).toBe(10_000);
    // 24 quinzaines pleines × (10 000 × 1,5 % / 24) = 150 cents capitalisés
    expect(afterNewYear!.balanceCents).toBe(10_150);
  });

  it("un versement au 1er janvier ne produit que 23 quinzaines dans l'année", () => {
    const events: LivretEvent[] = [{ date: d("2026-01-01"), amountCents: 10_000 }];
    const series = buildLivretBalanceSeries(events, 0.015, d("2027-01-10"), 1);
    const afterNewYear = series.find((p) => p.date.toISOString().slice(0, 10) === "2027-01-01");
    expect(afterNewYear!.balanceCents).toBe(10_144);
  });

  it("refuse les versements au-delà du plafond : l'excédent reste hors livret (≈ 0 %)", () => {
    const events: LivretEvent[] = [
      { date: d("2026-01-01"), amountCents: LIVRET_A_DEPOSIT_CAP_CENTS },
      { date: d("2026-01-05"), amountCents: 500_000 },
    ];
    const series = buildLivretBalanceSeries(events, 0.015, d("2026-06-01"), 0);
    const last = series[series.length - 1];
    expect(last.balanceCents).toBe(LIVRET_A_DEPOSIT_CAP_CENTS);
    expect(last.overCapCents).toBe(500_000);
  });

  it("rémunère intégralement un solde dépassant le plafond grâce aux intérêts capitalisés", () => {
    const events: LivretEvent[] = [{ date: d("2025-01-01"), amountCents: LIVRET_A_DEPOSIT_CAP_CENTS }];
    const series = buildLivretBalanceSeries(events, 0.015, d("2027-03-01"), 2);
    const overCapPoint = series.find((p) => p.balanceCents > LIVRET_A_DEPOSIT_CAP_CENTS);
    expect(overCapPoint).toBeDefined();
    const interest = overCapPoint!.balanceCents - LIVRET_A_DEPOSIT_CAP_CENTS;
    expect(interest).toBeGreaterThan(0);
    expect(overCapPoint!.overCapCents).toBe(0);
  });

  it("un retrait consomme d'abord l'excédent hors plafond", () => {
    const events: LivretEvent[] = [
      { date: d("2026-01-01"), amountCents: LIVRET_A_DEPOSIT_CAP_CENTS },
      { date: d("2026-01-05"), amountCents: 500_000 },
      { date: d("2026-02-01"), amountCents: -300_000 },
    ];
    const series = buildLivretBalanceSeries(events, 0.015, d("2026-06-01"), 0);
    const last = series[series.length - 1];
    expect(last.overCapCents).toBe(200_000);
    expect(last.balanceCents).toBe(LIVRET_A_DEPOSIT_CAP_CENTS);
  });

  it("ajoute les versements à la quinzaine suivant leur dépôt", () => {
    const events: LivretEvent[] = [
      { date: d("2026-01-01"), amountCents: 10_000 },
      { date: d("2026-04-02"), amountCents: 5_000 },
    ];
    const series = buildLivretBalanceSeries(events, 0.015, d("2026-06-01"), 2);
    const midApril = series.find((p) => p.date.toISOString().slice(0, 10) === "2026-04-16");
    expect(midApril!.balanceCents).toBe(15_000);
  });
});

describe("projectOneYear", () => {
  it("montre la perte de pouvoir d'achat quand inflation > taux", () => {
    const events: LivretEvent[] = [{ date: d("2025-06-01"), amountCents: 1_000_000 }];
    const projection = projectOneYear(events, 0.015, 0.02, d("2026-03-01"))!;
    expect(projection.balanceCents).toBeGreaterThan(0);
    expect(projection.interestCents).toBeGreaterThan(0);
    expect(projection.realChangeCents).toBeLessThan(0);
    expect(projection.realRate).toBeLessThan(0);
  });

  it("montre un gain réel quand le taux bat l'inflation", () => {
    const events: LivretEvent[] = [{ date: d("2025-06-01"), amountCents: 1_000_000 }];
    const projection = projectOneYear(events, 0.03, 0.01, d("2026-03-01"))!;
    expect(projection.realChangeCents).toBeGreaterThan(0);
  });

  it("signale le dépassement de plafond", () => {
    const events: LivretEvent[] = [
      { date: d("2025-06-01"), amountCents: LIVRET_A_DEPOSIT_CAP_CENTS + 100_000 },
    ];
    const projection = projectOneYear(events, 0.015, 0.02, d("2026-03-01"))!;
    // le dépassement est identifié dès le versement, avant capitalisation
    const series = buildLivretBalanceSeries(events, 0.015, d("2026-03-01"), 0);
    expect(series[0].overCapCents).toBe(100_000);
    expect(projection.overCapCents).toBeGreaterThanOrEqual(100_000);
  });

  it("retourne null sans versement", () => {
    expect(projectOneYear([], 0.015, 0.02)).toBeNull();
  });
});

describe("LivretPoint.depositedCents", () => {
  it("cumule les versements nets, hors intérêts", () => {
    const events: LivretEvent[] = [
      { date: d("2026-01-01"), amountCents: 10_000 },
      { date: d("2026-03-20"), amountCents: 5_000 },
      { date: d("2026-05-10"), amountCents: -2_000 },
    ];
    const series = buildLivretBalanceSeries(events, 0.015, d("2026-07-01"), 0);
    expect(series[series.length - 1].depositedCents).toBe(13_000);
    expect(series[0].depositedCents).toBe(10_000);
  });
});
