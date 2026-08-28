import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import {
  publishDraft,
  scheduleDraft,
  unscheduleDraft,
  DraftNotApprovedError,
  NoConnectedAccountError,
} from "@/lib/social/publish";
import {
  addMembership,
  cleanupOrg,
  cleanupUser,
  createConnectedAccount,
  createDraft,
  createTestOrg,
  createTestUser,
} from "@/test/fixtures";

const cleanupOrgs: string[] = [];
const cleanupUsers: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupOrgs.splice(0).map(cleanupOrg));
  await Promise.all(cleanupUsers.splice(0).map(cleanupUser));
});

async function setupOrgWithAccount() {
  const organizationId = await createTestOrg();
  cleanupOrgs.push(organizationId);
  const userId = await createTestUser();
  cleanupUsers.push(userId);
  await addMembership(userId, organizationId, "APPROVER");
  await createConnectedAccount(organizationId, "X");
  return { organizationId, userId };
}

describe("publishDraft", () => {
  it("publishes an approved draft and returns a PUBLISHED SocialPost", async () => {
    const { organizationId, userId } = await setupOrgWithAccount();
    const draftId = await createDraft(organizationId, { status: "APPROVED" });

    const result = await publishDraft(organizationId, draftId, userId);

    expect(result.status).toBe("PUBLISHED");
    expect(result.platformPostId).toBeTruthy();
  });

  it("is idempotent: a second call for an already-published draft returns the same row without re-publishing", async () => {
    const { organizationId, userId } = await setupOrgWithAccount();
    const draftId = await createDraft(organizationId, { status: "APPROVED" });

    const first = await publishDraft(organizationId, draftId, userId);
    const second = await publishDraft(organizationId, draftId, userId);

    expect(second.id).toBe(first.id);
    expect(second.platformPostId).toBe(first.platformPostId);

    const rows = await db.socialPost.findMany({ where: { draftId } });
    expect(rows).toHaveLength(1);
  });

  it("retries a FAILED publish via upsert — no duplicate row, status flips to PUBLISHED", async () => {
    const { organizationId, userId } = await setupOrgWithAccount();
    const draftId = await createDraft(organizationId, { status: "FAILED" });
    const account = await db.socialAccount.findFirstOrThrow({ where: { organizationId } });
    const failedPost = await db.socialPost.create({
      data: {
        organizationId,
        draftId,
        socialAccountId: account.id,
        platform: "X",
        status: "FAILED",
        errorMessage: "Simulated prior failure",
      },
    });

    const result = await publishDraft(organizationId, draftId, userId);

    expect(result.id).toBe(failedPost.id);
    expect(result.status).toBe("PUBLISHED");
    const rows = await db.socialPost.findMany({ where: { draftId } });
    expect(rows).toHaveLength(1);
  });

  it("does not leak another organization's SocialPost across a mismatched (organizationId, draftId) pair", async () => {
    const orgA = await setupOrgWithAccount();
    const orgB = await createTestOrg();
    cleanupOrgs.push(orgB);
    const orgBAccountId = await createConnectedAccount(orgB, "FACEBOOK");
    const orgBDraftId = await createDraft(orgB, { platform: "FACEBOOK", status: "PUBLISHED" });
    const secretPost = await db.socialPost.create({
      data: {
        organizationId: orgB,
        draftId: orgBDraftId,
        socialAccountId: orgBAccountId,
        platform: "FACEBOOK",
        status: "PUBLISHED",
        platformPostId: "secret_org_b_post",
        platformUrl: "https://mock.facebook.example/secret_org_b_post",
        publishedAt: new Date(),
      },
    });

    // Org A's caller, but Org B's draftId — regression test for the fix in
    // commit f23072d: this must fail closed (draft not found), never hand
    // back Org B's post.
    await expect(publishDraft(orgA.organizationId, orgBDraftId, orgA.userId)).rejects.toThrow();

    const stillOrgBOnly = await db.socialPost.findUnique({ where: { id: secretPost.id } });
    expect(stillOrgBOnly?.organizationId).toBe(orgB);
    expect(stillOrgBOnly?.platformPostId).toBe("secret_org_b_post");
  });

  it("throws DraftNotApprovedError for a draft that isn't approved/scheduled/failed", async () => {
    const { organizationId, userId } = await setupOrgWithAccount();
    const draftId = await createDraft(organizationId, { status: "DRAFT" });

    await expect(publishDraft(organizationId, draftId, userId)).rejects.toThrow(DraftNotApprovedError);
  });

  it("throws NoConnectedAccountError when the platform has no connected account", async () => {
    const organizationId = await createTestOrg();
    cleanupOrgs.push(organizationId);
    const userId = await createTestUser();
    cleanupUsers.push(userId);
    await addMembership(userId, organizationId, "APPROVER");
    const draftId = await createDraft(organizationId, { platform: "INSTAGRAM", status: "APPROVED" });

    await expect(publishDraft(organizationId, draftId, userId)).rejects.toThrow(NoConnectedAccountError);
  });
});

describe("scheduleDraft / unscheduleDraft", () => {
  it("schedules an approved draft and unscheduling returns it to APPROVED", async () => {
    const { organizationId, userId } = await setupOrgWithAccount();
    const draftId = await createDraft(organizationId, { status: "APPROVED" });
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const scheduled = await scheduleDraft(organizationId, userId, draftId, scheduledAt);
    expect(scheduled.status).toBe("SCHEDULED");

    const unscheduled = await unscheduleDraft(organizationId, userId, draftId);
    expect(unscheduled.status).toBe("APPROVED");
    expect(unscheduled.scheduledAt).toBeNull();
  });

  it("refuses to schedule a draft that isn't approved", async () => {
    const { organizationId, userId } = await setupOrgWithAccount();
    const draftId = await createDraft(organizationId, { status: "DRAFT" });

    await expect(
      scheduleDraft(organizationId, userId, draftId, new Date(Date.now() + 3600_000)),
    ).rejects.toThrow(DraftNotApprovedError);
  });
});
