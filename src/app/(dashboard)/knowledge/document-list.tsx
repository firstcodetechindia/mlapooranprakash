"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  CircleNotch,
  FileText,
  Trash,
  Warning,
  XCircle,
} from "@phosphor-icons/react";

import { SOURCE_TYPE_LABELS } from "@/lib/config/knowledge";
import type { DocumentSourceType, DocumentStatus, DocumentApprovalStatus } from "@/lib/config/knowledge";
import { deleteDocumentAction, setApprovalAction } from "./actions";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DocumentRow {
  id: string;
  title: string;
  sourceType: DocumentSourceType;
  status: DocumentStatus;
  approvalStatus: DocumentApprovalStatus;
  fileName: string;
  fileSize: number;
  processingError: string | null;
  uploadedBy: { name: string | null; email: string } | null;
  createdAt: Date;
  _count: { chunks: number };
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_BADGE: Record<DocumentStatus, { label: string; variant: "secondary" | "default" | "destructive" }> = {
  PROCESSING: { label: "Processing", variant: "secondary" },
  READY: { label: "Ready", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

const APPROVAL_BADGE: Record<DocumentApprovalStatus, { label: string; variant: "outline" | "default" | "destructive" }> = {
  PENDING: { label: "Pending review", variant: "outline" },
  APPROVED: { label: "Approved", variant: "default" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export function DocumentList({
  organizationId,
  documents,
  canManage,
}: {
  organizationId: string;
  documents: DocumentRow[];
  canManage: boolean;
}) {
  if (documents.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload a biography, fact sheet, speech, or press release to give the AI content agent context to write from."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          organizationId={organizationId}
          doc={doc}
          canManage={canManage}
        />
      ))}
    </div>
  );
}

function DocumentCard({
  organizationId,
  doc,
  canManage,
}: {
  organizationId: string;
  doc: DocumentRow;
  canManage: boolean;
}) {
  const [approvePending, startApprove] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function handleApproval(status: "APPROVED" | "REJECTED") {
    startApprove(async () => {
      await setApprovalAction(organizationId, doc.id, status);
      toast.success(status === "APPROVED" ? "Document approved" : "Document rejected");
    });
  }

  function handleDelete() {
    startDelete(async () => {
      await deleteDocumentAction(organizationId, doc.id);
      toast.success("Document deleted");
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium">{doc.title}</p>
              <Badge variant="outline">{SOURCE_TYPE_LABELS[doc.sourceType]}</Badge>
              <Badge variant={STATUS_BADGE[doc.status].variant}>
                {doc.status === "PROCESSING" ? (
                  <CircleNotch className="size-3 animate-spin" />
                ) : null}
                {STATUS_BADGE[doc.status].label}
              </Badge>
              <Badge variant={APPROVAL_BADGE[doc.approvalStatus].variant}>
                {APPROVAL_BADGE[doc.approvalStatus].label}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {doc.fileName} · {formatSize(doc.fileSize)} · {doc._count.chunks} chunk
              {doc._count.chunks === 1 ? "" : "s"} ·{" "}
              {doc.uploadedBy?.name ?? doc.uploadedBy?.email ?? "Unknown"}
            </p>
            {doc.status === "FAILED" && doc.processingError ? (
              <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                <Warning className="mt-0.5 size-3 shrink-0" />
                {doc.processingError}
              </p>
            ) : null}
          </div>
        </div>

        {canManage ? (
          <div className="flex items-center justify-end gap-1.5 border-t border-border pt-3">
            {doc.approvalStatus !== "APPROVED" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApproval("APPROVED")}
                disabled={approvePending}
              >
                <CheckCircle className="size-3.5" />
                Approve
              </Button>
            ) : null}
            {doc.approvalStatus !== "REJECTED" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleApproval("REJECTED")}
                disabled={approvePending}
              >
                <XCircle className="size-3.5" />
                Reject
              </Button>
            ) : null}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive">
                  <Trash className="size-3.5" />
                  <span className="sr-only">Delete</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes &quot;{doc.title}&quot; and its {doc._count.chunks}{" "}
                    indexed chunk{doc._count.chunks === 1 ? "" : "s"} permanently.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={deletePending}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
