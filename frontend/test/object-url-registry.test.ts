import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_OBJECT_URL_REVOKE_DELAY_MS,
  pendingObjectUrlCount,
  registerObjectUrl,
  revokeAllObjectUrls,
  revokeObjectUrlNow,
} from '@/lib/io/object-url-registry';

describe('object URL registry', () => {
  let revokeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    revokeSpy = vi.fn();
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeSpy,
    });
  });

  afterEach(() => {
    revokeAllObjectUrls();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('revokes every pending URL independently (no orphaned earlier URL)', () => {
    registerObjectUrl('blob:a');
    registerObjectUrl('blob:b');

    vi.advanceTimersByTime(DEFAULT_OBJECT_URL_REVOKE_DELAY_MS - 1);
    expect(revokeSpy).not.toHaveBeenCalled();
    expect(pendingObjectUrlCount()).toBe(2);

    vi.advanceTimersByTime(1);
    expect(revokeSpy).toHaveBeenCalledWith('blob:a');
    expect(revokeSpy).toHaveBeenCalledWith('blob:b');
    expect(pendingObjectUrlCount()).toBe(0);
  });

  it('resets the timer when the same URL is registered again', () => {
    registerObjectUrl('blob:a', 1000);
    vi.advanceTimersByTime(700);
    registerObjectUrl('blob:a', 1000);
    vi.advanceTimersByTime(700);
    expect(revokeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(revokeSpy).toHaveBeenCalledWith('blob:a');
  });

  it('revokes immediately and idempotently', () => {
    registerObjectUrl('blob:a');
    revokeObjectUrlNow('blob:a');
    revokeObjectUrlNow('blob:a');
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(pendingObjectUrlCount()).toBe(0);
  });

  it('revokes all pending URLs during cleanup', () => {
    registerObjectUrl('blob:a');
    registerObjectUrl('blob:b');
    revokeAllObjectUrls();
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(pendingObjectUrlCount()).toBe(0);
  });
});
