"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/money";
import { getEtfByIsin } from "@/lib/etf-catalog";
import { LIVRET_A_DEFAULT_INFLATION, LIVRET_A_RATE } from "@/lib/livret";
import { fetchMarketHistory, fetchMarketQuote } from "@/lib/market/quotes";
import { parseBrokerImport } from "@/lib/import";
import type { BrokerImport, ImportedEnvelope, ImportedPosition } from "@/lib/import";
import {
  createDcaSchema,
  createLivretDcaSchema,
  envelopeSchema,
  livretDepositSchema,
  livretSettingsSchema,
  loginSchema,
  positionSchema,
  profileSchema,
  signupSchema,
  depositsSchema,
  preferencesSchema,
} from "@/lib/validations";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./auth";
import { createSession, destroySession, getSession } from "./session";
import { requireUserId } from "./auth";

export type ActionState = {
  errors?: Record<string, string[]>;
  message?: string;
};

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] = [...(out[key] ?? []), issue.message];
  }
  return out;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

export async function signupAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signupSchema.safeParse({
    email: str(formData, "email").trim().toLowerCase(),
    password: str(formData, "password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { errors: { email: ["Un compte existe déjà avec cet email"] } };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: { email: parsed.data.email, passwordHash },
  });
  await createSession(user.id);
  redirect("/dashboard");
}

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: str(formData, "email").trim().toLowerCase(),
    password: str(formData, "password"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await verifyPassword(user.passwordHash, parsed.data.password))) {
    return { message: "Email ou mot de passe incorrect" };
  }

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

export async function updateProfileAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };

  const parsed = profileSchema.safeParse({
    name: str(formData, "name"),
    age: str(formData, "age"),
    job: str(formData, "job"),
    salaryEur: str(formData, "salaryEur"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { name, age, job, salaryEur } = parsed.data;
  const salaryCents =
    salaryEur === "" || salaryEur === undefined ? null : eurosToCents(Number(salaryEur));

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      name: name || null,
      age: age === "" || age === undefined ? null : Number(age),
      job: job || null,
      salaryCents,
    },
  });
  revalidatePath("/settings");
  return { message: "Profil enregistré" };
}

export async function createEnvelopeAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };

  const initialAmountRaw = str(formData, "initialAmountEur");
  const parsed = envelopeSchema.safeParse({
    type: str(formData, "type"),
    name: str(formData, "name"),
    broker: str(formData, "broker"),
    openedAt: str(formData, "openedAt"),
    ...(initialAmountRaw !== "" ? { initialAmountEur: initialAmountRaw } : {}),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { type, name, broker, openedAt, initialAmountEur } = parsed.data;
  const envelope = await prisma.envelope.create({
    data: {
      userId: session.userId,
      type,
      name,
      broker: broker || null,
      openedAt: openedAt ? new Date(openedAt) : null,
      ...(type === "LIVRET_A"
        ? { interestRate: LIVRET_A_RATE, inflationRate: LIVRET_A_DEFAULT_INFLATION }
        : {}),
    },
  });
  if (type === "LIVRET_A" && initialAmountEur !== undefined && initialAmountEur > 0) {
    await prisma.envelopeDeposit.create({
      data: {
        envelopeId: envelope.id,
        date: new Date(),
        amountCents: eurosToCents(initialAmountEur),
      },
    });
  }
  revalidatePath("/envelopes");
  revalidatePath("/dashboard");
  redirect(`/envelopes/${envelope.id}`);
}

export async function updatePreferencesAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };

  const parsed = preferencesSchema.safeParse({
    currency: str(formData, "currency"),
    numberLocale: str(formData, "numberLocale"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      currency: parsed.data.currency,
      numberLocale: parsed.data.numberLocale,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/envelopes");
  return { message: "Préférences enregistrées" };
}

export async function deleteEnvelopeAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const envelopeId = String(formData.get("envelopeId") ?? "");
  await prisma.envelope.deleteMany({
    where: { id: envelopeId, userId: session.userId },
  });
  revalidatePath("/envelopes");
  revalidatePath("/dashboard");
  redirect("/envelopes");
}

export async function closeEnvelopeAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const envelopeId = String(formData.get("envelopeId") ?? "");
  await prisma.envelope.updateMany({
    where: { id: envelopeId, userId: session.userId },
    data: { closedAt: new Date() },
  });
  revalidatePath("/envelopes");
  revalidatePath("/dashboard");
  redirect("/envelopes");
}

