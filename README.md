# Gator Blog Aggregator

Gator is a command-line RSS aggregator written in TypeScript. It stores users, feeds, feed follows, and posts in PostgreSQL.

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

Run the CLI with `npm run start <command> [arguments]`.

## Commands

- `npm run start register <username>` — create a user and log in.
- `npm run start login <username>` — log in as an existing user.
- `npm run start users` — list users.
- `npm run start addfeed <name> <url>` — add and follow an RSS feed.
- `npm run start feeds` — list feeds.
- `npm run start follow <url>` / `unfollow <url>` — follow or unfollow a feed.
- `npm run start following` — list feeds followed by the current user.
- `npm run start agg <duration>` — poll feeds continuously, for example `1m`.
- `npm run start browse [limit]` — show recent posts from followed feeds (defaults to 2).
- `npm run start reset` — clear the local database.

Press Ctrl+C to stop the aggregator.
