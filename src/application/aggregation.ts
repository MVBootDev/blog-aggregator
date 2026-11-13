import { Effect } from "effect";
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { databaseCall } from "../lib/db/call.js";
import { Database } from "../lib/db/service.js";
import { feeds, posts } from "../lib/db/schema.js";
import { FeedReader } from "../rss/service.js";
import { retryAfterFailure } from "./retry-policy.js";

export const scrapeNextFeed = Effect.gen(function* () {
  const db = yield* Database;
  const reader = yield* FeedReader;
  const [feed] = yield* databaseCall(() => db.select().from(feeds)
    .where(and(eq(feeds.needsAttention, false), or(isNull(feeds.nextAttemptAt), lte(feeds.nextAttemptAt, new Date()))))
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`).limit(1));
  if (!feed) return undefined;
  const rss = yield* reader.fetch(feed.url).pipe(Effect.catch((error) => Effect.gen(function* () {
    const now = new Date();
    const consecutiveFailures = feed.consecutiveFailures + 1;
    const retry = retryAfterFailure(consecutiveFailures, now);
    const reason = error.cause instanceof Error ? error.cause.message : String(error.cause);
    yield* databaseCall(() => db.update(feeds).set({
      lastAttemptAt: now,
      consecutiveFailures,
      lastError: reason.slice(0, 1000),
      nextAttemptAt: retry.nextAttemptAt,
      needsAttention: retry.needsAttention,
      updatedAt: now,
    }).where(eq(feeds.id, feed.id)));
    return yield* Effect.fail(error);
  })));
  yield* databaseCall(() => db.transaction(async (tx) => {
    for (const item of rss.channel.item) {
      const date = new Date(item.pubDate);
      await tx.insert(posts).values({ title: item.title, url: item.link, description: item.description, publishedAt: Number.isNaN(date.getTime()) ? null : date, feedId: feed.id }).onConflictDoNothing();
    }
    const now = new Date();
    await tx.update(feeds).set({ lastFetchedAt: now, lastAttemptAt: now, consecutiveFailures: 0, lastError: null, nextAttemptAt: null, needsAttention: false, updatedAt: now }).where(eq(feeds.id, feed.id));
  }));
  return { feed, items: rss.channel.item };
});