/**
 * Reconstruit les valorisations quotidiennes d'une position a partir de son
 * historique d'investissements (parts accumulees par jour, x cours de clôture
 * Yahoo). Une seule requête par position via fetchMarketHistory.
 */
async function rebuildPositionValuations(
  position: { id: string; symbol: string; investments: { date: Date; amountCents: number }[] },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const firstDate = position.investments[0].date;
  const history = await fetchMarketHistory(position.symbol, firstDate, new Date());
  if (!history.ok) return { ok: false, reason: history.reason };
  const sharesByDay = new Map<string, number>();
  let shares = 0;
  let dayCursor = 0;
  for (const point of history.points) {
    const dayKey = point.date.toISOString().slice(0, 10);
    while (
      dayCursor < position.investments.length &&
      position.investments[dayCursor].date.getTime() <= point.date.getTime()
    ) {
      const inv = position.investments[dayCursor];
      const priceAtInv = history.points.find(
        (hp) => hp.date.getTime() >= inv.date.getTime(),
      );
      if (priceAtInv && priceAtInv.closeCents > 0) {
        shares += inv.amountCents / priceAtInv.closeCents;
      }
      dayCursor += 1;
    }
    sharesByDay.set(dayKey, shares);
  }
  const valuationData = history.points
    .map((point) => ({
      positionId: position.id,
      date: point.date,
      valueCents: Math.round(
        (sharesByDay.get(point.date.toISOString().slice(0, 10)) ?? 0) * point.closeCents,
      ),
      source: "yahoo",
    }))
    .filter((v) => v.valueCents > 0);
  await prisma.positionValuation.deleteMany({
    where: {
      positionId: position.id,
      NOT: { source: "manuel" as const },
    },
  });
  if (valuationData.length > 0) {
    await prisma.positionValuation.createMany({ data: valuationData });
  }
  return { ok: true };
}

