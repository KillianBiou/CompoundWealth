import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Space_Grotesk } from "next/font/google";
import { I18nProvider } from "@/i18n/provider";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  getDictionary,
  resolveLocaleFromHeaders,
  type Locale,
} from "@/i18n/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CompoundedWealth — Suivi de portefeuille long terme",
  description:
    "Suivez la croissance de votre patrimoine investi (PEA, CTO), enveloppe par enveloppe, et laissez les intérêts composés travailler.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const cookieHeader = headerList.get("cookie") ?? "";
  const cookieLocale = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  const locale: Locale =
    cookieLocale === "fr" || cookieLocale === "en"
      ? cookieLocale
      : resolveLocaleFromHeaders(headerList.get("accept-language")) ?? DEFAULT_LOCALE;
  const dictionary = getDictionary(locale);

  return (
    <html
      lang={locale}
      data-theme="dark"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
