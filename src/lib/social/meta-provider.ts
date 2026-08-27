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

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * Real Meta Graph API calls for a Facebook Page. VERIFY AGAINST CURRENT
 * META DEVELOPER DOCS before relying on this in production — the Graph
 * API version, required permissions (pages_manage_posts, etc.), and app
 * review requirements change. Only ever instantiated when a real Page
 * access token is connected; see getSocialProvider() in ./index.ts.
 */
export class FacebookProvider implements SocialProvider {
  readonly platform: Platform = "FACEBOOK";

  async connect(accessToken: string) {
    const response = await fetch(
      `${GRAPH_BASE}/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!response.ok) {
      throw new Error(`Meta API rejected this token (${response.status}). Check it's a valid Page access token.`);
    }
    const data = await response.json();
    return { externalAccountId: data.id as string, accountName: data.name as string };
  }

  async getProfile(account: SocialAccountRecord): Promise<SocialProfile> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(
      `${GRAPH_BASE}/${account.externalAccountId}?fields=name,followers_count,picture&access_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) throw new Error(`Meta API error fetching profile (${response.status}).`);
    const data = await response.json();
    return {
      displayName: data.name,
      handle: data.name,
      followerCount: data.followers_count ?? null,
      profileImageUrl: data.picture?.data?.url ?? null,
    };
  }

  async publishPost(account: SocialAccountRecord, content: PublishContent): Promise<PublishResult> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(`${GRAPH_BASE}/${account.externalAccountId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content.text, access_token: token }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Meta API rejected the post (${response.status}): ${body}`);
    }
    const data = await response.json();
    return { platformPostId: data.id, url: `https://facebook.com/${data.id}` };
  }

  async getAnalytics(account: SocialAccountRecord, platformPostId: string): Promise<PostAnalytics | null> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(
      `${GRAPH_BASE}/${platformPostId}/insights?metric=post_impressions,post_engaged_users&access_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const values = (data.data ?? []) as { name: string; values: { value: number }[] }[];
    const metric = (name: string) => values.find((v) => v.name === name)?.values[0]?.value ?? null;
    return {
      impressions: metric("post_impressions"),
      likes: null,
      comments: null,
      shares: null,
    };
  }
}

/**
 * Real Instagram Graph API calls (business/creator accounts only, via a
 * connected Facebook Page). VERIFY AGAINST CURRENT META DEVELOPER DOCS —
 * same caveats as FacebookProvider. Instagram's API has no text-only
 * post type: publishPost requires at least one image/video URL in
 * content.mediaUrls, or it throws rather than silently failing.
 */
export class InstagramProvider implements SocialProvider {
  readonly platform: Platform = "INSTAGRAM";

  async connect(accessToken: string) {
    const response = await fetch(
      `${GRAPH_BASE}/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!response.ok) {
      throw new Error(`Meta API rejected this token (${response.status}). Check it's a valid Instagram Business/Creator access token.`);
    }
    const data = await response.json();
    return { externalAccountId: data.id as string, accountName: (data.username as string) ?? (data.id as string) };
  }

  async getProfile(account: SocialAccountRecord): Promise<SocialProfile> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(
      `${GRAPH_BASE}/${account.externalAccountId}?fields=username,followers_count,profile_picture_url&access_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) throw new Error(`Meta API error fetching profile (${response.status}).`);
    const data = await response.json();
    return {
      displayName: data.username,
      handle: `@${data.username}`,
      followerCount: data.followers_count ?? null,
      profileImageUrl: data.profile_picture_url ?? null,
    };
  }

  async publishPost(account: SocialAccountRecord, content: PublishContent): Promise<PublishResult> {
    const mediaUrl = content.mediaUrls?.[0];
    if (!mediaUrl) {
      throw new Error("Instagram requires at least one image or video — attach media before publishing.");
    }

    const token = decryptToken(account.accessTokenEncrypted);

    const containerResponse = await fetch(`${GRAPH_BASE}/${account.externalAccountId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: mediaUrl, caption: content.text, access_token: token }),
    });
    if (!containerResponse.ok) {
      const body = await containerResponse.text();
      throw new Error(`Instagram media container creation failed (${containerResponse.status}): ${body}`);
    }
    const container = await containerResponse.json();

    const publishResponse = await fetch(`${GRAPH_BASE}/${account.externalAccountId}/media_publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creation_id: container.id, access_token: token }),
    });
    if (!publishResponse.ok) {
      const body = await publishResponse.text();
      throw new Error(`Instagram publish failed (${publishResponse.status}): ${body}`);
    }
    const published = await publishResponse.json();
    return { platformPostId: published.id, url: null };
  }

  async getAnalytics(account: SocialAccountRecord, platformPostId: string): Promise<PostAnalytics | null> {
    const token = decryptToken(account.accessTokenEncrypted);
    const response = await fetch(
      `${GRAPH_BASE}/${platformPostId}/insights?metric=impressions,likes,comments,shares&access_token=${encodeURIComponent(token)}`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const values = (data.data ?? []) as { name: string; values: { value: number }[] }[];
    const metric = (name: string) => values.find((v) => v.name === name)?.values[0]?.value ?? null;
    return {
      impressions: metric("impressions"),
      likes: metric("likes"),
      comments: metric("comments"),
      shares: metric("shares"),
    };
  }
}
