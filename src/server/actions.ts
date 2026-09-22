"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eurosToCents } from "@/lib/money";
import { getEtfByIsin } from "@/lib/etf-catalog";
import {
  envelopeSchema,
  loginSchema,
  positionSchema,
  profileSchema,
  signupSchema,
  valuationSchema,
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

export async function addEnvelopeValuationAction(
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

  const parsed = valuationSchema.safeParse({
    date: str(formData, "date"),
    valueEur: str(formData, "valueEur"),
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const date = new Date(parsed.data.date);
  await prisma.envelopeValuation.upsert({
    where: { envelopeId_date: { envelopeId, date } },
    create: { envelopeId, date, valueCents: eurosToCents(parsed.data.valueEur) },
    update: { valueCents: eurosToCents(parsed.data.valueEur) },
  });
  revalidatePath(`/envelopes/${envelopeId}`);
  revalidatePath("/dashboard");
  return { message: "Valorisation enregistrée" };
}

export async function deleteAccountAction(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  await prisma.user.delete({ where: { id: session.userId } });
  await destroySession();
  redirect("/login");
}
