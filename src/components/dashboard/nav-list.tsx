"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { primaryNav, settingsNav } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";

/**
 * Reads nav items from config directly rather than accepting them as a
 * prop — nav items carry icon component references, and passing those
 * from a Server Component into this Client Component fails React's "only
 * plain objects" serialization check for props crossing that boundary.
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
              "relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:text-sidebar-accent-foreground",
              !isActive && "hover:bg-sidebar-accent/60",
              isActive && "text-sidebar-accent-foreground",
            )}
          >
            {isActive ? (
              <motion.span
                layoutId={`nav-active-${group}`}
                className="absolute inset-0 rounded-md bg-sidebar-accent"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <Icon
              weight={isActive ? "fill" : "regular"}
              className="relative size-4"
            />
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
