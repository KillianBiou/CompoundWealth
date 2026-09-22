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
    valueEur: z.coerce
      .number()
      .positive("La valeur doit être supérieure à 0")
      .max(100_000_000, "Valeur trop élevée"),
    boughtAt: notFuture,
  });

export const valuationSchema = z.object({
  date: notFuture,
  valueEur: z.coerce
    .number()
    .min(0, "La valeur doit être positive")
    .max(100_000_000, "Valeur trop élevée"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EnvelopeInput = z.infer<typeof envelopeSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type ValuationInput = z.infer<typeof valuationSchema>;
