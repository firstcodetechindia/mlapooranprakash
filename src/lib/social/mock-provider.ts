import "server-only";
import { createHash } from "node:crypto";

import type { Platform } from "@/generated/prisma/enums";
import type {
  SocialProvider,
  SocialAccountRecord,
  SocialProfile,
  PublishContent,
  PublishResult,
  PostAnalytics,
} from "./types";

function seededInt(seed: string, max: number): number {
  const hash = createHash("sha256").update(seed).digest();
  return hash.readUInt32LE(0) % max;
}

/**
 * Simulates a connected platform with zero real network calls — no
 * account is ever actually reached. Used whenever MOCK_SOCIAL_APIS=true
 * (the default), so the whole publishing flow is testable without any
 * developer app credentials. Every "engagement" number is deterministic
 * pseudo-random, clearly not real traffic — see getAnalytics().
 */
export class MockSocialProvider implements SocialProvider {
  constructor(public readonly platform: Platform) {}

  async connect(accessToken: string) {
    const seed = `${this.platform}:${accessToken}`;
    const suffix = createHash("sha256").update(seed).digest("hex").slice(0, 8);
    return {
      externalAccountId: `mock_${this.platform.toLowerCase()}_${suffix}`,
      accountName: `Demo Office (${this.platform})`,
    };
  }

  async getProfile(account: SocialAccountRecord): Promise<SocialProfile> {
    return {
      displayName: account.accountName,
      handle: `@demo_office_${account.platform.toLowerCase()}`,
      followerCount: 1200 + seededInt(account.externalAccountId, 8000),
      profileImageUrl: null,
    };
  }

  async publishPost(
    account: SocialAccountRecord,
    content: PublishContent,
  ): Promise<PublishResult> {
    if (!content.text.trim()) {
      throw new Error("Cannot publish empty content.");
    }

    const platformPostId = `mock_post_${createHash("sha256").update(`${account.id}:${content.text}:${Date.now()}`).digest("hex").slice(0, 12)}`;

    return {
      platformPostId,
      url: `https://mock.${account.platform.toLowerCase()}.example/${platformPostId}`,
    };
  }

  async getAnalytics(
    account: SocialAccountRecord,
    platformPostId: string,
  ): Promise<PostAnalytics> {
    const base = seededInt(platformPostId, 5000);
    return {
      impressions: base * 8,
      likes: Math.round(base * 0.12),
      comments: Math.round(base * 0.02),
      shares: Math.round(base * 0.015),
    };
  }
}
