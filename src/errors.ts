export class CommandError extends Error {
  readonly _tag = "CommandError";
}

export class DatabaseError extends Error {
  readonly _tag = "DatabaseError";
  constructor(cause: unknown) {
    super(`Database error: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}

export class FeedError extends Error {
  readonly _tag = "FeedError";
  constructor(url: string, cause: unknown) {
    super(`Feed error for ${url}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
  }
}
