import { describe, expect, it } from "vitest";
import {
  addMonths,
  advanceOccurrence,
  estimateSpendCents,
  nextDateForDay,
  nextOccurrence,
  occurrencesIn,
  summarizeWindow,
  windowSummaries,
  type DcaPricedLine,
} from "./dca";

const d = (iso: string) => new Date(`${iso}T12:00:00`);

describe("addMonths", () => {
  it("préserve le jour du mois", () => {
    expect(addMonths(d("2026-10-02"), 1).toISOString().slice(0, 10)).toBe("2026-11-02");
  });
  it("recale fin de mois court", () => {
    expect(addMonths(d("2026-01-31"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
  });
  it("recale fin de mois court bissextile", () => {
    expect(addMonths(d("2024-01-31"), 1).toISOString().slice(0, 10)).toBe("2024-02-29");
  });
});

describe("advanceOccurrence", () => {
  it("BIWEEKLY ajoute 14 jours", () => {
    const next = advanceOccurrence(d("2026-10-02"), "BIWEEKLY");
    expect(next.toISOString().slice(0, 10)).toBe("2026-10-16");
  });
  it("QUARTERLY ajoute 3 mois", () => {
    const next = advanceOccurrence(d("2026-10-02"), "QUARTERLY");
    expect(next.toISOString().slice(0, 10)).toBe("2027-01-02");
  });
});

describe("nextOccurrence", () => {
  it("retourne la date de départ si elle est future", () => {
    const plan = { frequency: "MONTHLY" as const, startDate: d("2026-10-02") };
    expect(nextOccurrence(plan, d("2026-09-23")).toISOString().slice(0, 10)).toBe("2026-10-02");
  });
  it("retourne aujourd'hui si c'est le jour d'échéance", () => {
    const plan = { frequency: "MONTHLY" as const, startDate: d("2026-09-23") };
    expect(nextOccurrence(plan, d("2026-09-23")).toISOString().slice(0, 10)).toBe("2026-09-23");
  });
  it("saute les occurrences passées", () => {
    const plan = { frequency: "MONTHLY" as const, startDate: d("2026-01-02") };
    expect(nextOccurrence(plan, d("2026-09-23")).toISOString().slice(0, 10)).toBe("2026-10-02");
  });
  it("ignore l'heure dans la comparaison", () => {
    const plan = { frequency: "MONTHLY" as const, startDate: d("2026-09-01") };
    expect(nextOccurrence(plan, d("2026-09-01T08:30:00")).toISOString().slice(0, 10)).toBe("2026-09-01");
  });
});

describe("occurrencesIn", () => {
  it("compte les échéances d'un mensuel sur 1 mois", () => {
    const plan = { frequency: "MONTHLY" as const, startDate: d("2026-09-23"), active: true };
    expect(occurrencesIn(plan, d("2026-09-23"), d("2026-10-23"))).toBe(2);
  });
  it("compte 12 versements annuels pour un mensuel", () => {
    const plan = { frequency: "MONTHLY" as const, startDate: d("2026-09-23"), active: true };
    expect(occurrencesIn(plan, d("2026-09-23"), d("2027-09-23"))).toBe(13);
  });
  it("retourne 0 pour un plan en pause", () => {
    const plan = { frequency: "MONTHLY" as const, startDate: d("2026-09-23"), active: false };
    expect(occurrencesIn(plan, d("2026-09-23"), d("2027-09-23"))).toBe(0);
  });
  it("retourne 0 quand aucune échéance ne tombe dans la fenêtre", () => {
    const plan = { frequency: "QUARTERLY" as const, startDate: d("2026-02-15"), active: true };
    expect(occurrencesIn(plan, d("2026-09-23"), d("2026-10-23"))).toBe(0);
  });
});

describe("estimateSpendCents", () => {
  it("PEA : parts entières — 1 500 € à 120 € → 12 parts, 1 440 €, 60 € non investis", () => {
    const result = estimateSpendCents(150_000, 12_000, "PEA");
    expect(result).toEqual({
      estimatedCents: 144_000,
      quantity: 12,
      remainderCents: 6_000,
    });
  });
  it("PEA : 1 500 € à 145,13 € → 10 parts, 1 451,30 € (l'exemple de l'énoncé arrondi à la part)", () => {
    const result = estimateSpendCents(150_000, 14_513, "PEA");
    expect(result?.quantity).toBe(10);
    expect(result?.estimatedCents).toBe(145_130);
  });
  it("CTO : parts fractionnaires — budget complet dépensé", () => {
    const result = estimateSpendCents(150_000, 12_000, "CTO");
    expect(result?.estimatedCents).toBe(150_000);
    expect(result?.remainderCents).toBe(0);
  });
  it("PRIV (non coté) : fractions de parts — budget complet investi, pas de reliquat", () => {
    const result = estimateSpendCents(150_000, 12_000, "PRIV");
    expect(result?.estimatedCents).toBe(150_000);
    expect(result?.quantity).toBeCloseTo(12.5, 6);
    expect(result?.remainderCents).toBe(0);
  });
  it("prix inconnu → null", () => {
    expect(estimateSpendCents(150_000, null, "PEA")).toBeNull();
  });
});

const monthlyPlan = { frequency: "MONTHLY" as const, startDate: d("2026-09-23"), active: true };

function pricedLine(maxEur: number, priceCents: number | null, isin = "LU1681043599"): DcaPricedLine {
  return {
    plan: monthlyPlan,
    line: { isin, maxAmountCents: maxEur * 100, active: true },
    priceCents: priceCents,
  };
}

describe("summarizeWindow", () => {
  it("agrège montant max, estimation et nombre de versements", () => {
    const summary = summarizeWindow(
      [pricedLine(1500, 12_000), pricedLine(500, 10_000, "FR001400U5Q4")],
      "PEA",
      d("2026-09-23"),
      d("2026-10-23"),
    );
    expect(summary.paymentsCount).toBe(4);
    expect(summary.totalMaxCents).toBe(400_000);
    expect(summary.totalEstimatedCents).toBe(388_000);
    expect(summary.hasUnknownPrice).toBe(false);
  });
  it("exclut les lignes et plans en pause", () => {
    const summary = summarizeWindow(
      [
        {
          plan: { ...monthlyPlan, active: false },
          line: { isin: "LU1681043599", maxAmountCents: 150_000, active: true },
          priceCents: 12_000,
        },
        {
          plan: monthlyPlan,
          line: { isin: "FR001400U5Q4", maxAmountCents: 50_000, active: false },
          priceCents: 12_000,
        },
      ],
      "PEA",
      d("2026-09-23"),
      d("2026-10-23"),
    );
    expect(summary.paymentsCount).toBe(0);
    expect(summary.totalMaxCents).toBe(0);
  });
  it("prix inconnu → hypothèse haute (montant max) et flag", () => {
    const summary = summarizeWindow(
      [pricedLine(1500, null)],
      "PEA",
      d("2026-09-23"),
      d("2026-10-23"),
    );
    expect(summary.paymentsCount).toBe(2);
    expect(summary.totalEstimatedCents).toBe(300_000);
    expect(summary.hasUnknownPrice).toBe(true);
  });
});

describe("windowSummaries", () => {
  it("produit les trois fenêtres 1 mois / 3 mois / 1 an", () => {
    const summaries = windowSummaries([pricedLine(1500, 12_000)], "PEA", d("2026-09-23"));
    expect(summaries["1m"].paymentsCount).toBe(2);
    expect(summaries["3m"].paymentsCount).toBe(4);
    expect(summaries["1y"].paymentsCount).toBe(13);
    expect(summaries["1m"].totalMaxCents).toBe(300_000);
  });
});

describe("nextDateForDay", () => {
  it("retourne le jour du mois courant s'il est à venir", () => {
    const result = nextDateForDay(15, d("2026-09-05"));
    expect(result.toISOString().slice(0, 10)).toBe("2026-09-15");
  });
  it("passe au mois suivant si le jour est passé", () => {
    const result = nextDateForDay(3, d("2026-09-20"));
    expect(result.toISOString().slice(0, 10)).toBe("2026-10-03");
  });
  it("retourne aujourd'hui si le jour est aujourd'hui", () => {
    const result = nextDateForDay(20, d("2026-09-20"));
    expect(result.toISOString().slice(0, 10)).toBe("2026-09-20");
  });
  it("clamp le 31 sur un mois de 30 jours", () => {
    const result = nextDateForDay(31, d("2026-09-05"));
    expect(result.toISOString().slice(0, 10)).toBe("2026-09-30");
  });
  it("clamp le 31 sur février", () => {
    const result = nextDateForDay(31, d("2027-02-01"));
    expect(result.toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});
