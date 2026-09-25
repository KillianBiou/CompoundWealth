import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { ToastProvider } from "@/components/toast";
import { I18nProvider } from "@/i18n/provider";
import { getDictionary, DEFAULT_LOCALE } from "@/i18n/server";

export function renderWithI18n(ui: ReactElement) {
  return render(
    <I18nProvider locale={DEFAULT_LOCALE} dictionary={getDictionary(DEFAULT_LOCALE)}>
      {ui}
    </I18nProvider>,
  );
}

export function renderWithToast(ui: ReactElement) {
  return renderWithI18n(<ToastProvider>{ui}</ToastProvider>);
}
