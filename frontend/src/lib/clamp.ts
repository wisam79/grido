/**
 * clamp — حصر قيمة بين حدين (min, max).
 *
 * وحدة مستقلة صفرية الاعتماديات عمداً: تُستهلك من `lib/utils.ts` المنتبه
 * للـ DOM (clsx/tailwind-merge/templates) ومن وحدات Web Workers
 * (face-frame.worker.ts يستورد face-frame-utils) — ولا يجوز سحب اعتماديات
 * الواجهة إلى حزم الـ workers.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
