import { fetchFeed } from "../rss/fetch.js";
import { createPost, getNextFeedToFetch, markFeedFetched } from "../lib/db/queries/feeds.js";

export function parseDuration(durationStr: string): number {
  const match = durationStr.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) throw new Error(`Invalid duration: ${durationStr}`);
  const amount = Number(match[1]);
  const units: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000 };
  return amount * units[match[2]];
}

export async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();
  if (!feed) throw new Error("No feeds found to fetch");
  console.log(`Fetching feed ${feed.name} (${feed.url})`);
  const rss = await fetchFeed(feed.url);
  await markFeedFetched(feed.id);
  for (const item of rss.channel.item) {
    const publishedAt = new Date(item.pubDate);
    await createPost({
      title: item.title,
      url: item.link,
      description: item.description,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? null : publishedAt,
      feedId: feed.id,
    });
    console.log(`Saved post: ${item.title}`);
  }
}

export async function handlerAgg(_cmdName: string, ...args: string[]): Promise<void> {
  const [duration] = args;
  if (!duration) throw new Error("The agg command requires a time between requests");
  const intervalMs = parseDuration(duration);
  console.log(`Collecting feeds every ${duration}`);

  const handleError = (error: unknown) => console.error(error);
  void scrapeFeeds().catch(handleError);
  const interval = setInterval(() => void scrapeFeeds().catch(handleError), intervalMs);
  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}
