"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/money";
import { getEtfByIsin } from "@/lib/etf-catalog";
import { parseBrokerImport } from "@/lib/import";
import type { BrokerImport, ImportedEnvelope, ImportedPosition } from "@/lib/import";
import {
  envelopeSchema,
  loginSchema,
  positionSchema,
  profileSchema,
  signupSchema,
  depositsSchema,
} from "@/lib/validations";
import { prisma } from "./db";
import { hashPassword, verifyPassword } from "./auth";
import { createSession, destroySession, getSession } from "./session";

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

  const parsed = envelopeSchema.safeParse({
    type: str(formData, "type"),
    name: str(formData, "name"),
    broker: str(formData, "broker"),
    openedAt: str(formData, "openedAt"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { type, name, broker, openedAt } = parsed.data;
  const envelope = await prisma.envelope.create({
    data: {
      userId: session.userId,
      type,
      name,
      broker: broker || null,
      openedAt: openedAt ? new Date(openedAt) : null,
    },
  });
  revalidatePath("/envelopes");
  revalidatePath("/dashboard");
  redirect(`/envelopes/${envelope.id}`);
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
    valueEur: str(formData, "valueEur"),
    boughtAt: str(formData, "boughtAt"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { isin, valueEur, boughtAt } = parsed.data;
  const etf = getEtfByIsin(isin);
  if (!etf) return { errors: { isin: ["ETF introuvable dans le catalog"] } };

  const valueCents = eurosToCents(valueEur);
  const date = new Date(boughtAt);

  const position = await prisma.position.create({
    data: {
      envelopeId,
      name: `${etf.ticker} — ${etf.name}`,
      symbol: etf.ticker,
      category: "ETF",
      investedCents: null,
      boughtAt: date,
    },
  });

  await prisma.positionValuation.create({
    data: {
      positionId: position.id,
      date,
      valueCents,
    },
  });

  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
  return { message: "Position ajoutée" };
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
