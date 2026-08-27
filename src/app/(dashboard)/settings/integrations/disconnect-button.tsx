"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { disconnectAccountAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DisconnectButton({
  organizationId,
  accountId,
}: {
  organizationId: string;
  accountId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectAccountAction(organizationId, accountId);
      toast.success("Disconnected");
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={pending}>
      {pending ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
