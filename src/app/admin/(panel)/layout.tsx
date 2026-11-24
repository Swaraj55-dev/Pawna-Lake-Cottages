import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { site } from "@/config/site";
import { getAdmin } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { signOut } from "../actions";

async function AdminUser() {
  const admin = await getAdmin();
  if (!admin) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-sand/80">
      <span className="hidden max-w-[16rem] truncate sm:inline">{admin.email}</span>
      <form action={signOut}>
        <button type="submit" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 font-semibold text-sand hover:bg-sand/10">
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </form>
    </div>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="sticky top-0 z-40 bg-lake-deep text-sand shadow">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-heading text-lg">
              {site.name} <span className="text-sunset">Admin</span>
            </Link>
            <Link href="/" target="_blank" className="hidden items-center gap-1 text-xs text-sand/60 hover:text-sand md:inline-flex">
              View site <ExternalLink className="size-3" aria-hidden />
            </Link>
          </div>
          <Suspense fallback={null}>
            <AdminUser />
          </Suspense>
          <div className="order-last w-full pb-1 lg:order-none lg:w-auto lg:pb-0">
            <Suspense fallback={null}>
              <AdminNav />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </>
  );
}
