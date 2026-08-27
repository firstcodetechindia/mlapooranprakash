"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Target } from "@phosphor-icons/react";

import { scanForOpportunitiesAction } from "./actions";
import { Button } from "@/components/ui/button";

export function ScanButton({ organizationId }: { organizationId: string }) {
  const [pending, startTransition] = useTransition();

  function handleScan() {
    startTransition(async () => {
      const result = await scanForOpportunitiesAction(organizationId);
      if (result.opportunitiesCreated === 0) {
        toast.info(
          result.postsScanned === 0
            ? "No recent reference posts to scan. Fetch some sources first."
            : `Scanned ${result.postsScanned} posts — nothing scored high enough yet.`,
        );
      } else {
        toast.success(
          `Found ${result.opportunitiesCreated} new opportunit${result.opportunitiesCreated === 1 ? "y" : "ies"} from ${result.postsScanned} posts.`,
        );
      }
    });
  }

  return (
    <Button onClick={handleScan} disabled={pending}>
      <Target className={pending ? "size-4 animate-spin" : "size-4"} />
      {pending ? "Scanning…" : "Scan for opportunities"}
    </Button>
  );
}
