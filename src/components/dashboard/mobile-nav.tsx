"use client";

import { useState } from "react";
import { Menu, Radar } from "lucide-react";

import { NavList } from "@/components/dashboard/nav-list";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="h-14 flex-row items-center gap-2 border-b border-sidebar-border px-4">
          <span className="flex size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Radar className="size-4" />
          </span>
          <SheetTitle className="text-sm text-sidebar-foreground">
            Command Center
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-3 py-4" onClick={() => setOpen(false)}>
          <NavList group="primary" />
          <div>
            <p className="px-2.5 pb-1.5 text-xs font-medium uppercase tracking-wide text-sidebar-foreground/40">
              Settings
            </p>
            <NavList group="settings" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
