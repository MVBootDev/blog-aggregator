import { and, eq, sql } from "drizzle-orm";
import { db } from "..";
import { feedFollows, feeds, posts, users, type Feed } from "../schema.js";

export async function createFeed(name: string, url: string, userId: string): Promise<Feed> {
  const [feed] = await db.insert(feeds).values({ name, url, userId }).returning();
  return feed;
}

export async function getFeeds() {
  return db
    .select({ feed: feeds, user: users })
    .from(feeds)
    .innerJoin(users, eq(feeds.userId, users.id));
}

export async function getFeedByUrl(url: string) {
  const [feed] = await db.select().from(feeds).where(eq(feeds.url, url));
  return feed;
}

export async function createFeedFollow(userId: string, feedId: string) {
  const [result] = await db
    .insert(feedFollows)
    .values({ userId, feedId })
    .returning();
  const [joined] = await db
    .select({ feedFollow: feedFollows, userName: users.name, feedName: feeds.name })
    .from(feedFollows)
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.id, result.id));
  return joined;
}

export async function getFeedFollowsForUser(userId: string) {
  return db
    .select({ feedFollow: feedFollows, feedName: feeds.name, userName: users.name })
    .from(feedFollows)
    .innerJoin(feeds, eq(feedFollows.feedId, feeds.id))
    .innerJoin(users, eq(feedFollows.userId, users.id))
    .where(eq(feedFollows.userId, userId));
}

export async function deleteFeedFollow(userId: string, url: string): Promise<void> {
  const feed = await getFeedByUrl(url);
  if (!feed) throw new Error(`Feed ${url} does not exist`);
  await db.delete(feedFollows).where(and(
    eq(feedFollows.userId, userId),
    eq(feedFollows.feedId, feed.id),
  ));
}

export async function getNextFeedToFetch() {
  const [feed] = await db.select().from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} ASC NULLS FIRST`)
    .limit(1);
  return feed;
}

export async function markFeedFetched(feedId: string) {
  const [feed] = await db.update(feeds)
    .set({ lastFetchedAt: new Date(), updatedAt: new Date() })
    .where(eq(feeds.id, feedId))
    .returning();
  return feed;
}

export async function createPost(post: typeof posts.$inferInsert) {
  const [created] = await db.insert(posts).values(post).onConflictDoNothing().returning();
  return created;
}

export async function getPostsForUser(userId: string, limit: number) {
  return db.select({ post: posts, feedName: feeds.name })
    .from(posts)
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .innerJoin(feedFollows, eq(feedFollows.feedId, feeds.id))
    .where(eq(feedFollows.userId, userId))
    .orderBy(sql`${posts.publishedAt} DESC NULLS LAST`)
    .limit(limit);
}
