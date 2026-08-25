"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { primaryNav, settingsNav } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";

/**
 * Reads nav items from config directly rather than accepting them as a
 * prop — nav items carry Lucide icon component references, and passing
 * those from a Server Component into this Client Component fails React's
 * "only plain objects" serialization check for props crossing that
 * boundary.
 */
export function NavList({ group }: { group: "primary" | "settings" }) {
  const pathname = usePathname();
  const items = group === "primary" ? primaryNav : settingsNav;

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        if (!item.available) {
          return (
            <div
              key={item.href}
              className="flex cursor-not-allowed items-center justify-between rounded-md px-2.5 py-1.5 text-sm text-sidebar-foreground/40"
              title="Coming in a later phase"
            >
              <span className="flex items-center gap-2.5">
                <Icon className="size-4" />
                {item.label}
              </span>
              <Badge
                variant="outline"
                className="border-sidebar-border text-[10px] font-normal text-sidebar-foreground/40"
              >
                Soon
              </Badge>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
