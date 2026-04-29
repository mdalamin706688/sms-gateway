import { Logger } from '../logging/Logger';
import { ProviderSelector } from '../providers/ProviderSelector';
import { SendSmsInput, SendSmsResult, SmsProvider } from '../providers/SmsProvider';
import { StatsCollector } from '../stats/StatsCollector';
import { withRetry, RetryOptions } from './Retry';

/**
 * Application-level orchestration.
 *
 * Responsibilities:
 *   - Pick a provider via the injected `ProviderSelector` (random per spec).
 *   - Retry transient failures with exponential backoff + jitter.
 *   - Failover to the OTHER provider once retries on the first one are
 *     exhausted (graceful degradation — system stays up if one provider is
 *     dead).
 *   - Log every provider attempt to the configured `Logger`.
 *   - Update the `StatsCollector` for cron reporting.
 *
 * It depends only on interfaces, so it is easy to unit-test by injecting fakes.
 */
export class SmsService {
  constructor(
    private readonly selector: ProviderSelector,
    private readonly logger: Logger,
    private readonly stats: StatsCollector,
    private readonly retry: RetryOptions,
  ) {}

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    const tried = new Set<string>();

    // We try at most as many distinct providers as exist. If both fail
    // after retries, we surface a final failure but never throw — the
    // service must keep running.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const provider = this.selector.pick(tried);
      if (!provider) {
        return {
          success: false,
          provider: 'none',
          error: 'No available providers',
        };
      }
      tried.add(provider.name);

      const result = await this.sendWithRetry(provider, input);
      if (result.success) return result;

      // Provider exhausted retries — try a different one if any remain.
    }
  }

  private async sendWithRetry(provider: SmsProvider, input: SendSmsInput): Promise<SendSmsResult> {
    let lastResult: SendSmsResult = {
      success: false,
      provider: provider.name,
      error: 'no attempt made',
    };

    try {
      lastResult = await withRetry<SendSmsResult>(
        async (attempt) => {
          const r = await provider.send(input);
          this.logAttempt(provider, input, r, attempt);
          if (r.success) {
            this.stats.recordSuccess();
            return r;
          }
          // Throw so retry kicks in. Carry the result for the final logger.
          const e = new Error(r.error ?? 'send failed');
          (e as Error & { result?: SendSmsResult }).result = r;
          throw e;
        },
        {
          ...this.retry,
          isRetryable: () => true, // all provider failures are treated as transient
        },
      );
      return lastResult;
    } catch (err) {
      const carried = (err as Error & { result?: SendSmsResult }).result;
      const final: SendSmsResult = carried ?? {
        success: false,
        provider: provider.name,
        error: err instanceof Error ? err.message : 'unknown error',
      };
      // We only count one failure per failed send (not per retry) to keep
      // stats meaningful.
      this.stats.recordFailure();
      return final;
    }
  }

  private logAttempt(
    provider: SmsProvider,
    input: SendSmsInput,
    result: SendSmsResult,
    attempt: number,
  ): void {
    this.logger.log(result.success ? 'info' : 'warn', 'sms_provider_call', {
      provider: provider.name,
      phoneNumber: input.phoneNumber,
      text: input.message,
      attempt,
      responseStatus: result.status,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  }
}
