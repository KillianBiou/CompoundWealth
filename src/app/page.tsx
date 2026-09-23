import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { getSession } from "@/server/session";
import { ButtonLink, Card } from "@/components/ui";
import { Logo } from "@/components/app-shell";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="mx-auto flex min-h-dvh max-w-4xl flex-col px-6 py-6">
      <div className="flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          <ButtonLink href="/login" variant="ghost">
            Connexion
          </ButtonLink>
          <ButtonLink href="/signup">Créer mon compte</ButtonLink>
        </div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <div className="space-y-5">
          <h1 className="font-heading text-4xl font-semibold leading-tight md:text-5xl">
            Suivez votre patrimoine,
            <br />
            laissez les <span className="text-accent-500">intérêts composés</span> travailler.
          </h1>
          <p className="mx-auto max-w-xl text-text-secondary">
            CompoundedWealth est un tracker de portefeuille pensé pour l&apos;investissement long
            terme. Organisez vos enveloppes (PEA, CTO), suivez vos positions et visualisez la
            croissance de votre capital — sans synchronisation bancaire, sans bruit de trading.
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <ButtonLink href="/signup" className="px-6 py-2.5">
              Créer mon compte
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary" className="px-6 py-2.5">
              J&apos;ai déjà un compte
            </ButtonLink>
          </div>
        </div>
        <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <TrendingUp className="h-5 w-5 text-accent-500" aria-hidden />
            <p className="mt-3 font-medium">Long terme</p>
            <p className="mt-1 text-sm text-text-secondary">
              Valorisez une fois par mois, regardez la courbe grandir.
            </p>
          </Card>
          <Card className="p-5">
            <p className="font-heading text-lg font-semibold text-accent-500">150 000 €</p>
            <p className="mt-1 font-medium">Plafond PEA suivi</p>
            <p className="mt-1 text-sm text-text-secondary">
              Versements et antériorité fiscale affichés en continu.
            </p>
          </Card>
          <Card className="p-5">
            <p className="font-heading text-lg font-semibold text-accent-500">31,4 %</p>
            <p className="mt-1 font-medium">Flat tax CTO 2026</p>
            <p className="mt-1 text-sm text-text-secondary">
              Les règles fiscales de vos enveloppes, à jour.
            </p>
          </Card>
        </div>
      </div>
      <footer className="text-center text-xs text-text-muted">
        <Link href="/login" className="hover:text-text-secondary">
          CompoundedWealth
        </Link>{" "}
        — investissement long terme, pas de trading.
      </footer>
    </div>
  );
}
