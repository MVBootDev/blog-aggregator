import { createFeed, createFeedFollow, deleteFeedFollow, getFeedByUrl, getFeedFollowsForUser, getFeeds, getPostsForUser } from "../lib/db/queries/feeds.js";
import type { Feed, User } from "../lib/db/schema.js";
import type { CommandHandler } from "./users.js";
import type { UserCommandHandler } from "./middleware.js";

function printFeed(feed: Feed, user: User): void {
  console.log("Feed created successfully:");
  console.log(`  ID:        ${feed.id}`);
  console.log(`  Created:   ${feed.createdAt}`);
  console.log(`  Updated:   ${feed.updatedAt}`);
  console.log(`  Name:      ${feed.name}`);
  console.log(`  URL:       ${feed.url}`);
  console.log(`  User:      ${user.name}`);
}

export const handlerAddFeed: UserCommandHandler = async (_cmdName, user, ...args) => {
  const [name, url] = args;
  if (!name || !url) throw new Error("The addfeed command requires a name and URL");

  const feed = await createFeed(name, url, user.id);
  const follow = await createFeedFollow(user.id, feed.id);
  printFeed(feed, user);
  console.log(`Followed ${follow.feedName} as ${follow.userName}`);
};

export const handlerFeeds: CommandHandler = async (_cmdName) => {
  const feeds = await getFeeds();
  for (const { feed, user } of feeds) {
    console.log(`* ${feed.name}`);
    console.log(`  URL: ${feed.url}`);
    console.log(`  User: ${user.name}`);
  }
};

export const handlerFollow: UserCommandHandler = async (_cmdName, user, ...args) => {
  const [url] = args;
  if (!url) throw new Error("The follow command requires a feed URL");
  const feed = await getFeedByUrl(url);
  if (!feed) throw new Error(`Feed ${url} does not exist`);
  const result = await createFeedFollow(user.id, feed.id);
  console.log(`${result.userName} is now following ${result.feedName}`);
};

export const handlerFollowing: UserCommandHandler = async (_cmdName, user) => {
  const follows = await getFeedFollowsForUser(user.id);
  for (const follow of follows) console.log(`* ${follow.feedName}`);
};

export const handlerUnfollow: UserCommandHandler = async (_cmdName, user, ...args) => {
  const [url] = args;
  if (!url) throw new Error("The unfollow command requires a feed URL");
  await deleteFeedFollow(user.id, url);
  console.log(`Unfollowed feed ${url}`);
};

export const handlerBrowse: UserCommandHandler = async (_cmdName, user, ...args) => {
  const parsedLimit = args[0] === undefined ? 2 : Number(args[0]);
  if (!Number.isInteger(parsedLimit) || parsedLimit < 1) throw new Error("Browse limit must be a positive integer");
  const posts = await getPostsForUser(user.id, parsedLimit);
  for (const { post, feedName } of posts) {
    console.log(`Title: ${post.title}`);
    console.log(`URL: ${post.url}`);
    console.log(`Description: ${post.description ?? ""}`);
    console.log(`Published: ${post.publishedAt?.toISOString() ?? "unknown"}`);
    console.log(`Feed: ${feedName}`);
    console.log("");
  }
};
