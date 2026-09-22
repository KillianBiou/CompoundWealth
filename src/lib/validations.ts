import { z } from "zod";

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

export const positionSchema = z.object({
  name: z.string().trim().min(1, "Le nom/ticker est requis").max(80),
  category: z.enum(["ETF", "STOCK", "BOND", "FUND", "OTHER"]),
  investedEur: z.coerce
    .number()
    .positive("Le montant investi doit être supérieur à 0")
    .max(10_000_000, "Montant trop élevé"),
  boughtAt: notFuture,
  quantity: z.coerce.number().positive().optional().or(z.literal("")),
  unitPriceEur: z.coerce.number().positive().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
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
