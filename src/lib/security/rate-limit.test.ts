import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db/client";
import { enforceRateLimit, RateLimitError } from "@/lib/security/rate-limit";

const cleanupKeys: string[] = [];

afterEach(async () => {
  await db.rateLimitBucket.deleteMany({ where: { key: { in: cleanupKeys.splice(0) } } });
});

function testKey() {
  const key = `test:${randomUUID()}`;
  cleanupKeys.push(key);
  return key;
}

describe("enforceRateLimit", () => {
  it("allows requests under the limit", async () => {
    const key = testKey();
    for (let i = 0; i < 5; i++) {
      await expect(enforceRateLimit(key, 5, 60)).resolves.toBeUndefined();
    }
  });

  it("throws RateLimitError once the limit is exceeded within the window", async () => {
    const key = testKey();
    for (let i = 0; i < 3; i++) {
      await enforceRateLimit(key, 3, 60);
    }
    await expect(enforceRateLimit(key, 3, 60)).rejects.toThrow(RateLimitError);
  });

  it("resets the count once the window has elapsed", async () => {
    const key = testKey();
    await enforceRateLimit(key, 1, 60);
    await expect(enforceRateLimit(key, 1, 60)).rejects.toThrow(RateLimitError);

    // Simulate the window having already elapsed by backdating windowStart
    // directly, rather than sleeping the test for real time.
    await db.rateLimitBucket.update({
      where: { key },
      data: { windowStart: new Date(Date.now() - 120_000) },
    });

    await expect(enforceRateLimit(key, 1, 60)).resolves.toBeUndefined();
  });

  it("keeps separate counters for different keys", async () => {
    const keyA = testKey();
    const keyB = testKey();
    await enforceRateLimit(keyA, 1, 60);
    await expect(enforceRateLimit(keyA, 1, 60)).rejects.toThrow(RateLimitError);
    // keyB is untouched by keyA's usage.
    await expect(enforceRateLimit(keyB, 1, 60)).resolves.toBeUndefined();
  });
});
