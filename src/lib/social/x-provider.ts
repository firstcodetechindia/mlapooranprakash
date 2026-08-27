import "server-only";

import type { Platform } from "@/generated/prisma/enums";
import { decryptToken } from "./crypto";
import type {
  SocialProvider,
  SocialAccountRecord,
  SocialProfile,
  PublishContent,
  PublishResult,
  PostAnalytics,
} from "./types";

const API_BASE = "https://api.twitter.com/2";

/**
 * Real X (Twitter) API v2 calls using a user-context OAuth 2.0 access
 * token. VERIFY AGAINST CURRENT X DEVELOPER DOCS before relying on this
 * in production — endpoint shapes, required scopes, and access-tier
 * limits (e.g. tweet creation quotas) change and are gated by the app's
 * subscription tier. Only ever instantiated when a real access token is
 * connected; see getSocialProvider() in ./index.ts.
 */
export class XProvider implements SocialProvider {
  readonly platform: Platform = "X";

  async connect(accessToken: string) {
    const response = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`X API rejected this token (${response.status}). Check it's a valid user-context OAuth 2.0 token.`);
    }
    const data = await response.json();
    return {
      externalAccountId: data.data.id as string,
      accountName: (data.data.name as string) ?? (data.data.username as string),
    };
  }

  async getProfile(account: SocialAccountRecord): Promise<SocialProfile> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(
      `${API_BASE}/users/${account.externalAccountId}?user.fields=public_metrics,profile_image_url,username,name`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      throw new Error(`X API error fetching profile (${response.status}).`);
    }
    const data = await response.json();
    return {
      displayName: data.data.name,
      handle: `@${data.data.username}`,
      followerCount: data.data.public_metrics?.followers_count ?? null,
      profileImageUrl: data.data.profile_image_url ?? null,
    };
  }

  async publishPost(account: SocialAccountRecord, content: PublishContent): Promise<PublishResult> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(`${API_BASE}/tweets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content.text }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`X API rejected the post (${response.status}): ${body}`);
    }
    const data = await response.json();
    const id = data.data.id as string;
    return { platformPostId: id, url: `https://x.com/i/status/${id}` };
  }

  async getAnalytics(account: SocialAccountRecord, platformPostId: string): Promise<PostAnalytics | null> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(
      `${API_BASE}/tweets/${platformPostId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) return null;
    const data = await response.json();
    const metrics = data.data?.public_metrics;
    if (!metrics) return null;
    return {
      impressions: metrics.impression_count ?? null,
      likes: metrics.like_count ?? null,
      comments: metrics.reply_count ?? null,
      shares: metrics.retweet_count ?? null,
    };
  }
}
