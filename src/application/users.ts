import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { AppConfig } from "../config-service.js";
import { CommandError } from "../errors.js";
import { databaseCall } from "../lib/db/call.js";
import { Database } from "../lib/db/service.js";
import { users } from "../lib/db/schema.js";

export const currentUser = Effect.gen(function* () {
  const config = yield* (yield* AppConfig).read;
  if (!config.currentUserName) return yield* Effect.fail(new CommandError("No user is currently logged in"));
  const db = yield* Database;
  const [user] = yield* databaseCall(() => db.select().from(users).where(eq(users.name, config.currentUserName!)));
  if (!user) return yield* Effect.fail(new CommandError(`User ${config.currentUserName} does not exist`));
  return user;
});

export function selectUser(name: string, register: boolean) {
  return Effect.gen(function* () {
    const db = yield* Database;
    const user = register
      ? (yield* databaseCall(() => db.insert(users).values({ name }).returning()))[0]
      : (yield* databaseCall(() => db.select().from(users).where(eq(users.name, name))))[0];
    if (!user) return yield* Effect.fail(new CommandError(`User ${name} does not exist`));
    yield* (yield* AppConfig).setUser(user.name);
    return user;
  });
}

export const reset = Effect.gen(function* () {
  const db = yield* Database;
  yield* databaseCall(() => db.delete(users));
});

export const listUsers = Effect.gen(function* () {
  const config = yield* (yield* AppConfig).read;
  const db = yield* Database;
  const records = yield* databaseCall(() => db.select().from(users));
  return { records, currentUserName: config.currentUserName };
});
