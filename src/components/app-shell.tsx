import type { ReactNode } from "react";
import Link from "next/link";
import { LayoutDashboard, Landmark, Settings, LogOut } from "lucide-react";
import { logoutAction } from "@/server/actions";
import { Button } from "./ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/envelopes", label: "Enveloppes", icon: Landmark },
  { href: "/settings", label: "Réglages", icon: Settings },
];

export function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-elevated font-heading text-base font-bold text-accent-500">
        CW
      </span>
      <span className="font-heading text-lg font-semibold">
        Compound<span className="text-accent-500">Wealth</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border-cw bg-bg-elevated md:flex">
        <div className="p-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3">
          <form action={logoutAction}>
            <Button variant="ghost" type="submit" className="w-full justify-start">
              <LogOut className="h-4 w-4" aria-hidden />
              Déconnexion
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border-cw px-4 py-3 md:hidden">
          <Logo />
          <form action={logoutAction}>
            <Button variant="ghost" type="submit" aria-label="Déconnexion">
              <LogOut className="h-4 w-4" aria-hidden />
            </Button>
          </form>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-8">{children}</main>
        <nav className="sticky bottom-0 z-10 flex border-t border-border-cw bg-bg-elevated md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-text-secondary"
            >
              <item.icon className="h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
