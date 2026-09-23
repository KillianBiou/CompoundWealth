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

export const envelopeSchema = z
  .object({
    type: z.enum(["PEA", "CTO", "LIVRET_A"]),
    name: z.string().trim().min(1, "Le nom est requis").max(80, "80 caractères maximum"),
    broker: z.string().trim().max(80).optional().or(z.literal("")),
    openedAt: isoDateOptional,
    initialAmountEur: z.coerce
      .number()
      .min(0, "Le montant doit être positif")
      .max(500_000, "Montant trop élevé")
      .optional(),
  })
  .refine((v) => v.type !== "LIVRET_A" || v.initialAmountEur === undefined || v.initialAmountEur >= 0, {
    message: "Le montant initial doit être positif",
    path: ["initialAmountEur"],
  });

export const livretSettingsSchema = z.object({
  interestRate: z.coerce
    .number()
    .min(0, "Le taux doit être positif")
    .max(15, "Taux peu plausible (15 % maximum)"),
  inflationRate: z.coerce
    .number()
    .min(-5, "Inflation peu plausible")
    .max(20, "Inflation peu plausible"),
});

export const livretDepositSchema = z.object({
  date: notFuture,
  amountEur: z.coerce
    .number()
    .refine((v) => v !== 0, "Le montant ne peut pas être nul")
    .min(-500_000, "Montant trop élevé")
    .max(500_000, "Montant trop élevé"),
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

export const dcaFrequencySchema = z.enum(["BIWEEKLY", "MONTHLY", "BIMONTHLY", "QUARTERLY"], {
  message: "Périodicité invalide",
});

export const dcaLineSchema = z.object({
  isin: z
    .string()
    .trim()
    .refine((v) => getEtfByIsin(v) !== null, "Choisissez un ETF dans la liste"),
  maxAmountEur: z.coerce
    .number()
    .positive("Le montant doit être supérieur à 0")
    .max(1_000_000, "Montant trop élevé"),
});

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Date de départ invalide");

export const createDcaSchema = z
  .object({
    frequency: dcaFrequencySchema,
    startDate: isoDate,
    lines: z.array(dcaLineSchema).min(1, "Ajoutez au moins un titre").max(20, "20 titres maximum"),
  })
  .superRefine((data, ctx) => {
    const isins = new Set<string>();
    for (const [index, line] of data.lines.entries()) {
      if (isins.has(line.isin)) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", index, "isin"],
          message: "Ce titre est déjà dans la liste",
        });
      }
      isins.add(line.isin);
    }
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EnvelopeInput = z.infer<typeof envelopeSchema>;
export type PositionInput = z.infer<typeof positionSchema>;
export type DepositsInput = z.infer<typeof depositsSchema>;
export type LivretSettingsInput = z.infer<typeof livretSettingsSchema>;
export type LivretDepositInput = z.infer<typeof livretDepositSchema>;
export const createLivretDcaSchema = z.object({
  frequency: dcaFrequencySchema,
  startDate: isoDate,
  maxAmountEur: z.coerce
    .number()
    .positive("Le montant doit être supérieur à 0")
    .max(1_000_000, "Montant trop élevé"),
});

export type CreateDcaInput = z.infer<typeof createDcaSchema>;
export type CreateLivretDcaInput = z.infer<typeof createLivretDcaSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
