import { readConfig } from "../config.js";
import { getUser } from "../lib/db/queries/users.js";
import type { User } from "../lib/db/schema.js";
import type { CommandHandler } from "./users.js";

export type UserCommandHandler = (cmdName: string, user: User, ...args: string[]) => Promise<void>;

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName, ...args) => {
    const userName = readConfig().currentUserName;
    if (!userName) throw new Error("No user is currently logged in");
    const user = await getUser(userName);
    if (!user) throw new Error(`User ${userName} does not exist`);
    await handler(cmdName, user, ...args);
  };
}
