import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const fixture = `<?xml version="1.0"?><rss><channel><title>Fixture</title><link>https://example.test</link><description>Test</description><item><title>Good</title><link>https://example.test/good</link><description>First</description><pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate></item><item><title>Bad</title><link>https://example.test/bad</link><description>Second</description><pubDate>Mon, 01 Jan 2024 01:00:00 GMT</pubDate></item></channel></rss>`;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(check: () => boolean | Promise<boolean>, message: string) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) { if (await check()) return; await delay(40); }
  throw new Error(`Timed out waiting for ${message}`);
}

function launch(args: string[], env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, ["--import", "tsx", "src/index.ts", ...args], { env });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  return { child, exited, output: () => output };
}

async function command(args: string[], env: NodeJS.ProcessEnv, expected = 0) {
  const run = launch(args, env);
  const code = await run.exited;
  assert.equal(code, expected, `${args.join(" ")} output: ${run.output()}`);
  return run.output();
}

async function stopWorker(child: ChildProcessWithoutNullStreams, exited: Promise<number | null>) {
  child.kill("SIGINT");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const code = await Promise.race([exited, new Promise<never>((_, reject) => {
      timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error("worker did not stop")); }, 8_000);
    })]);
    assert.equal(code, 0);
  } finally {
    clearTimeout(timer);
  }
}

test("CLI, transactions, retries, and worker lifecycle", { timeout: 90_000 }, async () => {
  const adminUrl = process.env.GATOR_TEST_ADMIN_URL ?? `postgres://${encodeURIComponent(userInfo().username)}@localhost:5432/postgres?sslmode=disable`;
  const dbName = `gator_test_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(adminUrl, { max: 1 });
  const dbUrl = new URL(adminUrl); dbUrl.pathname = `/${dbName}`;
  const dir = await mkdtemp(join(tmpdir(), "gator-test-"));
  const configPath = join(dir, "config.json");
  const env = { ...process.env, GATOR_CONFIG_PATH: configPath };
  let created = false;
  let db: ReturnType<typeof postgres> | undefined;
  let worker: ReturnType<typeof launch> | undefined;
  let active = 0, maxActive = 0, requests = 0, fail = false;
  const server = createServer(async (_req, res) => {
    active++; maxActive = Math.max(maxActive, active); requests++;
    await delay(120);
    res.writeHead(fail ? 503 : 200, { "content-type": "application/xml" });
    res.end(fail ? "unavailable" : fixture); active--;
  });
  try {
    await admin.unsafe(`CREATE DATABASE "${dbName}"`); created = true;
    db = postgres(dbUrl.toString(), { max: 1 });
    await writeFile(configPath, JSON.stringify({ db_url: dbUrl.toString() }));
    const migration = spawn(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "migrate"], { env, stdio: "pipe" });
    let migrationOutput = ""; migration.stdout.on("data", (x) => { migrationOutput += x; }); migration.stderr.on("data", (x) => { migrationOutput += x; });
    const migrationCode = await new Promise<number | null>((resolve, reject) => { migration.once("error", reject); migration.once("close", resolve); });
    assert.equal(migrationCode, 0, migrationOutput);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("missing fixture address");
    const url = `http://127.0.0.1:${address.port}/feed`;
    await command([], env, 1);
    await command(["register", "alice"], env);
    await command(["register", "alice"], env, 1);
    await command(["login", "missing"], env, 1);
    await command(["login", "alice"], env);
    assert.match(await command(["users"], env), /alice \(current\)/);

    await db.unsafe("CREATE FUNCTION fail_follow() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced failure'; END $$; CREATE TRIGGER fail_follow BEFORE INSERT ON feed_follows FOR EACH ROW EXECUTE FUNCTION fail_follow()");
    await command(["addfeed", "Fixture", url], env, 1);
    assert.equal(Number((await db`select count(*) as n from feeds`)[0].n), 0);
    await db.unsafe("DROP TRIGGER fail_follow ON feed_follows; DROP FUNCTION fail_follow()");
    await command(["addfeed", "Fixture", url], env);
    assert.match(await command(["following"], env), /Fixture/);
    await command(["unfollow", url], env);
    assert.doesNotMatch(await command(["following"], env), /Fixture/);
    await command(["follow", url], env);

    await db.unsafe("CREATE FUNCTION fail_post() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title = 'Bad' THEN RAISE EXCEPTION 'forced failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_post BEFORE INSERT ON posts FOR EACH ROW EXECUTE FUNCTION fail_post()");
    worker = launch(["agg", "1h"], env);
    await waitFor(() => worker.output().includes("Database error"), "forced post failure");
    await stopWorker(worker.child, worker.exited);
    assert.equal(Number((await db`select count(*) as n from posts`)[0].n), 0);
    assert.equal((await db`select last_fetched_at from feeds`)[0].last_fetched_at, null);
    await db.unsafe("DROP TRIGGER fail_post ON posts; DROP FUNCTION fail_post()");

    fail = true;
    worker = launch(["agg", "1h"], env);
    await waitFor(async () => Number((await db!`select consecutive_failures from feeds`)[0].consecutive_failures) === 1, "failed feed state");
    await stopWorker(worker.child, worker.exited);
    const [failed] = await db`select next_attempt_at, last_error from feeds`;
    assert.ok(failed.next_attempt_at); assert.match(failed.last_error, /503/);
    fail = false;
    await db`update feeds set next_attempt_at = '2000-01-01'`;
    requests = 0; maxActive = 0;
    worker = launch(["agg", "50ms"], env);
    await waitFor(() => requests >= 2, "two successful feed requests");
    await delay(200);
    await stopWorker(worker.child, worker.exited);
    assert.equal(maxActive, 1);
    assert.equal(Number((await db`select count(*) as n from posts`)[0].n), 2);
    assert.equal(Number((await db`select consecutive_failures from feeds`)[0].consecutive_failures), 0);
    assert.match(await command(["browse"], env), /Good/);

    fail = true;
    await db`update feeds set consecutive_failures = 3, next_attempt_at = '2000-01-01'`;
    worker = launch(["agg", "1h"], env);
    await waitFor(async () => Boolean((await db!`select needs_attention from feeds`)[0].needs_attention), "exhausted feed state");
    await stopWorker(worker.child, worker.exited);
    assert.match(await command(["feeds"], env), /needs attention/);
    await command(["retryfeed", url], env);
    const [resetFeed] = await db`select consecutive_failures, next_attempt_at, needs_attention from feeds`;
    assert.equal(Number(resetFeed.consecutive_failures), 0);
    assert.equal(resetFeed.next_attempt_at, null);
    assert.equal(resetFeed.needs_attention, false);
    await command(["reset"], env);
    assert.equal(Number((await db`select count(*) as n from feeds`)[0].n), 0);
  } finally {
    if (worker && worker.child.exitCode === null && worker.child.signalCode === null) {
      worker.child.kill("SIGKILL");
      await worker.exited;
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (db) await db.end();
    if (created) await admin.unsafe(`DROP DATABASE "${dbName}" WITH (FORCE)`);
    await admin.end();
    await rm(dir, { recursive: true, force: true });
  }
});
