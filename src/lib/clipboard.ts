/**
 * Copie presse-papier + sérialisation Markdown des enveloppes.
 *
 * Le format de copie est conçu pour être collé à un assistant (ou relu par
 * un humain) et permettre de recréer les enveloppes : type, broker, dates,
 * valeur, investi, puis chaque position avec ses identifiants (ISIN,
 * symbole), sa catégorie, les montants et l'historique des versements.
 */

export interface ClipboardPosition {
  name: string;
  symbol: string | null;
  isin?: string | null;
  category: string;
  quantity?: number | null;
  investedCents: number | null;
  currentValueCents: number | null;
  boughtAt: Date;
  valuationDate?: Date | null;
  /** versements individuels, si connus */
  investments?: { date: Date; amountCents: number }[];
}

export interface ClipboardEnvelope {
  name: string;
  type: string;
  broker: string | null;
  openedAt: Date | null;
  valueCents: number;
  investedCents: number | null;
  positions: ClipboardPosition[];
  /** dépôts du livret (les livrets n'ont pas de positions) */
  deposits?: { date: Date; amountCents: number }[];
  /** paramètres du livret */
  interestRate?: number | null;
  /** plans DCA actifs : lignes avec montant mensuel */
  dcaLines?: { isin: string; name: string; maxAmountCents: number; frequency: string }[];
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "?";
  return (cents / 100).toFixed(2);
}

function envelopeTypeLabel(type: string): string {
  switch (type) {
    case "LIVRET_A":
      return "Livret A";
    case "PRIV":
      return "Non coté (private equity)";
    default:
      return type;
  }
}

function positionLine(p: ClipboardPosition, index: number): string {
  const parts: string[] = [];
  parts.push(`${index + 1}. **${p.name}**`);
  const identifiers = [
    p.isin ? `ISIN ${p.isin}` : null,
    p.symbol ? `symbole ${p.symbol}` : null,
  ].filter(Boolean);
  if (identifiers.length > 0) parts.push(`(${identifiers.join(", ")})`);
  parts.push(`— ${p.category}`);
  if (p.quantity !== null && p.quantity !== undefined) {
    parts.push(`· ${p.quantity} part${p.quantity > 1 ? "s" : ""}`);
  }
  parts.push(`· investi ${formatCents(p.investedCents)} €`);
  parts.push(`· valeur ${formatCents(p.currentValueCents)} €`);
  parts.push(`· premier achat ${formatDate(p.boughtAt)}`);
  if (p.valuationDate) parts.push(`· valorisation ${formatDate(p.valuationDate)}`);
  let line = parts.join(" ");
  if (p.investments && p.investments.length > 0) {
    const flows = p.investments
      .map((inv) => `${formatDate(inv.date)} : ${formatCents(inv.amountCents)} €`)
      .join(" ; ");
    line += `\n   - versements : ${flows}`;
  }
  return line;
}

/** Sérialise une enveloppe en bloc Markdown recréable. */
export function envelopeToMarkdown(env: ClipboardEnvelope): string {
  const lines: string[] = [];
  lines.push(`### ${env.name} — ${envelopeTypeLabel(env.type)}`);
  const header: string[] = [];
  if (env.broker) header.push(`courtier : ${env.broker}`);
  if (env.openedAt) header.push(`ouvert le ${formatDate(env.openedAt)}`);
  header.push(`valeur : ${formatCents(env.valueCents)} €`);
  if (env.investedCents !== null) {
    header.push(`investi : ${formatCents(env.investedCents)} €`);
  }
  lines.push(header.join(" · "));
  if (env.type === "LIVRET_A") {
    if (env.interestRate !== null && env.interestRate !== undefined) {
      lines.push(`taux : ${(env.interestRate * 100).toFixed(2).replace(".", ",")} %/an`);
    }
    if (env.deposits && env.deposits.length > 0) {
      lines.push("Dépôts :");
      for (const dep of env.deposits) {
        lines.push(`- ${formatDate(dep.date)} : ${formatCents(dep.amountCents)} €`);
      }
    }
  }
  if (env.positions.length > 0) {
    lines.push("Positions :");
    env.positions.forEach((p, index) => lines.push(positionLine(p, index)));
  }
  if (env.dcaLines && env.dcaLines.length > 0) {
    lines.push("DCA actifs :");
    for (const line of env.dcaLines) {
      lines.push(
        `- ${line.name} (ISIN ${line.isin}) · ${formatCents(line.maxAmountCents)} € · ${line.frequency}`,
      );
    }
  }
  return lines.join("\n");
}

/** Sérialise toutes les enveloppes en un document Markdown unique. */
export function envelopesToMarkdown(envs: ClipboardEnvelope[]): string {
  const title = "# Portefeuille CompoundWealth";
  const date = new Date();
  const header = `${title} — export du ${formatDate(date)}`;
  if (envs.length === 0) return header;
  return [header, "", ...envs.map(envelopeToMarkdown)].join("\n\n");
}

/**
 * Copie texte dans le presse-papier : API clipboard moderne, fallback
 * textarea pour les contextes non sécurisés. Retourne true en cas de
 * succès.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // contexte non sécurisé ou permission refusée : fallback
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
