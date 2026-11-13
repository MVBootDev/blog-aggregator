const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000] as const;

// The initial failure schedules retry 1; a fourth consecutive failure needs attention.
export function retryAfterFailure(failures: number, now: Date, random = Math.random) {
  const delay = RETRY_DELAYS_MS[failures - 1];
  if (delay === undefined) return { nextAttemptAt: null, needsAttention: true };
  const jitteredDelay = Math.round(delay * (0.8 + random() * 0.4));
  return { nextAttemptAt: new Date(now.getTime() + jitteredDelay), needsAttention: false };
}
