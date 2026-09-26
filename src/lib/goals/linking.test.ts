import { describe, expect, it } from "vitest";
import {
  checkGoalEnvelopes,
  sharedWithOtherGoals,
  SAFETY_NET_ENVELOPE_TYPES,
  type LinkableEnvelope,
} from "./linking";

const envelopes: LinkableEnvelope[] = [
  { id: "pea1", name: "PEA Bourse", type: "PEA", closedAt: null, goalIds: [] },
  { id: "livret1", name: "Livret A", type: "LIVRET_A", closedAt: null, goalIds: [] },
  { id: "priv1", name: "Non coté", type: "PRIV", closedAt: null, goalIds: [] },
  { id: "cto1", name: "CTO Crypto", type: "CTO", closedAt: null, goalIds: ["goalA"] },
  { id: "closed1", name: "Vieux PEA", type: "PEA", closedAt: new Date(2020, 0, 1), goalIds: [] },
];

describe("checkGoalEnvelopes", () => {
  it("aucune enveloppe demandée → erreur", () => {
    expect(checkGoalEnvelopes("SAFETY_NET", envelopes, [])).toContain("au moins une enveloppe");
  });

  it("enveloppe inconnue → erreur", () => {
    expect(checkGoalEnvelopes("CUSTOM", envelopes, ["inexistant"])).toContain("introuvable");
  });

  it("enveloppe clôturée → erreur", () => {
    expect(checkGoalEnvelopes("CUSTOM", envelopes, ["closed1"])).toContain("clôturée");
  });

  it("matelas n'accepte que LIVRET_A et PRIV — un PEA est refusé", () => {
    const error = checkGoalEnvelopes("SAFETY_NET", envelopes, ["pea1"]);
    expect(error).toContain("matelas de sécurité");
    expect(error).toContain("PEA Bourse");
    expect(checkGoalEnvelopes("SAFETY_NET", envelopes, ["livret1"])).toBeNull();
    expect(checkGoalEnvelopes("SAFETY_NET", envelopes, ["priv1", "livret1"])).toBeNull();
  });

  it("SAFETY_NET_ENVELOPE_TYPES = LIVRET_A + PRIV uniquement", () => {
    expect(SAFETY_NET_ENVELOPE_TYPES).toEqual(["LIVRET_A", "PRIV"]);
  });

  it("multi-lien : une enveloppe déjà liée à un autre but reste liable", () => {
    // le partage est autorisé — il est signalé dans le formulaire et le détail
    expect(checkGoalEnvelopes("RETIREMENT", envelopes, ["cto1"])).toBeNull();
    expect(checkGoalEnvelopes("FIRE", envelopes, ["pea1", "cto1"])).toBeNull();
  });

  it("sharedWithOtherGoals détecte le partage", () => {
    const cto = envelopes.find((e) => e.id === "cto1")!;
    expect(sharedWithOtherGoals(cto, "goalB")).toBe(true);
    expect(sharedWithOtherGoals(cto, "goalA")).toBe(false);
    expect(sharedWithOtherGoals(cto)).toBe(true);
    expect(sharedWithOtherGoals(envelopes[0], "goalB")).toBe(false);
  });

  it("un but non-matelas accepte un PEA", () => {
    expect(checkGoalEnvelopes("DOWN_PAYMENT", envelopes, ["pea1"])).toBeNull();
  });
});
