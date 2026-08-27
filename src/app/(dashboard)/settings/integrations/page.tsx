import type { Metadata } from "next";

import { requireActiveMembership } from "@/lib/auth/session";
import { listSocialAccounts } from "@/lib/social/accounts";
import { isMockSocialMode } from "@/lib/social";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import { ALL_PLATFORMS, PLATFORM_LABELS } from "@/lib/config/content";
import { ConnectDialog } from "./connect-dialog";
import { DisconnectButton } from "./disconnect-button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Integrations — Political Social Command Center",
};

export default async function IntegrationsPage() {
  const { membership } = await requireActiveMembership();
  const accounts = await listSocialAccounts(membership.organizationId);
  const canManage = hasRoleAtLeast(membership.role, "ADMIN");
  const mockMode = isMockSocialMode();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect official platform accounts to publish approved drafts.
        </p>
      </div>

      {mockMode ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5 text-xs">MOCK_SOCIAL_APIS=true</code>{" "}
          — connecting and publishing here is fully simulated, no real
          platform is contacted. Set it to <code className="rounded bg-muted px-1 py-0.5 text-xs">false</code> and
          provide real access tokens to publish for real.
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {ALL_PLATFORMS.map((platform) => {
          const account = accounts.find((a) => a.platform === platform);
          const connected = account?.status === "CONNECTED";
          return (
            <Card key={platform}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{PLATFORM_LABELS[platform]}</CardTitle>
                    <CardDescription>
                      {connected
                        ? account!.accountName
                        : "Not connected"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected ? <Badge>Connected</Badge> : null}
                    {canManage ? (
                      connected ? (
                        <DisconnectButton organizationId={membership.organizationId} accountId={account!.id} />
                      ) : (
                        <ConnectDialog
                          organizationId={membership.organizationId}
                          platform={platform}
                          mockMode={mockMode}
                        />
                      )
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              {account?.lastError ? (
                <CardContent>
                  <p className="text-xs text-destructive">{account.lastError}</p>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
