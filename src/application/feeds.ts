import { Effect } from "effect";
import { and, eq, sql } from "drizzle-orm";
import { CommandError } from "../errors.js";
import { databaseCall } from "../lib/db/call.js";
import { Database } from "../lib/db/service.js";
import { feedFollows, feeds, posts, users } from "../lib/db/schema.js";
import { currentUser } from "./users.js";

export const listFeeds = Effect.gen(function* () {
  const db = yield* Database;
  return yield* databaseCall(() => db.select({ feed: feeds, user: users }).from(feeds).innerJoin(users, eq(feeds.userId, users.id)));
});

export function addFeed(name: string, url: string) {
  return Effect.gen(function* () {
    const user = yield* currentUser;
    const db = yield* Database;
    const feed = yield* databaseCall(() => db.transaction(async (tx) => {
      const [created] = await tx.insert(feeds).values({ name, url, userId: user.id }).returning();
      await tx.insert(feedFollows).values({ userId: user.id, feedId: created.id });
      return created;
    }));
    return { feed, user };
  });
}

export function changeFollow(url: string, follow: boolean) {
  return Effect.gen(function* () {
    const user = yield* currentUser;
    const db = yield* Database;
    const [feed] = yield* databaseCall(() => db.select().from(feeds).where(eq(feeds.url, url)));
    if (!feed) return yield* Effect.fail(new CommandError(`Feed ${url} does not exist`));
    if (follow) yield* databaseCall(() => db.insert(feedFollows).values({ userId: user.id, feedId: feed.id }));
    else yield* databaseCall(() => db.delete(feedFollows).where(and(eq(feedFollows.userId, user.id), eq(feedFollows.feedId, feed.id))));
    return { feed, user };
  });
}

export function retryFeed(url: string) {
  return Effect.gen(function* () {
    yield* currentUser;
    const db = yield* Database;
    const [feed] = yield* databaseCall(() => db.update(feeds).set({
      consecutiveFailures: 0,
      lastError: null,
      nextAttemptAt: null,
      needsAttention: false,
      updatedAt: new Date(),
    }).where(eq(feeds.url, url)).returning());
    if (!feed) return yield* Effect.fail(new CommandError(`Feed ${url} does not exist`));
    return feed;
  });
}

export const listFollowing = Effect.gen(function* () {
  const user = yield* currentUser;
  const db = yield* Database;
  return yield* databaseCall(() => db.select({ feedName: feeds.name }).from(feedFollows).innerJoin(feeds, eq(feedFollows.feedId, feeds.id)).where(eq(feedFollows.userId, user.id)));
});

export function browsePosts(limit: number) {
  return Effect.gen(function* () {
    const user = yield* currentUser;
    const db = yield* Database;
    return yield* databaseCall(() => db.select({ post: posts, feedName: feeds.name }).from(posts).innerJoin(feeds, eq(posts.feedId, feeds.id)).innerJoin(feedFollows, eq(feedFollows.feedId, feeds.id)).where(eq(feedFollows.userId, user.id)).orderBy(sql`${posts.publishedAt} DESC NULLS LAST`).limit(limit));
  });
}
