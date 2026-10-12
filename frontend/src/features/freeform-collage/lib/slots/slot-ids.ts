/**
 * توليد معرّف فريد للخلايا الجديدة عبر crypto.randomUUID القياسي
 */
export function newSlotId(prefix: string = 'slot'): string {
  return `${prefix}_` + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
}
