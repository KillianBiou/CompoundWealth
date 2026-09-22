import Link from "next/link";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-semibold">Connexion</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Content de vous revoir. Vos intérêts composés vous attendent.
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-text-secondary">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="font-medium text-accent-500 hover:underline">
          Créer mon compte
        </Link>
      </p>
    </div>
  );
}
