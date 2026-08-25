import Link from "next/link";
import { Broadcast } from "@phosphor-icons/react/ssr";

import { NavList } from "@/components/dashboard/nav-list";
import { glassClasses } from "@/lib/glass";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  return (
    <aside
      className={cn(
        glassClasses,
        "sticky top-0 hidden h-screen w-64 shrink-0 flex-col text-sidebar-foreground md:flex",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border/60 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Broadcast weight="fill" className="size-4" />
          </span>
          <span className="text-sm">Command Center</span>
        </Link>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavList group="primary" />
        <div>
          <p className="px-2.5 pb-1.5 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/40">
            Settings
          </p>
          <NavList group="settings" />
        </div>
      </div>
    </aside>
  );
}
