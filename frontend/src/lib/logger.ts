import { LogFrontendError } from '@bindings/grido/app';

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

const DEV_CHANNELS = new Set(['trace', 'debug']);

function formatPart(p: unknown): string {
  if (typeof p === 'string') return p;
  if (p instanceof Error) return p.message || String(p);
  try {
    const s = JSON.stringify(p);
    return s === undefined ? String(p) : s;
  } catch {
    return String(p);
  }
}

function formatMessage(level: LogLevel, scope: string, parts: unknown[]): string {
  const suffix = parts.map(formatPart).join(' ');
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
    level === 'warn'
      ? console.warn.bind(console)
      : level === 'error'
        ? console.error.bind(console)
        : level === 'info'
          ? console.info.bind(console)
          : (console.debug ?? console.log).bind(console);
  // نمرر الأجزاء الأصلية (بدون stringify) للحفاظ على قابلية الفحص في DevTools
  // (توسيع الكائنات + stack الـError القابل للنقر)، بينما الـbackend يستلم النص المنسق.
  if (parts.length === 0) {
    consoleFn(message);
  } else {
    consoleFn(`[${scope}]`, ...parts);
  }
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
