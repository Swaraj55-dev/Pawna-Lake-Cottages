"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ClipboardList, Plus, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Bookings", Icon: ClipboardList },
  { href: "/admin/new", label: "New booking", Icon: Plus },
  { href: "/admin/calendar", label: "Occupancy", Icon: CalendarDays },
  { href: "/admin/availability", label: "Blocks & prices", Icon: SlidersHorizontal },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mx-1 flex gap-1 overflow-x-auto">
      {links.map(({ href, label, Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              active ? "bg-sand text-lake" : "text-sand/80 hover:bg-sand/10 hover:text-sand",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
