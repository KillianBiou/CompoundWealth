import { Logo } from "@/components/app-shell";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex justify-center">
        <Logo />
      </div>
      {children}
    </div>
  );
}
