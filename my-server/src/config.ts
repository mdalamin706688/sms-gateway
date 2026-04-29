/**
 * Centralized, type-safe configuration for MyServer.
 *
 * All values come from environment variables — nothing is hardcoded inside
 * the business logic. This keeps the service deployable across environments
 * and makes it trivial to tweak retries / timeouts / cron cadence.
 */

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export interface AppConfig {
  port: number;
  smsProviderBaseUrl: string;
  requestTimeoutMs: number;
  retry: RetryConfig;
  logFilePath: string;
  stats: {
    cronExpression: string;
    targetPhoneNumber: string;
    enabled: boolean;
  };
}

const num = (v: string | undefined, fallback: number): number => {
  const n = v !== undefined ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const bool = (v: string | undefined, fallback: boolean): boolean => {
  if (v === undefined) return fallback;
  return /^(1|true|yes|on)$/i.test(v);
};

export const config: AppConfig = {
  port: num(process.env.PORT, 4000),
  smsProviderBaseUrl: process.env.SMS_PROVIDER_BASE_URL ?? 'http://localhost:4001',
  requestTimeoutMs: num(process.env.REQUEST_TIMEOUT_MS, 3000),
  retry: {
    maxAttempts: num(process.env.RETRY_MAX_ATTEMPTS, 3),
    baseDelayMs: num(process.env.RETRY_BASE_DELAY_MS, 200),
    maxDelayMs: num(process.env.RETRY_MAX_DELAY_MS, 2000),
  },
  logFilePath: process.env.LOG_FILE_PATH ?? 'logs/sms.log',
  stats: {
    cronExpression: process.env.STATS_CRON ?? '*/5 * * * *',
    targetPhoneNumber: process.env.STATS_TARGET_PHONE ?? '+96170000000',
    enabled: bool(process.env.STATS_ENABLED, true),
  },
};
