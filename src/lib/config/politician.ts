import { Tone, ContentLanguage } from "@/generated/prisma/enums";

export { Tone, ContentLanguage };

export const TONE_LABELS: Record<Tone, string> = {
  FORMAL: "Formal",
  WARM: "Warm",
  PUBLIC_SERVICE: "Public-service focused",
  CONVERSATIONAL: "Conversational",
  CELEBRATORY: "Celebratory",
  CONDOLENCE: "Condolence",
  INFORMATIONAL: "Informational",
};

export const ALL_TONES: Tone[] = [
  "FORMAL",
  "WARM",
  "PUBLIC_SERVICE",
  "CONVERSATIONAL",
  "CELEBRATORY",
  "CONDOLENCE",
  "INFORMATIONAL",
];

export const LANGUAGE_LABELS: Record<ContentLanguage, string> = {
  HINDI: "Hindi",
  ENGLISH: "English",
  HINGLISH: "Hinglish",
};

export const ALL_LANGUAGES: ContentLanguage[] = ["HINDI", "ENGLISH", "HINGLISH"];
