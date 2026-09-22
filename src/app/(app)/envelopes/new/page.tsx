import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { NewEnvelopeForm } from "./new-envelope-form";

export default async function NewEnvelopePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Nouvelle enveloppe</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Choisissez le cadre fiscal qui correspond à votre stratégie long terme.
        </p>
      </div>
      <NewEnvelopeForm />
    </div>
  );
}
