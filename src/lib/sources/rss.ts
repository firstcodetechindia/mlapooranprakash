import "server-only";
import Parser from "rss-parser";

import { db } from "@/lib/db/client";
import { recordAuditLog } from "@/lib/audit/log";
import { FETCHABLE_PLATFORMS } from "@/lib/config/sources";

const parser = new Parser({ timeout: 15_000 });

const MAX_ITEMS_PER_FETCH = 25;

export class SourceNotFetchableError extends Error {
  constructor(platform: string) {
    super(
      `${platform} sources aren't fetchable through this app yet — connecting requires official API access it doesn't have configured. Unavailable through current API permissions.`,
    );
    this.name = "SourceNotFetchableError";
  }
}

export interface FetchResult {
  ok: boolean;
  itemsFound: number;
  itemsIngested: number;
  error?: string;
}

/**
 * Fetches and parses a public RSS/Atom feed and upserts new items as
 * ReferencePost rows. This is a real, unauthenticated public-feed fetch —
 * no scraping, no login, no bypassing anything. Only RSS/WEBSITE sources
 * are fetchable; X/Facebook/Instagram require official APIs this app
 * doesn't have credentials for (see FETCHABLE_PLATFORMS).
 */
export async function fetchReferenceSource(
  sourceId: string,
  organizationId: string,
  actorUserId: string,
): Promise<FetchResult> {
  const source = await db.referenceSource.findFirstOrThrow({
    where: { id: sourceId, organizationId },
  });

  if (!FETCHABLE_PLATFORMS.includes(source.platform)) {
    throw new SourceNotFetchableError(source.platform);
  }

  try {
    const feed = await parser.parseURL(source.url);
    const items = (feed.items ?? []).slice(0, MAX_ITEMS_PER_FETCH);

    let ingested = 0;
    for (const item of items) {
      const externalId = item.guid ?? item.link ?? item.title;
      if (!externalId) continue;

      const result = await db.referencePost.upsert({
        where: {
          referenceSourceId_externalId: {
            referenceSourceId: source.id,
            externalId,
          },
        },
        update: {},
        create: {
          organizationId,
          referenceSourceId: source.id,
          externalId,
          title: item.title ?? null,
          content: item.contentSnippet ?? item.content ?? null,
          url: item.link ?? null,
          publishedAt: item.isoDate ? new Date(item.isoDate) : null,
        },
      });
      if (result.fetchedAt.getTime() > Date.now() - 5000) {
        // Newly created within this call (upsert has no reliable "was it
        // created" flag, so we infer from a fresh fetchedAt timestamp).
        ingested += 1;
      }
    }

    await db.referenceSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date(), lastFetchStatus: "ok", lastFetchError: null },
    });

    await recordAuditLog({
      organizationId,
      userId: actorUserId,
      action: "reference_source.fetched",
      resourceType: "ReferenceSource",
      resourceId: source.id,
      metadata: { itemsFound: items.length, itemsIngested: ingested },
    });

    return { ok: true, itemsFound: items.length, itemsIngested: ingested };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fetch error";
    await db.referenceSource.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date(), lastFetchStatus: "error", lastFetchError: message },
    });

    await recordAuditLog({
      organizationId,
      userId: actorUserId,
      action: "reference_source.fetch_failed",
      resourceType: "ReferenceSource",
      resourceId: source.id,
      metadata: { error: message },
    });

    return { ok: false, itemsFound: 0, itemsIngested: 0, error: message };
  }
}
