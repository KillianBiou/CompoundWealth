import { z } from "zod";
import { getEtfByIsin } from "./etf-catalog";

export const signupSchema = z.object({
  email: z.email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export const loginSchema = z.object({
  email: z.email("Adresse email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const profileSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal("")),
  age: z.coerce
    .number()
    .int("Âge invalide")
    .min(18, "L'âge doit être entre 18 et 120")
    .max(120, "L'âge doit être entre 18 et 120")
    .optional()
    .or(z.literal("")),
  job: z.string().trim().max(120).optional().or(z.literal("")),
  salaryEur: z.coerce
    .number()
    .min(0, "Le salaire doit être positif")
    .optional()
    .or(z.literal("")),
});

const isoDateOptional = z
  .string()
  .optional()
  .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Date invalide");
const notFuture = z
  .string()
  .refine((v) => Date.parse(v) <= Date.now() + 86_400_000, "La date ne peut pas être dans le futur");

export const envelopeSchema = z.object({
  type: z.enum(["PEA", "CTO"]),
  name: z.string().trim().min(1, "Le nom est requis").max(80, "80 caractères maximum"),
  broker: z.string().trim().max(80).optional().or(z.literal("")),
  openedAt: isoDateOptional,
});

export const positionSchema = z
  .object({
    isin: z
      .string()
      .trim()
      .refine((v) => getEtfByIsin(v) !== null, "Choisissez un ETF dans la liste"),
    quantity: z.coerce
      .number()
      .positive("Le nombre de parts doit être supérieur à 0")
      .max(1_000_000, "Nombre de parts trop élevé"),
    boughtAt: notFuture,
  });

export const preferencesSchema = z.object({
  currency: z.enum(["EUR", "USD", "GBP", "CHF"]),
  numberLocale: z.enum(["fr", "en"]),
});

export const depositsSchema = z.object({
  depositsEur: z.coerce
    .number()
    .min(0, "Les versements doivent être positifs")
    .max(500_000, "Montant trop élevé"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EnvelopeInput = z.infer<typeof envelopeSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type DepositsInput = z.infer<typeof depositsSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
