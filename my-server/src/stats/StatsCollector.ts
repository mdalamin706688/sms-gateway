/**
 * In-memory counters of SMS attempts.
 *
 * Single source of truth for "how many sent / failed since process start".
 * Consumed by the stats cron job. Thread-safe enough for Node's single-thread
 * event loop; if we ever scaled out, this would move to Redis or similar.
 */
export class StatsCollector {
  private sent = 0;
  private failed = 0;

  recordSuccess(): void {
    this.sent += 1;
  }
  recordFailure(): void {
    this.failed += 1;
  }

  snapshot(): { sent: number; failed: number } {
    return { sent: this.sent, failed: this.failed };
  }

  /** Reset is intentionally NOT called by the cron — spec says cumulative. */
  reset(): void {
    this.sent = 0;
    this.failed = 0;
  }
}
