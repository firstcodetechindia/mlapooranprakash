"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plug } from "@phosphor-icons/react";

import type { Platform } from "@/generated/prisma/enums";
import { PLATFORM_LABELS } from "@/lib/config/content";
import { connectAccountAction } from "./actions";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ConnectDialog({
  organizationId,
  platform,
  mockMode,
}: {
  organizationId: string;
  platform: Platform;
  mockMode: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState(mockMode ? "mock-token" : "");
  const [pending, startTransition] = useTransition();

  function handleConnect() {
    startTransition(async () => {
      const result = await connectAccountAction(organizationId, platform, token);
      if (result.ok) {
        toast.success(`${PLATFORM_LABELS[platform]} connected`);
        setOpen(false);
      } else {
        toast.error(result.error ?? "Connection failed.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plug className="size-3.5" />
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect {PLATFORM_LABELS[platform]}</DialogTitle>
          <DialogDescription>
            {mockMode
              ? "Mock mode is on — any token works and nothing real is contacted. Publishing will simulate success with deterministic fake engagement numbers."
              : `Paste an access token obtained from ${platform === "X" ? "the X Developer Portal" : "Meta for Developers"}. It's encrypted before storage and never displayed again.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Access token</Label>
          <Input
            type={mockMode ? "text" : "password"}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            disabled={mockMode}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleConnect} disabled={pending || !token}>
            {pending ? "Connecting…" : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
