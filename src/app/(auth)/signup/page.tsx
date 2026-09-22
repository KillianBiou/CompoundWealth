import Link from "next/link";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">Créer mon compte</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Un email et un mot de passe suffisent — rien d&apos;autre n&apos;est demandé.
        </p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-text-secondary">
        Déjà inscrit ?{" "}
        <Link href="/login" className="font-medium text-accent-500 hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
