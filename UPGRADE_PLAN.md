# Gator upgrade plan

Keep Gator a small CLI demo, organized as a modular monolith with Effect application operations shared by the CLI and worker. Preserve existing commands and configuration.

1. **Done — separate application behavior from presentation.** Move user, feed, and ingestion operations into domain-oriented application modules. Keep command argument handling and output in the CLI; retain Drizzle and Effect services as infrastructure.
2. **Done — make related writes atomic.** Create a feed and its initial follow in one transaction. Persist an ingested batch and record a successful fetch in one transaction, after the HTTP request completes.
3. **Done — schedule retries fairly.** Record attempts, failures, and the next eligible attempt. Use three retry delays with jitter, then mark the feed as needing attention. The existing worker skips feeds until they are due; `feeds` shows their status and `retryfeed` makes one eligible again. Database failures remain operational errors rather than feed failures.
4. **Done — check in verification.** Run `npm test` with a PostgreSQL user that can create a temporary database. The tests use a disposable database and local RSS fixture to cover CLI behavior, transactions, retry state, ingestion idempotency, sequential polling, and shutdown.
5. **Done — document the scaling boundary.** Keep a single sequential worker for the demo. The README describes database claims with expiry and claim tokens as a future multi-worker extension; claims are not implemented.

The CLI's username selection is local demo state, not authentication. A web interface would need real authentication and authorization.
