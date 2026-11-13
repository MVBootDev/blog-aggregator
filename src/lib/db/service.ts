import { Context, Effect, Layer } from "effect";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { DatabaseError } from "../../errors.js";
import { AppConfig } from "../../config-service.js";
import * as schema from "./schema.js";

export class Database extends Context.Service<Database, ReturnType<typeof createDatabase>>()("gator/Database") {}

function createDatabase(connection: ReturnType<typeof postgres>) {
  return drizzle(connection, { schema });
}

export const DatabaseLive = Layer.effect(Database, Effect.gen(function* () {
  const config = yield* AppConfig;
  const { dbUrl } = yield* config.read;
  const connection = yield* Effect.acquireRelease(
    Effect.try({ try: () => postgres(dbUrl), catch: (cause) => new DatabaseError(cause) }),
    (client) => Effect.promise(() => client.end()),
  );
  return createDatabase(connection);
}));
