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
  goalId: string | null;
}

/**
 * Vérifie qu'un ensemble d'enveloppes peut être lié à un but :
 * - toutes présentes, ouvertes (non clôturées) ;
 * - matelas de sécurité : uniquement LIVRET_A / PRIV (disponible, sans risque) ;
 * - aucune déjà liée à un AUTRE but (anti double comptage : une enveloppe
 *   appartient à au plus un but).
 * Retourne null si OK, sinon un message d'erreur explicite (français).
 */
export function checkGoalEnvelopes(
  goalType: GoalType,
  envelopes: LinkableEnvelope[],
  requestedIds: string[],
  currentGoalId?: string,
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
  const alreadyLinked = linked.filter(
    (e) => e.goalId !== null && e.goalId !== (currentGoalId ?? undefined),
  );
  if (alreadyLinked.length > 0) {
    return `Enveloppe déjà liée à un autre but : ${alreadyLinked.map((e) => e.name).join(", ")}`;
  }
  return null;
}
