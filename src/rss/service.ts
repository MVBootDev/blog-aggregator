import { Context, Effect, Layer } from "effect";
import { FeedError } from "../errors.js";
import { fetchFeed, type RSSFeed } from "./fetch.js";

type FeedReaderShape = {
  readonly fetch: (url: string) => Effect.Effect<RSSFeed, FeedError>;
};

export class FeedReader extends Context.Service<FeedReader, FeedReaderShape>()("gator/FeedReader") {}

export const FeedReaderLive = Layer.succeed(FeedReader, {
  fetch: (url) => Effect.tryPromise({
    try: (signal) => fetchFeed(url, signal),
    catch: (cause) => new FeedError(url, cause),
  }),
});
