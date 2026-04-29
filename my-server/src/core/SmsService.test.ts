import { SmsService } from './SmsService';
import { ProviderRegistry } from '../providers/ProviderRegistry';
import { RandomProviderSelector } from '../providers/ProviderSelector';
import { SmsProvider, SendSmsResult } from '../providers/SmsProvider';
import { StatsCollector } from '../stats/StatsCollector';
import { Logger } from '../logging/Logger';

const noopLogger: Logger = {
  log: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

class FakeProvider implements SmsProvider {
  public calls = 0;
  constructor(public readonly name: string, private readonly outcomes: SendSmsResult[]) {}
  async send(): Promise<SendSmsResult> {
    const idx = Math.min(this.calls, this.outcomes.length - 1);
    this.calls += 1;
    return this.outcomes[idx];
  }
}

const retry = { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1 };

function selectorFor(providers: SmsProvider[], firstIndex: number) {
  const reg = new ProviderRegistry();
  providers.forEach((p) => reg.register(p));
  // Deterministic selector: returns providers in fixed order based on `firstIndex`.
  let i = firstIndex;
  return new RandomProviderSelector(reg, () => {
    const v = i / providers.length;
    i = (i + 1) % providers.length;
    return v;
  });
}

describe('SmsService', () => {
  it('returns success when the chosen provider succeeds', async () => {
    const a = new FakeProvider('a', [{ success: true, provider: 'a', messageId: 'x' }]);
    const b = new FakeProvider('b', [{ success: true, provider: 'b' }]);
    const stats = new StatsCollector();
    const svc = new SmsService(selectorFor([a, b], 0), noopLogger, stats, retry);

    const r = await svc.send({ phoneNumber: '+96170123456', message: 'hi' });
    expect(r.success).toBe(true);
    expect(stats.snapshot()).toEqual({ sent: 1, failed: 0 });
  });

  it('failovers to second provider after first exhausts retries', async () => {
    const a = new FakeProvider('a', [
      { success: false, provider: 'a', error: 'boom' },
      { success: false, provider: 'a', error: 'boom' },
    ]);
    const b = new FakeProvider('b', [{ success: true, provider: 'b', messageId: 'ok' }]);
    const stats = new StatsCollector();
    const svc = new SmsService(selectorFor([a, b], 0), noopLogger, stats, retry);

    const r = await svc.send({ phoneNumber: '+96170123456', message: 'hi' });
    expect(r.success).toBe(true);
    expect(r.provider).toBe('b');
    expect(a.calls).toBe(2); // exhausted retries
    expect(stats.snapshot()).toEqual({ sent: 1, failed: 1 });
  });

  it('returns a failure result when every provider fails (without throwing)', async () => {
    const a = new FakeProvider('a', [{ success: false, provider: 'a', error: 'down' }]);
    const b = new FakeProvider('b', [{ success: false, provider: 'b', error: 'down' }]);
    const stats = new StatsCollector();
    const svc = new SmsService(selectorFor([a, b], 0), noopLogger, stats, retry);

    const r = await svc.send({ phoneNumber: '+96170123456', message: 'hi' });
    expect(r.success).toBe(false);
    expect(stats.snapshot()).toEqual({ sent: 0, failed: 2 });
  });
});
