import { getCurrentUser } from "@/server/queries";
import { centsToEuros } from "@/lib/money";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";
import { DangerZone } from "./danger-zone";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Réglages</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Votre profil est entièrement optionnel — chaque champ peut rester vide.
        </p>
      </div>
      <ProfileForm
        email={user.email}
        name={user.name ?? ""}
        age={user.age ? String(user.age) : ""}
        job={user.job ?? ""}
        salaryEur={user.salaryCents ? centsToEuros(user.salaryCents) : ""}
      />
      <div>
        <h2 className="font-heading text-lg font-semibold">Préférences d&apos;affichage</h2>
        <p className="mt-1 mb-4 text-sm text-text-secondary">
          Devise et format des montants affichés dans toute l&apos;application.
        </p>
        <PreferencesForm currency={user.currency} numberLocale={user.numberLocale} />
      </div>
      <DangerZone />
    </div>
  );
}
