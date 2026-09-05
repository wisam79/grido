/**
 * Unified frontend logger.
 * Channels diagnostics through the Wails runtime when available so entries
 * land in the structured Go log file; falls back to console in dev/tests.
 */

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

interface WailsLogger {
  LogTrace: (message: string) => void;
  LogDebug: (message: string) => void;
  LogInfo: (message: string) => void;
  LogWarning: (message: string) => void;
  LogError: (message: string) => void;
}

declare global {
  interface Window {
    runtime?: Partial<WailsLogger> & Record<string, unknown>;
  }
}

const DEV_CHANNELS = new Set(["trace", "debug"]);

function formatMessage(level: LogLevel, scope: string, parts: unknown[]): string {
  const suffix = parts
    .map((p) => {
      if (typeof p === "string") return p;
      try {
        return JSON.stringify(p);
      } catch {
        return String(p);
      }
    })
    .join(" ");
  return `[${scope}] ${suffix || level.toUpperCase()}`;
}

function emit(level: LogLevel, scope: string, parts: unknown[]): void {
  const message = formatMessage(level, scope, parts);

  const wails = typeof window !== "undefined" ? window.runtime : undefined;
  if (wails) {
    const wailsLevel = level.charAt(0).toUpperCase() + level.slice(1);
    const fn = wails[`Log${wailsLevel}`] as ((msg: string) => void) | undefined;
    if (typeof fn === "function") {
      try {
        fn(message);
        return;
      } catch {
        /* fall through to console */
      }
    }
  }

  if (DEV_CHANNELS.has(level) && import.meta.env?.PROD) return;
  const consoleFn = level === "warn" ? console.warn : level === "error" ? console.error : console.log;
  consoleFn(message);
}

export function createLogger(scope: string) {
  return {
    trace: (...parts: unknown[]) => emit("trace", scope, parts),
    debug: (...parts: unknown[]) => emit("debug", scope, parts),
    info: (...parts: unknown[]) => emit("info", scope, parts),
    warn: (...parts: unknown[]) => emit("warn", scope, parts),
    error: (...parts: unknown[]) => emit("error", scope, parts),
  };
}

export type Logger = ReturnType<typeof createLogger>;
