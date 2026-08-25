import {
  SourcePlatform,
  SourceCategory,
  MonitoringFrequency,
} from "@/generated/prisma/enums";

export { SourcePlatform, SourceCategory, MonitoringFrequency };

export const PLATFORM_LABELS: Record<SourcePlatform, string> = {
  X: "X (Twitter)",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  RSS: "RSS Feed",
  WEBSITE: "Website",
  OTHER: "Other",
};

export const ALL_PLATFORMS: SourcePlatform[] = [
  "RSS",
  "WEBSITE",
  "X",
  "FACEBOOK",
  "INSTAGRAM",
  "OTHER",
];

/// Only these platforms can actually be fetched right now — X/Facebook/
/// Instagram require official API access this app doesn't have configured.
/// See ReferenceSource in schema.prisma.
export const FETCHABLE_PLATFORMS: SourcePlatform[] = ["RSS", "WEBSITE"];

export const CATEGORY_LABELS: Record<SourceCategory, string> = {
  POLITICIAN: "Politician",
  GOVERNMENT: "Government",
  GOVERNMENT_DEPARTMENT: "Government Department",
  ADMINISTRATION: "Administration",
  NEWS: "News",
  PUBLIC_ORGANIZATION: "Public Organization",
  LOCAL_INSTITUTION: "Local Institution",
  OTHER: "Other",
};

export const ALL_CATEGORIES: SourceCategory[] = [
  "POLITICIAN",
  "GOVERNMENT",
  "GOVERNMENT_DEPARTMENT",
  "ADMINISTRATION",
  "NEWS",
  "PUBLIC_ORGANIZATION",
  "LOCAL_INSTITUTION",
  "OTHER",
];

export const FREQUENCY_LABELS: Record<MonitoringFrequency, string> = {
  HOURLY: "Every hour",
  EVERY_6_HOURS: "Every 6 hours",
  DAILY: "Daily",
  WEEKLY: "Weekly",
};

export const ALL_FREQUENCIES: MonitoringFrequency[] = [
  "HOURLY",
  "EVERY_6_HOURS",
  "DAILY",
  "WEEKLY",
];
