/**
 * Centralized configuration for the SMSProvider service.
 * All values are loaded from environment variables with sensible defaults
 * so that nothing is hardcoded in business logic.
 */
export interface AppConfig {
  port: number;
  /** Probability (0..1) that a request will randomly fail to simulate instability. */
  failureRate: number;
  /** Artificial latency window (ms) to simulate network delay. */
  minLatencyMs: number;
  maxLatencyMs: number;
}

const num = (v: string | undefined, fallback: number): number => {
  const n = v !== undefined ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

export const config: AppConfig = {
  port: num(process.env.PORT, 4001),
  failureRate: num(process.env.FAILURE_RATE, 0.2),
  minLatencyMs: num(process.env.MIN_LATENCY_MS, 50),
  maxLatencyMs: num(process.env.MAX_LATENCY_MS, 250),
};
