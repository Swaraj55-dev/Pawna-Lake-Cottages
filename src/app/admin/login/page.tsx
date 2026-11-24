import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/config/site";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main id="main" className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-[0_24px_60px_-30px_rgb(14_59_67/0.45)] ring-1 ring-ink/5">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sunset-deep">{site.name}</p>
        <h1 className="mb-6 mt-2 text-3xl">Admin sign in</h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          We&apos;ll email you a one-time link — no password needed.{" "}
          <Link href="/" className="underline underline-offset-4">
            Back to site
          </Link>
        </p>
      </div>
    </main>
  );
}
