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

/** مدى RTL الأوسع (عبري/سرياني/نكو) لتحديد الاتجاه الأول القوي */
const RTL_RANGES: Array<[number, number]> = [
  [0x0590, 0x05ff],
  [0x0600, 0x06ff],
  [0x0700, 0x074f],
  [0x0750, 0x077f],
  [0x0780, 0x07bf],
  [0x07c0, 0x07ff],
  [0x08a0, 0x08ff],
  [0xfb1d, 0xfb4f],
  [0xfb50, 0xfdff],
  [0xfe70, 0xfeff],
];

export function isArabicText(text: string | undefined | null): boolean {
  if (!text) return false;
  return ARABIC_RE.test(text);
}

const LETTER_RE = /\p{L}/u;

/**
 * اتجاه الفقرة بقاعدة «أول محرف قوي» (UAX #9 First Strong):
 * الأرقام والمسافات والعلامات محايدة ولا تحدد الاتجاه، فالنص المختلط
 * «Grido 2026 تصميم» لاتيني، و«تصميم Grido» عربي — بخلاف فحص «يحتوي عربي».
 *
 * المحرف القوي لا بد أن يكون حرفاً فعلياً: الأرقام المشرقية (٠-٩) والعلامات
 * العربية (، ؟) تقع داخل نطاقات RTL لكنها محايدة، فبدون بوابة \p{L} كان النص
 * «٢٠٢٦ Grido» يُحسب عربياً خطأً.
 */
export function resolveTextDirection(text: string | undefined | null): 'rtl' | 'ltr' {
  if (!text) return 'ltr';
  for (const ch of text) {
    if (!LETTER_RE.test(ch)) continue;
    const cp = ch.codePointAt(0) ?? 0;
    for (const [start, end] of RTL_RANGES) {
      if (cp >= start && cp <= end) return 'rtl';
    }
    return 'ltr';
  }
  return 'ltr';
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
  /** اتجاه الفقرة الفعلي (أول محرف قوي) — بديل فحص «يحتوي عربي» */
  direction: 'rtl' | 'ltr';
  /** التباعد الفعلي الممرَّر إلى Konva/Canvas (يتصفّر للعربي مع تعويض مسافات) */
  letterSpacing: number;
}

const EASTERN_ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** أرقام غربية → مشرقية (للعرض على الكانفس وفي المحرر) */
export function toEasternArabicDigits(text: string): string {
  return text.replace(/\d/g, (d) => EASTERN_ARABIC_DIGITS[parseInt(d, 10)]);
}

/** أرقام مشرقية → غربية قبل حفظ نص المحرر */
export function fromEasternArabicDigits(text: string): string {
  return text.replace(/[٠-٩]/g, (d) => String(EASTERN_ARABIC_DIGITS.indexOf(d)));
}

/** نص العرض داخل محرر النص — تحويل الحالة يبقى على CSS، والمسافات لا تُمس */
export function toEditorDisplayText(text: string, arabicNumerals?: boolean): string {
  return arabicNumerals ? toEasternArabicDigits(text) : text;
}

/** نص المحرر → النص المخزَّن (يعيد الأرقام المشرقية لغربية عند الخيار مفعّل) */
export function fromEditorDisplayText(text: string, arabicNumerals?: boolean): string {
  return arabicNumerals ? fromEasternArabicDigits(text) : text;
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
    text = toEasternArabicDigits(text);
  }

  const isArabic = ARABIC_RE.test(text);
  const direction = resolveTextDirection(source.text || '');
  const spacing = source.letterSpacing || 0;
  // التباعد يُصفَّر للعربي في الاتجاهين: السالب يقرّب الحروف فيكسر الوصلات،
  // والموجب يعوَّض بمسافات كلمات بدل تفكيك الحروف.
  const effectiveLetterSpacing = isArabic ? 0 : spacing;

  if (isArabic && spacing > 0) {
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

  return { text, isArabic, direction, letterSpacing: effectiveLetterSpacing };
}
