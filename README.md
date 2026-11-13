# Gator Blog Aggregator

Gator is a command-line RSS aggregator written in TypeScript using Effect. It stores users, feeds, feed follows, and posts in PostgreSQL. Effect manages the database connection and the aggregator’s sequential polling and shutdown.

## Requirements

- Node.js 22.15.0 or newer
- PostgreSQL 16 or newer
- npm

## Setup

Install the project dependencies:

```sh
npm install
```

Create a PostgreSQL database named `gator`, then create `~/.gatorconfig.json`:

```json
{
  "db_url": "postgres://YOUR_USER:@localhost:5432/gator?sslmode=disable"
}
```

Apply the database migrations:

```sh
npx drizzle-kit migrate
```

Set `GATOR_CONFIG_PATH` to use a different config file instead of `~/.gatorconfig.json`.

Run the CLI with `npm run start <command> [arguments]`.

## Commands

- `npm run start register <username>` — create a user and log in.
- `npm run start login <username>` — log in as an existing user.
- `npm run start users` — list users.
- `npm run start addfeed <name> <url>` — add and follow an RSS feed.
- `npm run start feeds` — list feeds.
- `npm run start retryfeed <url>` — clear a feed's failure state and make it eligible for polling again.
- `npm run start follow <url>` / `unfollow <url>` — follow or unfollow a feed.
- `npm run start following` — list feeds followed by the current user.
- `npm run start agg <duration>` — poll feeds continuously, for example `1m`.
- `npm run start browse [limit]` — show recent posts from followed feeds (defaults to 2).
- `npm run start reset` — clear the local database.

Press Ctrl+C to stop the aggregator.

Failed feed fetches are retried after approximately 1, 5, and 30 minutes, with jitter. After a fourth consecutive failure, the feed is marked as needing attention and excluded from polling until `retryfeed` is used. The `feeds` command shows retry and attention status.

## Worker design and scaling

Run one `agg` process for a database. It fetches one eligible feed immediately, then waits the requested interval after each attempt before selecting another. A feed is eligible when it does not need attention and its retry time, if any, has arrived. Among eligible feeds, the worker chooses one that has never been fetched or was fetched least recently. Retry state is stored in PostgreSQL and survives a restart; restart the worker separately to resume polling.

The worker fetches and parses outside the database transaction. It then saves the posts and updates the feed's successful-fetch timestamp together in a transaction. Post URLs are unique, so fetching the same item again does not create another post. A feed and its creator's initial follow are also created together.

The current selection has no cross-process claim: two `agg` processes can choose and fetch the same feed. To support multiple workers, atomically claim an eligible feed in PostgreSQL with an expiry and a unique claim token. Workers would renew long claims as needed and make both success and failure updates conditional on the token, so an expired worker cannot overwrite a newer attempt. Expired claims can then be picked up after a crash. Keep writes idempotent: a lease reduces duplicate work but cannot guarantee an external request happens exactly once. Claims and multi-worker coordination are not implemented in this demo.

The CLI's current user is a local config setting, not authentication. A web interface would need authentication and authorization before exposing user operations.

## Verification

Run `npm test` with PostgreSQL running. The integration test creates and deletes a uniquely named temporary database and starts a local RSS fixture; its PostgreSQL user must have permission to create databases. By default it connects to `postgres` on localhost as the current OS user. Set `GATOR_TEST_ADMIN_URL` to a PostgreSQL administrator connection URL to use a different test server or user. The test uses a separate config file and does not reset the application's database.
