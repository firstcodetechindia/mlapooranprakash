import type { Metadata } from "next";

import { requireActiveMembership } from "@/lib/auth/session";
import { listKnowledgeDocuments } from "@/lib/knowledge/service";
import { hasRoleAtLeast } from "@/lib/security/authorize";
import { isRealAIConfigured } from "@/lib/ai";
import { UploadDialog } from "./upload-dialog";
import { DocumentList } from "./document-list";
import { SearchBox } from "./search-box";

export const metadata: Metadata = {
  title: "Knowledge Base — Political Social Command Center",
};

export default async function KnowledgePage() {
  const { membership } = await requireActiveMembership();
  const documents = await listKnowledgeDocuments(membership.organizationId);
  const canManage = hasRoleAtLeast(membership.role, "ADMIN");
  const canUpload = hasRoleAtLeast(membership.role, "EDITOR");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Biographies, fact sheets, speeches, and previous posts the AI
            content agent can draw on — once a document is approved.
          </p>
        </div>
        {canUpload ? <UploadDialog organizationId={membership.organizationId} /> : null}
      </div>

      {!isRealAIConfigured() ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Running on the mock embeddings provider — search results are
          deterministic but not semantically meaningful yet. Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            OPENAI_API_KEY
          </code>{" "}
          in .env.example to switch to real embeddings.
        </div>
      ) : null}

      <SearchBox organizationId={membership.organizationId} />

      <DocumentList
        organizationId={membership.organizationId}
        documents={documents}
        canManage={canManage}
      />
    </div>
  );
}
