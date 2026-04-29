/**
 * Generic exponential-backoff retry helper with full jitter.
 *
 * Used by the SmsService to retry transient provider failures (timeouts,
 * 5xx responses, network errors). Pure function — easily unit-testable.
 */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  /** Decide whether a thrown error is retryable. Defaults to "always". */
  isRetryable?: (error: unknown) => boolean;
  /** Hook for sleeping (overridable in tests). */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: RetryOptions,
): Promise<T> {
  const sleep = opts.sleep ?? defaultSleep;
  const isRetryable = opts.isRetryable ?? (() => true);

  let lastError: unknown;
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === opts.maxAttempts || !isRetryable(err)) break;

      const expo = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** (attempt - 1));
      const jittered = Math.floor(Math.random() * expo); // full jitter
      await sleep(jittered);
    }
  }
  throw lastError;
}
