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

export interface TextRenderSource {
  text?: string;
  arabicNumerals?: boolean;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface TextRenderState {
  /** النص النهائي بعد الأرقام المشرقية وتحويلات الحالة وتباعد الكلمات العربي */
  text: string;
  isArabic: boolean;
  /** التباعد الفعلي الممرَّر إلى Konva/Canvas (يتصفّر للعربي مع تعويض مسافات) */
  letterSpacing: number;
}

/**
 * تجهيز النص المشترك بين المعاينة والتصدير ومحرر النص:
 * - الأرقام المشرقية (٠-٩)
 * - تحويلات الحالة للاتيني فقط (تطبيقها على العربي يخرب التشكيل)
 * - تباعد الحروف للعربي: Konva يفكك الوصلات، لذا نستخدم مسافات كلمات
 *   إضافية مع تصفير letterSpacing (نفس الحيلة في overlay: wordSpacing).
 * وجود هذا المنطق في مكان واحد يمنع انحراف WYSIWYG بين المسارات.
 */
export function resolveTextRenderState(source: TextRenderSource): TextRenderState {
  let text = source.text || '';

  if (source.arabicNumerals) {
    text = text.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
  }

  const isArabic = ARABIC_RE.test(text);
  const spacing = source.letterSpacing || 0;
  let effectiveLetterSpacing = spacing;

  if (isArabic && spacing > 0) {
    effectiveLetterSpacing = 0;
    const extraSpaces = ' '.repeat(Math.min(6, Math.max(1, Math.round(spacing / 3.5))));
    text = text.replace(/ /g, extraSpaces);
  }

  if (!isArabic) {
    switch (source.textTransform) {
      case 'uppercase':
        text = text.toUpperCase();
        break;
      case 'lowercase':
        text = text.toLowerCase();
        break;
      case 'capitalize':
        text = text.replace(/\b\w/g, (c) => c.toUpperCase());
        break;
      default:
        break;
    }
  }

  return { text, isArabic, letterSpacing: effectiveLetterSpacing };
}
