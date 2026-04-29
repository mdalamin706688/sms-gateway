import { withRetry } from './Retry';

describe('withRetry', () => {
  it('returns the first successful result without retrying', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, {
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 1,
      sleep: async () => {},
    });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxAttempts and surfaces the last error', async () => {
    const err = new Error('boom');
    const fn = jest.fn().mockRejectedValue(err);
    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 1,
        maxDelayMs: 1,
        sleep: async () => {},
      }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('stops retrying when isRetryable returns false', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('fatal'));
    await expect(
      withRetry(fn, {
        maxAttempts: 5,
        baseDelayMs: 1,
        maxDelayMs: 1,
        sleep: async () => {},
        isRetryable: () => false,
      }),
    ).rejects.toThrow('fatal');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('eventually succeeds after transient failures', async () => {
    let calls = 0;
    const fn = jest.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) throw new Error('transient');
      return 'success';
    });
    const result = await withRetry(fn, {
      maxAttempts: 5,
      baseDelayMs: 1,
      maxDelayMs: 1,
      sleep: async () => {},
    });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
