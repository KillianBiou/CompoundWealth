import Link from "next/link";
import { SignupForm } from "./signup-form";
import { getDictionary, getLocaleFromCookies } from "@/i18n/server";

export default async function SignupPage() {
  const t = getDictionary(await getLocaleFromCookies());
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">{t.auth.signupTitle}</h1>
        <p className="mt-1 text-sm text-text-secondary">{t.auth.signupSubtitle}</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-text-secondary">
        {t.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-accent-500 hover:underline">
          {t.auth.loginButton}
        </Link>
      </p>
    </div>
  );
}
