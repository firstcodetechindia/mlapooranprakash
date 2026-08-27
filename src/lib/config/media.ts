import { MediaType } from "@/generated/prisma/enums";

export { MediaType };

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  IMAGE: "Image",
  VIDEO: "Video",
  DOCUMENT: "Document",
};

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export const ACCEPTED_MEDIA_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES];
export const ACCEPTED_MEDIA_EXTENSIONS = ".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm";
export const MAX_MEDIA_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB

export function mediaTypeFromMime(mimeType: string): MediaType {
  if (IMAGE_MIME_TYPES.includes(mimeType)) return "IMAGE";
  if (VIDEO_MIME_TYPES.includes(mimeType)) return "VIDEO";
  return "DOCUMENT";
}
