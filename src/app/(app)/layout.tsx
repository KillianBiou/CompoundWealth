import { redirect } from "next/navigation";
import { getSession } from "@/server/session";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppShell>{children}</AppShell>;
}
