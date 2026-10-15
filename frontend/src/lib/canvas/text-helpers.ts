/**
 * وحدة مركزية لثوابت وتعقيم النصوص — مصدر الحقيقة الوحيد لـ TEXT_MAX_LENGTH
 * يُستورد منها كل من: text-editing-overlay, text-elements, crud, clipboard-utils, project-serializer
 */

/** الحد الأقصى لطول النص — يمنع تجميد Konva عند لصق مقال كامل (P0) */
export const TEXT_MAX_LENGTH = 2000;

/** أقصى طول للمعاينة المقتطعة في aria-label (30 حرفاً) */
export const TEXT_LABEL_PREVIEW = 30;

/**
 * تعقيم وتقييد النص الوارد من أي منبع خارجي:
 *  - يوحّد أسطر النهاية (\r\n → \n)
 *  - يزيل محارف التحكم غير المرئية باستثناء \n و \t
 *  - يطبّع Unicode بـ NFC لحماية وصلات الحروف العربية
 *  - يقطع عند TEXT_MAX_LENGTH دون رفض صامت
 */
export function sanitizeText(input: string, maxLen = TEXT_MAX_LENGTH): string {
  if (!input) return '';
  let s = input.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // إزالة محارف التحكم (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F, 0x7F) — نحتفظ بـ \n(0x0A) و \t(0x09)
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // تطبيع Unicode
  if (typeof s.normalize === 'function') {
    try {
      s = s.normalize('NFC');
    } catch {
      /* ignore normalize errors on older engines */
    }
  }
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

/** هل النص عربي/فارسي؟ — نفس التعبير الموحّد في text-node و overlay */
export const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function isArabicText(text: string | undefined | null): boolean {
  if (!text) return false;
  return ARABIC_RE.test(text);
}
