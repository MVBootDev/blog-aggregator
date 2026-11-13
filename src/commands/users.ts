import { Effect } from "effect";
import { CommandError } from "../errors.js";
import { listUsers, reset, selectUser } from "../application/users.js";

export function userCommand(command: string, ...args: string[]) {
  return Effect.gen(function* () {
    if (command === "login" || command === "register") {
      const name = args[0];
      if (!name) return yield* Effect.fail(new CommandError(`The ${command} command requires a username`));
      const user = yield* selectUser(name, command === "register");
      console.log(command === "register" ? `User ${user.name} created successfully` : `Logged in as ${user.name}`);
      return;
    }
    if (command === "reset") {
      yield* reset;
      console.log("Database reset successfully");
      return;
    }
    const { records, currentUserName } = yield* listUsers;
    for (const user of records) console.log(`* ${user.name}${user.name === currentUserName ? " (current)" : ""}`);
  });
}
