import { Effect } from "effect";
import { DatabaseError } from "../../errors.js";

export function databaseCall<A>(query: () => PromiseLike<A>) {
  return Effect.tryPromise({
    try: () => Promise.resolve(query()),
    catch: (cause) => new DatabaseError(cause),
  });
}
