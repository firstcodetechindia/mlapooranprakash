import {
  DocumentSourceType,
  DocumentStatus,
  DocumentApprovalStatus,
} from "@/generated/prisma/enums";

export { DocumentSourceType, DocumentStatus, DocumentApprovalStatus };

export const SOURCE_TYPE_LABELS: Record<DocumentSourceType, string> = {
  BIOGRAPHY: "Biography",
  FACT_SHEET: "Fact Sheet",
  SPEECH: "Speech",
  PREVIOUS_POST: "Previous Post",
  PRESS_RELEASE: "Press Release",
  POLICY_DOCUMENT: "Policy Document",
  EVENT_INFO: "Event Information",
  OTHER: "Other",
};

export const ALL_SOURCE_TYPES: DocumentSourceType[] = [
  "BIOGRAPHY",
  "FACT_SHEET",
  "SPEECH",
  "PREVIOUS_POST",
  "PRESS_RELEASE",
  "POLICY_DOCUMENT",
  "EVENT_INFO",
  "OTHER",
];

export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
];

export const ACCEPTED_FILE_EXTENSIONS = ".pdf,.docx,.txt,.csv";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20MB
