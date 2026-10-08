import { LogFrontendError } from '@bindings/grido/app';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const DEV_CHANNELS = new Set(['trace', 'debug']);

function formatMessage(level: LogLevel, scope: string, parts: unknown[]): string {
  const suffix = parts
    .map((p) => {
      if (typeof p === 'string') return p;
      try {
        return JSON.stringify(p);
      } catch {
        return String(p);
      }
    })
    .join(' ');
  return `[${scope}] ${suffix || level.toUpperCase()}`;
}

function extractStack(parts: unknown[]): string {
  for (const p of parts) {
    if (p instanceof Error && p.stack) {
      return p.stack;
    }
  }
  return '';
}

function emit(level: LogLevel, scope: string, parts: unknown[]): void {
  const message = formatMessage(level, scope, parts);

  // Forward info/warn/error to Go backend structured log file (lumberjack)
  if (level === 'info' || level === 'warn' || level === 'error') {
    try {
      if (typeof LogFrontendError === 'function') {
        void LogFrontendError(level, message, extractStack(parts)).catch(() => {});
      }
    } catch {
      /* ignore when backend is unreachable */
    }
  }

  if (DEV_CHANNELS.has(level) && import.meta.env?.PROD) return;
  const consoleFn =
    level === 'warn' ? console.warn : level === 'error' ? console.error : console.log;
  consoleFn(message);
}

export function createLogger(scope: string) {
  return {
    trace: (...parts: unknown[]) => emit('trace', scope, parts),
    debug: (...parts: unknown[]) => emit('debug', scope, parts),
    info: (...parts: unknown[]) => emit('info', scope, parts),
    warn: (...parts: unknown[]) => emit('warn', scope, parts),
    error: (...parts: unknown[]) => emit('error', scope, parts),
  };
}

export type Logger = ReturnType<typeof createLogger>;
