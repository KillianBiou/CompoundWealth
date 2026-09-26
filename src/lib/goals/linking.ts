/**
 * Règles de liaison enveloppe ↔ but — module pur (testable sans Prisma).
 * Même logique que validateGoalEnvelopes côté serveur, sans l'accès DB.
 */

import type { GoalType } from "./progress";

export type EnvelopeType = "PEA" | "CTO" | "LIVRET_A" | "PRIV";

/** Types d'enveloppes acceptés par un matelas de sécurité : sans risque de marché. */
export const SAFETY_NET_ENVELOPE_TYPES: readonly EnvelopeType[] = ["LIVRET_A", "PRIV"];

export interface LinkableEnvelope {
  id: string;
  name: string;
  type: EnvelopeType;
  closedAt: Date | null;
  /** ids des buts liés à cette enveloppe (une enveloppe peut être partagée) */
  goalIds: string[];
}

/**
 * Vérifie qu'un ensemble d'enveloppes peut être lié à un but :
 * - toutes présentes, ouvertes (non clôturées) ;
 * - matelas de sécurité : uniquement LIVRET_A / PRIV (disponible, sans risque).
 * Une enveloppe PEUT être liée à plusieurs buts — le partage est signalé
 * dans le formulaire et le détail du but (sharedWithOtherGoals).
 * Retourne null si OK, sinon un message d'erreur explicite (français).
 */
export function checkGoalEnvelopes(
  goalType: GoalType,
  envelopes: LinkableEnvelope[],
  requestedIds: string[],
): string | null {
  if (requestedIds.length === 0) {
    return "Lie au moins une enveloppe à ce but";
  }
  const byId = new Map(envelopes.map((e) => [e.id, e]));
  const missing = requestedIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    return "Enveloppe introuvable ou clôturée";
  }
  const linked = requestedIds.map((id) => byId.get(id)!);
  const closed = linked.filter((e) => e.closedAt !== null);
  if (closed.length > 0) {
    return `Enveloppe clôturée : ${closed.map((e) => e.name).join(", ")}`;
  }
  if (goalType === "SAFETY_NET") {
    const invalid = linked.filter(
      (e) => !SAFETY_NET_ENVELOPE_TYPES.includes(e.type),
    );
    if (invalid.length > 0) {
      return `Le matelas de sécurité n'accepte que des enveloppes sans risque (Livret A, non coté) : ${invalid.map((e) => e.name).join(", ")} ne convient pas`;
    }
  }
  return null;
}

/** Une enveloppe est-elle partagée avec au moins un autre but que celui-ci ? */
export function sharedWithOtherGoals(
  envelope: LinkableEnvelope,
  currentGoalId?: string,
): boolean {
  return envelope.goalIds.some((id) => id !== currentGoalId);
}

/** Noms des autres buts partageant cette enveloppe (pour l'avertissement du détail). */
export function otherGoalNames(
  envelope: LinkableEnvelope & { goalNames?: string[] },
  currentGoalId?: string,
): string[] {
  const names = envelope.goalNames ?? [];
  return names.filter((_, i) => envelope.goalIds[i] !== currentGoalId);
}
