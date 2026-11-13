import { Effect } from "effect";
import { CommandError } from "../errors.js";
import { addFeed, browsePosts, changeFollow, listFeeds, listFollowing, retryFeed } from "../application/feeds.js";

export function feedCommand(command: string, ...args: string[]) {
  return Effect.gen(function* () {
    if (command === "feeds") {
      const rows = yield* listFeeds;
      for (const { feed, user } of rows) {
        console.log(`* ${feed.name}\n  URL: ${feed.url}\n  User: ${user.name}`);
        if (feed.needsAttention) console.log(`  Status: needs attention (${feed.lastError ?? "unknown error"})`);
        else if (feed.nextAttemptAt) console.log(`  Retry after: ${feed.nextAttemptAt.toISOString()} (${feed.lastError ?? "unknown error"})`);
      }
      return;
    }
    if (command === "addfeed") {
      const [name, url] = args;
      if (!name || !url) return yield* Effect.fail(new CommandError("The addfeed command requires a name and URL"));
      const { feed, user } = yield* addFeed(name, url);
      console.log(`Feed created successfully:\n  ID:        ${feed.id}\n  Created:   ${feed.createdAt}\n  Updated:   ${feed.updatedAt}\n  Name:      ${feed.name}\n  URL:       ${feed.url}\n  User:      ${user.name}`);
      console.log(`Followed ${feed.name} as ${user.name}`);
      return;
    }
    if (command === "follow" || command === "unfollow") {
      const [url] = args;
      if (!url) return yield* Effect.fail(new CommandError(`The ${command} command requires a feed URL`));
      const { feed, user } = yield* changeFollow(url, command === "follow");
      console.log(command === "follow" ? `${user.name} is now following ${feed.name}` : `Unfollowed feed ${url}`);
      return;
    }
    if (command === "following") {
      const rows = yield* listFollowing;
      for (const row of rows) console.log(`* ${row.feedName}`);
      return;
    }
    if (command === "retryfeed") {
      const [url] = args;
      if (!url) return yield* Effect.fail(new CommandError("The retryfeed command requires a feed URL"));
      const feed = yield* retryFeed(url);
      console.log(`Feed ${feed.name} is ready to retry`);
      return;
    }
    const limit = args[0] === undefined ? 2 : Number(args[0]);
    if (!Number.isInteger(limit) || limit < 1) return yield* Effect.fail(new CommandError("Browse limit must be a positive integer"));
    const rows = yield* browsePosts(limit);
    for (const { post, feedName } of rows) console.log(`Title: ${post.title}\nURL: ${post.url}\nDescription: ${post.description ?? ""}\nPublished: ${post.publishedAt?.toISOString() ?? "unknown"}\nFeed: ${feedName}\n`);
  });
}