export async function createPositionAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };
  const envelopeId = str(formData, "envelopeId");

  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId: session.userId },
  });
  if (!envelope) return { message: "Enveloppe introuvable" };

  const parsed = positionSchema.safeParse({
    isin: str(formData, "isin"),
    quantity: str(formData, "quantity"),
    boughtAt: str(formData, "boughtAt"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { isin, quantity, boughtAt } = parsed.data;
  const etf = getEtfByIsin(isin);
  if (!etf) return { errors: { isin: ["ETF introuvable dans le catalog"] } };

  const date = new Date(boughtAt);
  const symbol = etf.yahooSymbol ?? etf.ticker;
  const history = await fetchMarketHistory(symbol, date, new Date());
  if (!history.ok) {
    return {
      errors: {
        form: [
          `Prix d'achat introuvable pour ${etf.ticker} à cette date (${history.reason})`,
        ],
      },
    };
  }
  const pricePoint = history.points.find(
    (p) => p.date.getTime() >= date.getTime(),
  );
  if (!pricePoint) {
    return {
      errors: {
        form: [
          `Aucun cours disponible pour ${etf.ticker} à la date du ${date.toLocaleDateString("fr-FR")}`,
        ],
      },
    };
  }
  const amountCents = Math.round(quantity * pricePoint.closeCents);

  const existing = await prisma.position.findFirst({
    where: { envelopeId, symbol: etf.ticker },
    include: { investments: true, valuations: true },
  });

  if (existing) {
    const totalQuantity = (existing.quantity ?? 0) + quantity;
    const totalInvested =
      (existing.investedCents ?? 0) +
      existing.investments.reduce((s, inv) => s + inv.amountCents, 0) +
      amountCents;
    await prisma.$transaction([
      prisma.positionInvestment.create({
        data: { positionId: existing.id, date, amountCents },
      }),
      prisma.position.update({
        where: { id: existing.id },
        data: {
          quantity: totalQuantity,
          investedCents: totalInvested,
          unitPriceCents: Math.round(totalInvested / totalQuantity),
          boughtAt:
            existing.boughtAt.getTime() > date.getTime() ? date : existing.boughtAt,
        },
      }),
    ]);
    const rebuilt = await rebuildPositionValuations({
      id: existing.id,
      symbol: existing.symbol ?? etf.ticker,
      investments: [
        ...existing.investments.map((inv) => ({
          date: inv.date,
          amountCents: inv.amountCents,
        })),
        { date, amountCents },
      ].sort((a, b) => a.date.getTime() - b.date.getTime()),
    });
    if (!rebuilt.ok) {
      revalidatePath(`/envelopes/${envelopeId}`);
      return {
        message: `Position regroupée, mais historique non reconstruit (${rebuilt.reason})`,
      };
    }
    revalidatePath(`/envelopes/${envelopeId}`);
    revalidatePath("/dashboard");
    return { message: `${quantity} parts ajoutées à ${etf.ticker}` };
  }

  const position = await prisma.position.create({
    data: {
      envelopeId,
      name: `${etf.ticker} — ${etf.name}`,
      symbol: etf.ticker,
      category: "ETF",
      quantity,
      investedCents: amountCents,
      unitPriceCents: pricePoint.closeCents,
      boughtAt: date,
    },
  });

  await prisma.positionInvestment.create({
    data: { positionId: position.id, date, amountCents },
  });

  const valuationData = history.points
    .filter((p) => p.date.getTime() >= pricePoint.date.getTime())
    .map((p) => ({
      positionId: position.id,
      date: p.date,
      valueCents: Math.round(quantity * p.closeCents),
      source: "yahoo",
    }))
    .filter((v) => v.valueCents > 0);
  if (valuationData.length > 0) {
    await prisma.positionValuation.createMany({ data: valuationData });
  }

  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
  return {
    message: `Position ajoutée : ${quantity} parts × ${(pricePoint.closeCents / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`,
  };
}

export async function createDcaAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };
  const envelopeId = str(formData, "envelopeId");
  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId: session.userId },
  });
  if (!envelope) return { message: "Enveloppe introuvable" };
  const rawLines = formData.getAll("lines").map((v) => String(v));
  const parsed = createDcaSchema.safeParse({
    frequency: str(formData, "frequency"),
    startDate: str(formData, "startDate"),
    lines: rawLines.map((line) => {
      try {
        return JSON.parse(line) as { isin: string; maxAmountEur: number | string };
      } catch {
        return { isin: "invalide", maxAmountEur: "invalide" };
      }
    }),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { frequency, startDate, lines } = parsed.data;
  const plan = await prisma.dcaPlan.create({
    data: {
      envelopeId,
      frequency,
      startDate: new Date(startDate),
      active: true,
      lines: {
        create: lines.map((line) => {
          const etf = getEtfByIsin(line.isin)!;
          return {
            isin: etf.isin,
            name: `${etf.ticker} — ${etf.name}`,
            maxAmountCents: eurosToCents(line.maxAmountEur),
            active: true,
          };
        }),
      },
    },
    include: { lines: true },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
  return {
    message:
      lines.length === 1
        ? `DCA créé : ${plan.lines[0].name}`
        : `Plan DCA créé : ${lines.length} titres`,
  };
}

export async function createLivretDcaAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };
  const envelopeId = str(formData, "envelopeId");
  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId: session.userId, type: "LIVRET_A" },
  });
  if (!envelope) return { message: "Livret introuvable" };
  const parsed = createLivretDcaSchema.safeParse({
    frequency: str(formData, "frequency"),
    startDate: str(formData, "startDate"),
    maxAmountEur: str(formData, "maxAmountEur"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { frequency, startDate, maxAmountEur } = parsed.data;
  await prisma.dcaPlan.create({
    data: {
      envelopeId,
      frequency,
      startDate: new Date(startDate),
      active: true,
      lines: {
        create: {
          isin: "LIVRET",
          name: "Versement",
          maxAmountCents: eurosToCents(maxAmountEur),
          active: true,
        },
      },
    },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
  return { message: "Versement régulier planifié" };
}

export async function toggleDcaLineAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const lineId = String(formData.get("lineId") ?? "");
  const envelopeId = String(formData.get("envelopeId") ?? "");
  const line = await prisma.dcaLine.findFirst({
    where: { id: lineId, plan: { envelope: { userId: session.userId } } },
  });
  if (!line) return;
  await prisma.dcaLine.update({
    where: { id: line.id },
    data: { active: !line.active },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
}

export async function deleteDcaLineAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const lineId = String(formData.get("lineId") ?? "");
  const envelopeId = String(formData.get("envelopeId") ?? "");
  await prisma.dcaLine.deleteMany({
    where: { id: lineId, plan: { envelope: { userId: session.userId } } },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
}

export async function deletePositionAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const positionId = String(formData.get("positionId") ?? "");
  const envelopeId = String(formData.get("envelopeId") ?? "");
  await prisma.position.deleteMany({
    where: { id: positionId, envelope: { userId: session.userId } },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
}

export async function updateDepositsAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };
  const envelopeId = str(formData, "envelopeId");

  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId: session.userId },
  });
  if (!envelope) return { message: "Enveloppe introuvable" };

  const parsed = depositsSchema.safeParse({
    depositsEur: str(formData, "depositsEur"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  await prisma.envelope.update({
    where: { id: envelopeId },
    data: { depositsCents: eurosToCents(parsed.data.depositsEur) },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
  return { message: "Versements mis à jour" };
}

export interface ImportPreviewPosition {
  isin: string | null;
  name: string;
  category: string;
  quantity: number;
  investedCents: number;
  currentValueCents: number;
  historyPoints: number;
}

export interface ImportPreviewEnvelope {
  type: "PEA" | "CTO";
  name: string;
  broker: string | null;
  openedAt: string | null;
  depositsCents: number;
  positions: ImportPreviewPosition[];
}

export type ImportActionState = ActionState & {
  preview?: ImportPreviewEnvelope[];
  broker?: string;
  skippedRows?: number;
};

const MAX_IMPORT_BYTES = 5_000_000;

async function readImportFile(
  formData: FormData,
): Promise<{ content: string } | { errors: Record<string, string[]> }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: { file: ["Sélectionnez un fichier d'export"] } };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return { errors: { file: ["Fichier trop volumineux (5 Mo maximum)"] } };
  }
  const content = await file.text();
  if (content.trim() === "") {
    return { errors: { file: ["Le fichier est vide"] } };
  }
  return { content };
}

function parseImportContent(content: string):
  | { parsed: BrokerImport }
  | { errors: Record<string, string[]> } {
  try {
    const parsed = parseBrokerImport(content);
    if (parsed.envelopes.length === 0 || parsed.envelopes.every((e) => e.positions.length === 0)) {
      return { errors: { file: ["Aucune transaction d'achat exploitable dans ce fichier"] } };
    }
    return { parsed };
  } catch {
    return {
      errors: {
        file: [
          "Format de fichier non reconnu. Export supporté : Trade Republic (CSV des transactions).",
        ],
      },
    };
  }
}

function toPreview(parsed: BrokerImport): ImportPreviewEnvelope[] {
  return parsed.envelopes.map((e: ImportedEnvelope) => ({
    type: e.type,
    name: e.name,
    broker: e.broker,
    openedAt: e.openedAt,
    depositsCents: e.depositsCents,
    positions: e.positions.map((p: ImportedPosition) => ({
      isin: p.isin,
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      investedCents: p.investedCents,
      currentValueCents:
        p.valuations.length > 0 ? p.valuations[p.valuations.length - 1].valueCents : 0,
      historyPoints: p.valuations.length,
    })),
  }));
}

export async function analyzeImportAction(
  _state: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };

  const file = await readImportFile(formData);
  if ("errors" in file) return { errors: file.errors };

  const result = parseImportContent(file.content);
  if ("errors" in result) return { errors: result.errors };

  return {
    message: "Export analysé — vérifiez l'aperçu puis lancez l'import",
    broker: result.parsed.broker,
    skippedRows: result.parsed.skippedRows,
    preview: toPreview(result.parsed),
  };
}

export async function confirmImportAction(
  _state: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };

  const file = await readImportFile(formData);
  if ("errors" in file) return { errors: file.errors };

  const result = parseImportContent(file.content);
  if ("errors" in result) return { errors: result.errors };

  const created = await prisma.$transaction(async (tx) => {
    const names: string[] = [];
    for (const env of result.parsed.envelopes) {
      let name = env.name;
      let suffix = 2;
      while (await tx.envelope.findFirst({ where: { userId: session.userId, name } })) {
        name = `${env.name} (${suffix})`;
        suffix += 1;
      }
      const envelope = await tx.envelope.create({
        data: {
          userId: session.userId,
          type: env.type,
          name,
          broker: env.broker,
          openedAt: env.openedAt ? new Date(env.openedAt) : null,
          depositsCents: env.depositsCents,
        },
      });
      for (const p of env.positions) {
        const etf = p.isin ? getEtfByIsin(p.isin) : null;
        const position = await tx.position.create({
          data: {
            envelopeId: envelope.id,
            name: etf ? `${etf.ticker} — ${etf.name}` : p.name,
            symbol: etf?.ticker ?? p.symbol,
            category: p.category,
            quantity: p.quantity,
            investedCents: p.investedCents,
            unitPriceCents: p.unitPriceCents,
            boughtAt: new Date(p.firstBoughtAt),
          },
        });
        if (p.valuations.length > 0) {
          await tx.positionValuation.createMany({
            data: p.valuations.map((v) => ({
              positionId: position.id,
              date: new Date(v.date),
              valueCents: v.valueCents,
              source: "import",
            })),
          });
        }
        if (p.investments.length > 0) {
          await tx.positionInvestment.createMany({
            data: p.investments.map((inv) => ({
              positionId: position.id,
              date: new Date(inv.date),
              amountCents: inv.amountCents,
            })),
          });
        }
      }
      names.push(name);
    }
    return names;
  });

  revalidatePath("/envelopes");
  revalidatePath("/dashboard");
  redirect(`/envelopes?imported=${encodeURIComponent(created.join(", "))}`);
}

export async function deleteAccountAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  await prisma.user.delete({ where: { id: session.userId } });
  await destroySession();
  redirect("/login");
}

const PRICE_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

export async function refreshPricesAction(envelopeId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId },
    include: { positions: { include: { valuations: { orderBy: { date: "desc" }, take: 1 } } } },
  });
  if (!envelope) return { errors: { form: ["Enveloppe introuvable"] } };

  if (
    envelope.lastPriceRefreshAt &&
    Date.now() - envelope.lastPriceRefreshAt.getTime() < PRICE_REFRESH_COOLDOWN_MS
  ) {
    return { errors: { form: ["Les prix viennent d'être actualisés, réessayez dans quelques minutes"] } };
  }

  const now = new Date();
  let updated = 0;
  const failures: string[] = [];
  for (const [index, position] of envelope.positions.entries()) {
    const symbol = position.symbol?.trim();
    if (!symbol) {
      failures.push(`${position.name} (symbole manquant)`);
      continue;
    }
    if (position.quantity === null) {
      failures.push(`${position.name} (quantité manquante)`);
      continue;
    }
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1000));
    const quote = await fetchMarketQuote(symbol);
    if (!quote.ok) {
      failures.push(`${position.name} (${quote.reason})`);
      continue;
    }
    const valueCents = Math.round(position.quantity * quote.priceCents);
    await prisma.positionValuation.upsert({
      where: { positionId_date: { positionId: position.id, date: now } },
      create: { positionId: position.id, date: now, valueCents, source: "yahoo" },
      update: { valueCents, source: "yahoo" },
    });
    updated += 1;
  }

  if (updated === 0) {
    return {
      errors: {
        form: [
          `Aucun prix récupéré${failures.length > 0 ? ` : ${failures.join(", ")}` : ""}`,
        ],
      },
    };
  }

  await prisma.envelope.update({
    where: { id: envelopeId },
    data: { lastPriceRefreshAt: now },
  });

  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/envelopes");
  revalidatePath("/dashboard");

  if (failures.length > 0) {
    return {
      message: `${updated} prix actualisé${updated > 1 ? "s" : ""} ; échec pour : ${failures.join(", ")}`,
    };
  }
  return { message: `${updated} prix actualisé${updated > 1 ? "s" : ""}` };
}

