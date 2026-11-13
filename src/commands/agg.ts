import { CommandError } from "../errors.js";
import { Effect } from "effect";
import { scrapeNextFeed } from "../application/aggregation.js";


export function aggregate(duration: string | undefined) {
  return Effect.gen(function* () {
    if (!duration) return yield* Effect.fail(new CommandError("The agg command requires a time between requests"));
    const match = /^(\d+)(ms|s|m|h)$/.exec(duration);
    const multipliers: Record<string, number> = { ms: 1, s: 1000, m: 60000, h: 3600000 };
    const interval = match ? Number(match[1]) * multipliers[match[2]] : NaN;
    if (!Number.isSafeInteger(interval) || interval <= 0 || interval > 2147483647) return yield* Effect.fail(new CommandError(`Invalid duration: ${duration}`));
    console.log(`Collecting feeds every ${duration}`);
    const scrape = scrapeNextFeed.pipe(Effect.map((result) => {
      if (!result) return;
      const { feed, items } = result;
      console.log(`Fetched feed ${feed.name} (${feed.url})`);
      for (const item of items) console.log(`Saved post: ${item.title}`);
    }));
    while (true) {
      yield* scrape.pipe(Effect.catch((error) => Effect.sync(() => console.error(error))));
      yield* Effect.sleep(interval);
    }
  });
}
