/**
 * Wails error normalization.
 *
 * Wails IPC rejects with errors serialized as plain strings. All `catch`
 * blocks around Wails calls should funnel through `toErrorMessage` to get a
 * user-presentable Arabic message instead of raw serialized payloads.
 */

const FALLBACK_MESSAGE = "حدث خطأ غير متوقع";

export function toErrorMessage(err: unknown, fallback = FALLBACK_MESSAGE): string {
  if (typeof err === "string") {
    const trimmed = err.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (typeof parsed === "string") return parsed;
      } catch {
        /* not a JSON string literal */
      }
    }
    return trimmed || fallback;
  }
  if (err instanceof Error) return err.message || fallback;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
}