export async function addLivretDepositAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };
  const envelopeId = str(formData, "envelopeId");
  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId: session.userId, type: "LIVRET_A" },
  });
  if (!envelope) return { errors: { form: ["Livret introuvable"] } };
  const parsed = livretDepositSchema.safeParse({
    date: str(formData, "date"),
    amountEur: str(formData, "amountEur"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await prisma.envelopeDeposit.create({
    data: {
      envelopeId,
      date: new Date(parsed.data.date),
      amountCents: eurosToCents(parsed.data.amountEur),
    },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/envelopes");
  return { message: "Versement enregistré" };
}

export async function deleteLivretDepositAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };
  const depositId = str(formData, "depositId");
  const envelopeId = str(formData, "envelopeId");
  const deposit = await prisma.envelopeDeposit.findFirst({
    where: { id: depositId, envelope: { userId: session.userId, type: "LIVRET_A" } },
  });
  if (!deposit) return { errors: { form: ["Versement introuvable"] } };
  await prisma.envelopeDeposit.delete({ where: { id: deposit.id } });
  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
  return { message: "Versement supprimé" };
}

export async function updateLivretSettingsAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await getSession();
  if (!session) return { message: "Session expirée" };
  const envelopeId = str(formData, "envelopeId");
  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId: session.userId, type: "LIVRET_A" },
  });
  if (!envelope) return { errors: { form: ["Livret introuvable"] } };
  const parsed = livretSettingsSchema.safeParse({
    interestRate: str(formData, "interestRate"),
    inflationRate: str(formData, "inflationRate"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  await prisma.envelope.update({
    where: { id: envelope.id },
    data: {
      interestRate: parsed.data.interestRate / 100,
      inflationRate: parsed.data.inflationRate / 100,
    },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
  return { message: "Paramètres du livret mis à jour" };
}

/**
 * Actualise les prix de toutes les enveloppes actives de l'utilisateur.
 * Respecte le cooldown de 5 min par enveloppe (les enveloppes récemment
 * actualisées sont ignorées), espace les requêtes Yahoo de ~1 s et collecte
 * les échecs par position pour un retour détaillé.
 */
export async function refreshAllPricesAction(): Promise<{
  message?: string;
  errors?: { form?: string[]; skipped?: string[]; failures?: string[] };
}> {
  const userId = await requireUserId();
  const envelopes = await prisma.envelope.findMany({
    where: { userId, closedAt: null },
    include: { positions: true },
    orderBy: { createdAt: "asc" },
  });
  if (envelopes.length === 0) return { errors: { form: ["Aucune enveloppe active"] } };
  const now = Date.now();
  const skipped: string[] = [];
  const failures: string[] = [];
  const refreshedEnvelopes: { id: string; name: string }[] = [];
  let updated = 0;
  let firstRequest = true;
  for (const envelope of envelopes) {
    const onCooldown =
      envelope.lastPriceRefreshAt !== null &&
      now - envelope.lastPriceRefreshAt.getTime() < PRICE_REFRESH_COOLDOWN_MS;
    const refreshable = envelope.positions.filter(
      (p) => p.symbol?.trim() && p.quantity !== null,
    );
    if (onCooldown || refreshable.length === 0) {
      if (refreshable.length > 0) skipped.push(envelope.name);
      continue;
    }
    for (const position of refreshable) {
      if (!firstRequest) await new Promise((resolve) => setTimeout(resolve, 1000));
      firstRequest = false;
      const quote = await fetchMarketQuote(position.symbol!.trim());
      if (!quote.ok) {
        failures.push(`${envelope.name} · ${position.name} (${quote.reason})`);
        continue;
      }
      const valueCents = Math.round(position.quantity! * quote.priceCents);
      const valuationDate = new Date();
      await prisma.positionValuation.upsert({
        where: { positionId_date: { positionId: position.id, date: valuationDate } },
        create: {
          positionId: position.id,
          date: valuationDate,
          valueCents,
          source: "yahoo",
        },
        update: { valueCents, source: "yahoo" },
      });
      updated += 1;
    }
    await prisma.envelope.update({
      where: { id: envelope.id },
      data: { lastPriceRefreshAt: new Date() },
    });
    refreshedEnvelopes.push({ id: envelope.id, name: envelope.name });
  }
  if (updated === 0) {
    return {
      errors: {
        form: [
          skipped.length > 0
            ? `Aucun prix actualisé — ${skipped.length} enveloppe${skipped.length > 1 ? "s" : ""} récemment actualisée${skipped.length > 1 ? "s" : ""}`
            : "Aucun prix récupéré",
        ],
        skipped,
        failures,
      },
    };
  }
  revalidatePath("/dashboard");
  revalidatePath("/envelopes");
  for (const envelope of refreshedEnvelopes) {
    revalidatePath(`/envelopes/${envelope.id}`);
  }
  return {
    message: `${updated} prix actualisé${updated > 1 ? "s" : ""} sur ${refreshedEnvelopes.length} enveloppe${refreshedEnvelopes.length > 1 ? "s" : ""}`,
    errors: skipped.length > 0 || failures.length > 0 ? { skipped, failures } : undefined,
  };
}

export async function rebuildHistoryAction(envelopeId: string): Promise<ActionState> {
  const userId = await requireUserId();
  const envelope = await prisma.envelope.findFirst({
    where: { id: envelopeId, userId },
    include: {
      positions: {
        include: {
          investments: { orderBy: { date: "asc" } },
          valuations: { orderBy: { date: "asc" } },
        },
      },
    },
  });
  if (!envelope) return { errors: { form: ["Enveloppe introuvable"] } };

  const positionsWithHistory = envelope.positions.filter((p) => p.symbol && p.investments.length > 0);
  if (positionsWithHistory.length === 0) {
    return {
      errors: {
        form: [
          "Aucune position avec historique de versements à reconstruire (l'historique détaillé vient de l'import bancaire)",
        ],
      },
    };
  }

  const failures: string[] = [];
  let rebuilt = 0;
  for (const [index, position] of positionsWithHistory.entries()) {
    const result = await rebuildPositionValuations({
      id: position.id,
      symbol: position.symbol!.trim(),
      investments: position.investments.map((inv) => ({
        date: inv.date,
        amountCents: inv.amountCents,
      })),
    });
    if (!result.ok) {
      failures.push(`${position.name} (${result.reason})`);
      continue;
    }
    rebuilt += 1;
    if (index < positionsWithHistory.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (rebuilt === 0) {
    return {
      errors: {
        form: [`Aucun historique récupéré : ${failures.join(", ")}`],
      },
    };
  }

  await prisma.envelope.update({
    where: { id: envelopeId },
    data: { lastPriceRefreshAt: new Date() },
  });

  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/envelopes");
  revalidatePath("/dashboard");

  if (failures.length > 0) {
    return {
      message: `Historique reconstruit pour ${rebuilt} position${rebuilt > 1 ? "s" : ""} ; échec pour : ${failures.join(", ")}`,
    };
  }
  return { message: `Historique reconstruit pour ${rebuilt} position${rebuilt > 1 ? "s" : ""} (valorisations quotidiennes)` };
}
