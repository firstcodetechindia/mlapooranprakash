import "server-only";

import type { Platform } from "@/generated/prisma/enums";
import type { SocialProvider } from "./types";
import { MockSocialProvider } from "./mock-provider";
import { XProvider } from "./x-provider";
import { FacebookProvider } from "./meta-provider";
import { InstagramProvider } from "./meta-provider";

export type { SocialProvider } from "./types";
export * from "./types";

export function isMockSocialMode(): boolean {
  return process.env.MOCK_SOCIAL_APIS !== "false";
}

const realProviders: Record<Platform, () => SocialProvider> = {
  X: () => new XProvider(),
  FACEBOOK: () => new FacebookProvider(),
  INSTAGRAM: () => new InstagramProvider(),
};

/**
 * MOCK_SOCIAL_APIS defaults to true (see .env.example) — every platform
 * runs on MockSocialProvider until explicitly turned off. This is the
 * only place that decides mock vs. real; callers never branch on it
 * themselves.
 */
export function getSocialProvider(platform: Platform): SocialProvider {
  if (isMockSocialMode()) {
    return new MockSocialProvider(platform);
  }
  return realProviders[platform]();
}
