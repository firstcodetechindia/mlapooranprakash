import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { factCheckDraft } from "@/lib/factcheck/agent";
import { addMembership, cleanupOrg, cleanupUser, createTestOrg, createTestUser } from "@/test/fixtures";

const cleanupOrgs: string[] = [];
const cleanupUsers: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupOrgs.splice(0).map(cleanupOrg));
  await Promise.all(cleanupUsers.splice(0).map(cleanupUser));
});

async function draftWithResearch(
  body: string,
  facts: Array<{ statement: string; status: string; source: string }>,
) {
  const organizationId = await createTestOrg();
  cleanupOrgs.push(organizationId);
  const userId = await createTestUser();
  cleanupUsers.push(userId);
  await addMembership(userId, organizationId, "APPROVER");

  const reportId = randomUUID();
  await db.researchReport.create({
    data: {
      id: reportId,
      organizationId,
      topic: "Test topic",
      summary: "Test summary",
      confidence: 80,
      facts,
      sources: [],
    },
  });

  const draftId = randomUUID();
  await db.draft.create({
    data: {
      id: draftId,
      organizationId,
      researchReportId: reportId,
      platform: "X",
      format: "SHORT_POST",
      language: "ENGLISH",
      tone: "FORMAL",
      body,
      hashtags: [],
      status: "DRAFT",
    },
  });

  return { organizationId, draftId };
}

describe("factCheckDraft", () => {
  it("marks a sentence VERIFIED when it substantially overlaps a grounded fact", async () => {
    const { organizationId, draftId } = await draftWithResearch(
      "The new hospital will add five hundred beds to the district by next year.",
      [
        {
          statement: "The new hospital will add five hundred beds to the district.",
          status: "VERIFIED",
          source: "Health Ministry press release",
        },
      ],
    );

    const results = await factCheckDraft(organizationId, draftId);

    expect(results.some((r) => r.status === "VERIFIED")).toBe(true);
    const draft = await db.draft.findUniqueOrThrow({ where: { id: draftId } });
    expect(draft.status).toBe("NEEDS_REVIEW");
  });

  it("flags a specific numeric claim as UNVERIFIED when no grounded fact supports it", async () => {
    const { organizationId, draftId } = await draftWithResearch(
      "We have created 40000 new jobs in the last quarter alone.",
      [{ statement: "The district population is growing steadily.", status: "VERIFIED", source: "Census" }],
    );

    const results = await factCheckDraft(organizationId, draftId);

    expect(results.some((r) => r.status === "UNVERIFIED")).toBe(true);
  });

  it("does not ground on an AI_INFERENCE fact — only VERIFIED/USER_PROVIDED count", async () => {
    const { organizationId, draftId } = await draftWithResearch(
      "The new hospital will add 500 beds to the district by next year.",
      [
        {
          statement: "The new hospital will add 500 beds to the district.",
          status: "AI_INFERENCE",
          source: "model guess",
        },
      ],
    );

    const results = await factCheckDraft(organizationId, draftId);

    // The numeric claim has no VERIFIED/USER_PROVIDED backing, so it must
    // not be silently accepted as VERIFIED just because an AI_INFERENCE
    // fact happens to say the same thing.
    expect(results.some((r) => r.status === "VERIFIED")).toBe(false);
    expect(results.some((r) => r.status === "UNVERIFIED")).toBe(true);
  });

  it("skips non-factual sentences (no numbers/dates/units) entirely", async () => {
    const { organizationId, draftId } = await draftWithResearch(
      "Thank you to everyone who came out to support our community today.",
      [],
    );

    const results = await factCheckDraft(organizationId, draftId);

    expect(results).toHaveLength(0);
  });
});
