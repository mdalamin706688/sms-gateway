import { config } from './config';

/**
 * Shared simulator: introduces latency and randomly fails to mimic a real
 * unreliable upstream SMS provider. Kept in a single place so both providers
 * behave consistently.
 */
export async function simulateSend(): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const delay =
    config.minLatencyMs +
    Math.random() * Math.max(0, config.maxLatencyMs - config.minLatencyMs);
  await new Promise((r) => setTimeout(r, delay));

  if (Math.random() < config.failureRate) {
    return { ok: false, error: 'Upstream provider error (simulated)' };
  }

  return { ok: true, messageId: `msg_${Date.now()}_${Math.floor(Math.random() * 1e6)}` };
}
