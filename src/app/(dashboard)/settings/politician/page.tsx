import type { Metadata } from "next";

import { requireActiveMembership } from "@/lib/auth/session";
import { getPoliticianProfile } from "@/lib/politician/profile";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import { PoliticianProfileForm } from "./politician-form";

export const metadata: Metadata = {
  title: "Politician Profile — Political Social Command Center",
};

export default async function PoliticianProfilePage() {
  const { membership } = await requireActiveMembership();
  const profile = await getPoliticianProfile(membership.organizationId);
  const canEdit = hasRoleAtLeast(membership.role, "ADMIN");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Politician profile & constituency
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the identity, voice, and context every AI-generated draft
          will be written from. Content pillars, tone, and approved facts
          here directly shape what gets suggested later.
        </p>
      </div>

      <PoliticianProfileForm
        organizationId={membership.organizationId}
        profile={profile}
        readOnly={!canEdit}
      />
    </div>
  );
}
