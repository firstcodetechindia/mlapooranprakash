import { afterEach, describe, expect, it } from "vitest";

import {
  countUnread,
  listNotifications,
  markAllRead,
  notifyRole,
  notifyUser,
} from "@/lib/notifications/service";
import { addMembership, cleanupOrg, cleanupUser, createTestOrg, createTestUser } from "@/test/fixtures";

const cleanupOrgs: string[] = [];
const cleanupUsers: string[] = [];

afterEach(async () => {
  await Promise.all(cleanupOrgs.splice(0).map(cleanupOrg));
  await Promise.all(cleanupUsers.splice(0).map(cleanupUser));
});

describe("notifyRole", () => {
  it("fans out to every member at or above the minimum role, and no one below it", async () => {
    const organizationId = await createTestOrg();
    cleanupOrgs.push(organizationId);
    const admin = await createTestUser();
    const approver = await createTestUser();
    const editor = await createTestUser();
    cleanupUsers.push(admin, approver, editor);
    await addMembership(admin, organizationId, "ADMIN");
    await addMembership(approver, organizationId, "APPROVER");
    await addMembership(editor, organizationId, "EDITOR");

    await notifyRole(organizationId, "APPROVER", {
      type: "DRAFT_NEEDS_REVIEW",
      title: "Needs review",
      body: "test",
    });

    expect(await countUnread(admin, organizationId)).toBe(1);
    expect(await countUnread(approver, organizationId)).toBe(1);
    expect(await countUnread(editor, organizationId)).toBe(0);
  });

  it("excludes the given userId from the fan-out", async () => {
    const organizationId = await createTestOrg();
    cleanupOrgs.push(organizationId);
    const approverA = await createTestUser();
    const approverB = await createTestUser();
    cleanupUsers.push(approverA, approverB);
    await addMembership(approverA, organizationId, "APPROVER");
    await addMembership(approverB, organizationId, "APPROVER");

    await notifyRole(
      organizationId,
      "APPROVER",
      { type: "DRAFT_APPROVED", title: "x", body: "x" },
      approverA,
    );

    expect(await countUnread(approverA, organizationId)).toBe(0);
    expect(await countUnread(approverB, organizationId)).toBe(1);
  });
});

describe("listNotifications / countUnread / markAllRead", () => {
  it("scopes by organizationId — a user's notification in one org doesn't appear when queried under another", async () => {
    const orgA = await createTestOrg();
    const orgB = await createTestOrg();
    cleanupOrgs.push(orgA, orgB);
    const userId = await createTestUser();
    cleanupUsers.push(userId);
    await addMembership(userId, orgA, "EDITOR");
    await addMembership(userId, orgB, "EDITOR");

    await notifyUser(orgA, userId, { type: "DRAFT_APPROVED", title: "Org A event", body: "x" });

    expect(await countUnread(userId, orgA)).toBe(1);
    expect(await countUnread(userId, orgB)).toBe(0);
    const orgBList = await listNotifications(userId, orgB);
    expect(orgBList).toHaveLength(0);
  });

  it("markAllRead only clears the given org's unread notifications", async () => {
    const orgA = await createTestOrg();
    const orgB = await createTestOrg();
    cleanupOrgs.push(orgA, orgB);
    const userId = await createTestUser();
    cleanupUsers.push(userId);
    await addMembership(userId, orgA, "EDITOR");
    await addMembership(userId, orgB, "EDITOR");

    await notifyUser(orgA, userId, { type: "DRAFT_APPROVED", title: "A", body: "x" });
    await notifyUser(orgB, userId, { type: "DRAFT_APPROVED", title: "B", body: "x" });

    await markAllRead(userId, orgA);

    expect(await countUnread(userId, orgA)).toBe(0);
    expect(await countUnread(userId, orgB)).toBe(1);
  });
});
