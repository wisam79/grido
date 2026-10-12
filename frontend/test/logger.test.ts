import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { backendMock } = vi.hoisted(() => ({
  backendMock: vi.fn(async (..._args: unknown[]): Promise<void> => {}),
}));

vi.mock('@bindings/grido/app', () => ({
  LogFrontendError: (...args: unknown[]) => backendMock(...args),
}));

import { createLogger } from '../src/lib/logger';

describe('unified frontend logger', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('error_with_Error_forwards_readable_message_not_empty_object', async () => {
    const logger = createLogger('probe-scope');
    const err = new Error('disk full');
    logger.error('save failed:', err);
    await Promise.resolve();

    expect(backendMock).toHaveBeenCalledTimes(1);
    const [level, message] = backendMock.mock.calls[0] as unknown as [string, string, string];
    expect(level).toBe('error');
    expect(message).toContain('[probe-scope]');
    expect(message).toContain('disk full');
    expect(message).not.toContain('{}');
    // الـ stack يُستخرج ويُرسل حقلاً مستقلاً للـ backend
    expect((backendMock.mock.calls[0] as unknown as unknown[])[2]).toContain('Error');
  });

  it('console_receives_original_objects_for_devtools_inspection', () => {
    const logger = createLogger('probe-scope');
    const payload = { code: 500, retry: false };
    const err = new Error('boom');
    logger.error('op failed', payload, err);

    expect(errorSpy).toHaveBeenCalledTimes(1);
    const args = errorSpy.mock.calls[0] as unknown[];
    expect(args[0]).toBe('[probe-scope]');
    // الهوية محفوظة (لا stringify) — الكائن قابل للتوسيع والـ Error قابل للنقر
    expect(args[1]).toBe('op failed');
    expect(args[2]).toBe(payload);
    expect(args[3]).toBe(err);
  });

  it('empty_call_logs_scoped_level_fallback', () => {
    createLogger('probe-scope').error();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('[probe-scope] ERROR');
  });

  it('only_info_warn_error_reach_backend_debug_trace_stay_local', async () => {
    const logger = createLogger('probe-scope');
    logger.info('i');
    logger.warn('w');
    logger.error('e');
    logger.debug('d');
    logger.trace('t');
    await Promise.resolve();

    const levels = backendMock.mock.calls.map((c) => (c as unknown as string[])[0]);
    expect(levels).toEqual(['info', 'warn', 'error']);
    expect(debugSpy).toHaveBeenCalledTimes(2);
  });

  it('backend_outage_never_breaks_the_caller', async () => {
    backendMock.mockRejectedValueOnce(new Error('ipc down'));
    const logger = createLogger('probe-scope');
    expect(() => logger.error('still works')).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it('trace_debug_silenced_in_production_build', () => {
    vi.stubEnv('PROD', true);
    const logger = createLogger('probe-scope');
    logger.trace('t');
    logger.debug('d');
    logger.info('i');
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });
});
