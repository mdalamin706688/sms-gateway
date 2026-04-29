import * as cron from 'node-cron';
import { Logger } from '../logging/Logger';
import { SmsService } from '../core/SmsService';
import { StatsCollector } from './StatsCollector';

/**
 * Periodic stats reporter.
 *
 * Every tick (cron expression from config — default every 5 minutes), it
 * sends an SMS to the configured target phone number summarising the
 * cumulative counters since process start.
 *
 * It uses the SAME `SmsService` clients use, which means:
 *   - the report itself benefits from retry + failover
 *   - the report's send is also logged + counted (consistent behaviour)
 */
export class StatsCronJob {
  private task?: cron.ScheduledTask;

  constructor(
    private readonly cronExpression: string,
    private readonly targetPhoneNumber: string,
    private readonly stats: StatsCollector,
    private readonly smsService: SmsService,
    private readonly logger: Logger,
  ) {}

  start(): void {
    if (!cron.validate(this.cronExpression)) {
      this.logger.error('stats_cron_invalid_expression', { cronExpression: this.cronExpression });
      return;
    }
    this.task = cron.schedule(this.cronExpression, () => {
      // Fire-and-forget — never block the scheduler.
      void this.tick();
    });
    this.logger.info('stats_cron_started', {
      cronExpression: this.cronExpression,
      targetPhoneNumber: this.targetPhoneNumber,
    });
  }

  stop(): void {
    this.task?.stop();
  }

  /** Exposed for tests. */
  async tick(): Promise<void> {
    const { sent, failed } = this.stats.snapshot();
    const message = `SMS stats: ${sent} sent successfully, ${failed} failed`;
    try {
      const result = await this.smsService.send({
        phoneNumber: this.targetPhoneNumber,
        message,
      });
      this.logger.info('stats_cron_tick', {
        targetPhoneNumber: this.targetPhoneNumber,
        sent,
        failed,
        delivered: result.success,
        provider: result.provider,
        error: result.error,
      });
    } catch (err) {
      // SmsService never throws, but defensive guard so cron loop never dies.
      this.logger.error('stats_cron_tick_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
