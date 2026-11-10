import { handlerLogin, handlerRegister, handlerReset, handlerUsers, type CommandHandler } from "./commands/users.js";
import { handlerAgg } from "./commands/agg.js";
import { handlerAddFeed, handlerBrowse, handlerFeeds, handlerFollow, handlerFollowing, handlerUnfollow } from "./commands/feeds.js";
import { middlewareLoggedIn } from "./commands/middleware.js";

type CommandsRegistry = Record<string, CommandHandler>;

function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

async function main(): Promise<void> {
  const registry: CommandsRegistry = {};
  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  registerCommand(registry, "addfeed", middlewareLoggedIn(handlerAddFeed));
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry, "follow", middlewareLoggedIn(handlerFollow));
  registerCommand(registry, "following", middlewareLoggedIn(handlerFollowing));
  registerCommand(registry, "unfollow", middlewareLoggedIn(handlerUnfollow));
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));

  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Error: not enough arguments provided");
    process.exit(1);
  }

  const [cmdName, ...commandArgs] = args;
  try {
    await runCommand(registry, cmdName, ...commandArgs);
    process.exit(0);
  } catch (error) {
    console.error(error instanceof Error ? `Error: ${error.message}` : error);
    process.exit(1);
  }
}

await main();
