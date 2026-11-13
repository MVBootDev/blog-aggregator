import { CommandError } from "./errors.js";
import { Effect, Layer } from "effect";
import { FeedReaderLive } from "./rss/service.js";
import { AppConfigLive } from "./config-service.js";
import { DatabaseLive } from "./lib/db/service.js";
import { userCommand } from "./commands/users.js";
import { feedCommand } from "./commands/feeds.js";
import { aggregate } from "./commands/agg.js";

const [command, ...args] = process.argv.slice(2);
const userCommands = ["login", "register", "reset", "users"];
const feedCommands = ["addfeed", "feeds", "follow", "following", "unfollow", "browse", "retryfeed"];
const controller = new AbortController();
const shutdown = () => {
  console.log("Shutting down feed aggregator...");
  controller.abort();
};
if (command === "agg") process.once("SIGINT", shutdown);

try {
  const appLive = Layer.merge(Layer.provideMerge(DatabaseLive, AppConfigLive), FeedReaderLive);
  const program = !command
    ? Effect.fail(new CommandError("not enough arguments provided"))
    : userCommands.includes(command)
      ? userCommand(command, ...args).pipe(Effect.provide(appLive))
      : feedCommands.includes(command)
        ? feedCommand(command, ...args).pipe(Effect.provide(appLive))
        : command === "agg"
          ? aggregate(args[0]).pipe(Effect.provide(appLive))
          : Effect.fail(new CommandError(`Unknown command: ${command}`));
  await Effect.runPromise(program, { signal: controller.signal });
} catch (error) {
  if (!controller.signal.aborted) {
    console.error(error instanceof Error ? `Error: ${error.message}` : error);
    process.exitCode = 1;
  }
} finally {
  if (command === "agg") process.off("SIGINT", shutdown);
}
