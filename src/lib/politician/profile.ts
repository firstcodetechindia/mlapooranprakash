import "server-only";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { ALL_LANGUAGES, ALL_TONES, type Tone, type ContentLanguage } from "@/lib/config/politician";

const tagList = z
  .array(z.string().trim().min(1).max(80))
  .max(50)
  .default([]);

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

const optionalShortText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const politicianProfileSchema = z.object({
  name: z.string().trim().min(1).max(150),
  publicDesignation: optionalShortText,
  politicalParty: optionalShortText,
  bio: optionalText,
  officialWebsite: optionalUrl,
  xHandle: optionalShortText,
  facebookHandle: optionalShortText,
  instagramHandle: optionalShortText,
  preferredTone: z.enum(ALL_TONES as [Tone, ...Tone[]]),
  preferredLanguages: z.array(z.enum(ALL_LANGUAGES as [ContentLanguage, ...ContentLanguage[]])).max(3),
  commonPhrases: tagList,
  wordsToAvoid: tagList,
  hashtagPreferences: tagList,
  contentPillars: tagList,
  importantProjects: tagList,
  publicAchievements: tagList,
  officialPositions: tagList,
  frequentTopics: tagList,
  approvedFacts: tagList,
  constituency: z.object({
    name: z.string().trim().max(150).optional().or(z.literal("")).transform((v) => v || undefined),
    state: optionalShortText,
    country: z.string().trim().max(100).default("India"),
    description: optionalText,
    population: z
      .number()
      .int()
      .nonnegative()
      .max(1_000_000_000)
      .optional()
      .nullable(),
    keyIssues: tagList,
  }),
});

export type PoliticianProfileInput = z.infer<typeof politicianProfileSchema>;

export async function getPoliticianProfile(organizationId: string) {
  return db.politicianProfile.findUnique({
    where: { organizationId },
    include: { constituency: true },
  });
}

/**
 * Creates or updates the org's one PoliticianProfile, and its linked
 * Constituency, in a single transaction. Constituency is only persisted
 * when a name is provided — an empty constituency form leaves any
 * existing link untouched rather than creating a nameless row.
 */
export async function upsertPoliticianProfile(
  organizationId: string,
  actorUserId: string,
  input: PoliticianProfileInput,
) {
  const existing = await db.politicianProfile.findUnique({
    where: { organizationId },
    include: { constituency: true },
  });

  const result = await db.$transaction(async (tx) => {
    let constituencyId = existing?.constituencyId ?? null;

    if (input.constituency.name) {
      if (constituencyId) {
        await tx.constituency.update({
          where: { id: constituencyId },
          data: {
            name: input.constituency.name,
            state: input.constituency.state,
            country: input.constituency.country,
            description: input.constituency.description,
            population: input.constituency.population ?? null,
            keyIssues: input.constituency.keyIssues,
          },
        });
      } else {
        const created = await tx.constituency.create({
          data: {
            name: input.constituency.name,
            state: input.constituency.state,
            country: input.constituency.country,
            description: input.constituency.description,
            population: input.constituency.population ?? null,
            keyIssues: input.constituency.keyIssues,
          },
        });
        constituencyId = created.id;
      }
    }

    const profileData = {
      name: input.name,
      publicDesignation: input.publicDesignation,
      politicalParty: input.politicalParty,
      bio: input.bio,
      officialWebsite: input.officialWebsite,
      xHandle: input.xHandle,
      facebookHandle: input.facebookHandle,
      instagramHandle: input.instagramHandle,
      preferredTone: input.preferredTone,
      preferredLanguages: input.preferredLanguages,
      commonPhrases: input.commonPhrases,
      wordsToAvoid: input.wordsToAvoid,
      hashtagPreferences: input.hashtagPreferences,
      contentPillars: input.contentPillars,
      importantProjects: input.importantProjects,
      publicAchievements: input.publicAchievements,
      officialPositions: input.officialPositions,
      frequentTopics: input.frequentTopics,
      approvedFacts: input.approvedFacts,
      constituencyId,
    };

    return tx.politicianProfile.upsert({
      where: { organizationId },
      update: profileData,
      create: { organizationId, ...profileData },
    });
  });

  await recordAuditLog({
    organizationId,
    userId: actorUserId,
    action: existing ? "politician_profile.updated" : "politician_profile.created",
    resourceType: "PoliticianProfile",
    resourceId: result.id,
    previousState: existing ? { name: existing.name } : undefined,
    newState: { name: result.name },
  });

  return result;
}
