import fr from "./dictionaries/fr.json";
import en from "./dictionaries/en.json";

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "cw_locale";

export type Dictionary = typeof fr;

const dictionaries: Record<Locale, Dictionary> = { fr, en };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "fr" || value === "en";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

/**
 * Lit la locale depuis le cookie de requête — côté serveur uniquement.
 * Retourne la locale par défaut si absente ou invalide.
 */
export async function getLocaleFromCookies(): Promise<Locale> {
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Résout la locale côté serveur : cookie > header Accept-Language > défaut.
 */
export function resolveLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const preferred = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of preferred) {
    if (tag.startsWith("fr")) return "fr";
    if (tag.startsWith("en")) return "en";
  }
  return DEFAULT_LOCALE;
}
