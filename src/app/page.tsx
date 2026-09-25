import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { getSession } from "@/server/session";
import { ButtonLink, Card } from "@/components/ui";
import { Logo } from "@/components/app-shell";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const t = getDictionary(await getLocaleFromCookies());
  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          <ButtonLink href="/login" variant="ghost">
            {t.landing.login}
          </ButtonLink>
          <ButtonLink href="/signup">{t.landing.signup}</ButtonLink>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <div className="space-y-5">
          <h1 className="font-heading text-4xl font-semibold leading-tight md:text-5xl">
            {t.landing.titleLine1}
            <br />
            {t.landing.titleAccentPrefix}{" "}
            <span className="text-accent-500">{t.landing.titleAccent}</span>{" "}
            {t.landing.titleAccentSuffix}
          </h1>
          <p className="mx-auto max-w-xl text-text-secondary">{t.landing.subtitle}</p>
          <div className="flex justify-center gap-3 pt-2">
            <ButtonLink href="/signup" className="px-6 py-2.5">
              {t.landing.signup}
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="px-6 py-2.5">
              {t.landing.haveAccount}
            </ButtonLink>
          </div>
        </div>
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <TrendingUp className="h-5 w-5 text-accent-500" aria-hidden />
            <p className="mt-3 font-medium">{t.landing.card1Title}</p>
            <p className="mt-1 text-sm text-text-secondary">{t.landing.card1Text}</p>
          </Card>
          <Card className="p-5">
            <p className="font-heading text-lg font-semibold text-accent-500">150 000 €</p>
            <p className="mt-1 font-medium">{t.landing.card2Title}</p>
            <p className="mt-1 text-sm text-text-secondary">{t.landing.card2Text}</p>
          </Card>
          <Card className="p-5">
            <p className="font-heading text-lg font-semibold text-accent-500">31,4 %</p>
            <p className="mt-1 font-medium">{t.landing.card3Title}</p>
            <p className="mt-1 text-sm text-text-secondary">{t.landing.card3Text}</p>
          </Card>
        </div>
      </div>
      <footer className="text-center text-xs text-text-muted">
        <Link href="/login" className="hover:text-text-secondary">
          CompoundedWealth
        </Link>{" "}
        {t.landing.footer}
      </footer>
    </div>
  );
}
