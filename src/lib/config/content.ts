import { Platform, DraftStatus, FactCheckStatus } from "@/generated/prisma/enums";

export { Platform, DraftStatus, FactCheckStatus };

export const PLATFORM_LABELS: Record<Platform, string> = {
  X: "X (Twitter)",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
};

export const ALL_PLATFORMS: Platform[] = ["X", "FACEBOOK", "INSTAGRAM"];

export const DRAFT_STATUS_LABELS: Record<DraftStatus, string> = {
  DRAFT: "Draft",
  FACT_CHECK: "Fact-checking",
  NEEDS_REVIEW: "Needs review",
  APPROVED: "Approved",
  SCHEDULED: "Scheduled",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  FAILED: "Failed",
};

export const FACT_CHECK_STATUS_LABELS: Record<FactCheckStatus, string> = {
  VERIFIED: "Verified",
  PARTIALLY_VERIFIED: "Partially verified",
  UNVERIFIED: "Unverified",
  CONFLICTING: "Conflicting",
};

export const EDITABLE_DRAFT_STATUSES: DraftStatus[] = [
  "DRAFT",
  "FACT_CHECK",
  "NEEDS_REVIEW",
  "REJECTED",
];
