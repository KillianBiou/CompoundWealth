"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary, Locale } from "./server";

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <I18nContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook de traduction côté client : const { t, locale } = useI18n();
 * t.nav.logout, t.auth.emailTitle…
 */
export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n doit être utilisé dans <I18nProvider>");
  }
  return value;
}
