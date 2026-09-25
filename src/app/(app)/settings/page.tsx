import { getCurrentUser } from "@/server/queries";
import { centsToEuros } from "@/lib/money";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";
import { ProfileForm } from "./profile-form";
import { PreferencesForm } from "./preferences-form";
import { DangerZone } from "./danger-zone";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const t = getDictionary(await getLocaleFromCookies());
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.settings.subtitle}</p>
      </div>
      <ProfileForm
        email={user.email}
        name={user.name ?? ""}
        age={user.age ? String(user.age) : ""}
        job={user.job ?? ""}
        salaryEur={user.salaryCents ? centsToEuros(user.salaryCents) : ""}
      />
      <div>
        <h2 className="font-heading text-lg font-semibold">{t.settings.preferences.title}</h2>
        <p className="mt-1 mb-4 text-sm text-text-secondary">{t.settings.preferences.subtitle}</p>
        <PreferencesForm currency={user.currency} numberLocale={user.numberLocale} />
      </div>
      <DangerZone />
    </div>
  );
}
