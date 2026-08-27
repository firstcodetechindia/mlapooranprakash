import type { Platform } from "@/generated/prisma/enums";

export interface SocialAccountRecord {
  id: string;
  platform: Platform;
  accountName: string;
  externalAccountId: string;
  accessTokenEncrypted: string;
}

export interface SocialProfile {
  displayName: string;
  handle: string;
  followerCount: number | null;
  profileImageUrl: string | null;
}

export interface PublishContent {
  text: string;
  mediaUrls?: string[];
}

export interface PublishResult {
  platformPostId: string;
  url: string | null;
}

export interface PostAnalytics {
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
}

/**
 * Provider-agnostic social platform interface. Nothing outside
 * /src/lib/social should import a vendor SDK or hit a platform's API
 * directly — swapping/adding a platform means writing one new file here.
 * See getSocialProvider() in ./index.ts for provider selection.
 *
 * Scoped to what this app actually needs: connect once, publish, read
 * back profile/analytics. Drafting and scheduling are handled by this
 * app's own Draft model, not delegated to the platform.
 */
export interface SocialProvider {
  readonly platform: Platform;

  /** Verifies the token and returns the account identity to store. */
  connect(accessToken: string): Promise<{ externalAccountId: string; accountName: string }>;

  getProfile(account: SocialAccountRecord): Promise<SocialProfile>;

  publishPost(account: SocialAccountRecord, content: PublishContent): Promise<PublishResult>;

  /** Returns null when the platform's API doesn't expose this metric. */
  getAnalytics(account: SocialAccountRecord, platformPostId: string): Promise<PostAnalytics | null>;
}
