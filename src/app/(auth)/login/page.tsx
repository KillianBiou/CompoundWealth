import Link from "next/link";
import { LoginForm } from "./login-form";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";

export default async function LoginPage() {
  const t = getDictionary(await getLocaleFromCookies());
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">{t.auth.loginTitle}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.auth.loginSubtitle}</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-text-secondary">
        {t.auth.noAccount}{" "}
        <Link href="/signup" className="font-medium text-accent-500 hover:underline">
          {t.auth.signupButton}
        </Link>
      </p>
    </div>
  );
}
