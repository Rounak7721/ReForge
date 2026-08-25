import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-16">
      <Link href="/" className="text-2xl font-semibold tracking-tight">
        Reforge
      </Link>
      {children}
    </div>
  );
}
