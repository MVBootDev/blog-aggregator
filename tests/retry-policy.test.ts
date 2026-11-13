import { test } from "node:test";
import assert from "node:assert/strict";
import { retryAfterFailure } from "../src/application/retry-policy.js";

test("retry delays have bounded jitter and eventually need attention", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  for (const [index, delay] of [60_000, 300_000, 1_800_000].entries()) {
    assert.equal(retryAfterFailure(index + 1, now, () => 0).nextAttemptAt?.getTime(), now.getTime() + delay * 0.8);
    assert.equal(retryAfterFailure(index + 1, now, () => 1).nextAttemptAt?.getTime(), now.getTime() + delay * 1.2);
  }
  assert.deepEqual(retryAfterFailure(4, now), { nextAttemptAt: null, needsAttention: true });
});
