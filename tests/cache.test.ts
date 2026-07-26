import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cached, clearCache } from 'utils/cache';

describe('cached', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches on first call and returns the value', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('serves the cached value within the TTL', async () => {
    const fetcher = vi.fn().mockResolvedValue('data');
    await cached('key', 1000, fetcher);
    vi.advanceTimersByTime(999);
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refetches after the TTL expires', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce('old')
      .mockResolvedValueOnce('new');
    await cached('key', 1000, fetcher);
    vi.advanceTimersByTime(1001);
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('new');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('dedupes concurrent calls into one fetch', async () => {
    let resolveFetch: (value: string) => void;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const first = cached('key', 1000, fetcher);
    const second = cached('key', 1000, fetcher);
    resolveFetch!('data');

    expect(await first).toBe('data');
    expect(await second).toBe('data');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent calls onto a rejecting fetcher', async () => {
    let rejectFetch: (error: Error) => void;
    const fetcher = vi.fn().mockImplementation(
      () =>
        new Promise<string>((_resolve, reject) => {
          rejectFetch = reject;
        })
    );

    const first = cached('key', 1000, fetcher);
    const second = cached('key', 1000, fetcher);
    first.catch(() => {});
    second.catch(() => {});

    const error = new Error('boom');
    rejectFetch!(error);

    await expect(first).rejects.toThrow('boom');
    await expect(second).rejects.toThrow('boom');
    expect(fetcher).toHaveBeenCalledTimes(1);

    const recovered = vi.fn().mockResolvedValueOnce('recovered');
    const result = await cached('key', 1000, recovered);
    expect(result).toBe('recovered');
    expect(recovered).toHaveBeenCalledTimes(1);
  });

  it('does not cache failures', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('recovered');

    await expect(cached('key', 1000, fetcher)).rejects.toThrow('boom');
    const result = await cached('key', 1000, fetcher);
    expect(result).toBe('recovered');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keys entries independently', async () => {
    const fetcherA = vi.fn().mockResolvedValue('a');
    const fetcherB = vi.fn().mockResolvedValue('b');
    expect(await cached('a', 1000, fetcherA)).toBe('a');
    expect(await cached('b', 1000, fetcherB)).toBe('b');
  });
});
