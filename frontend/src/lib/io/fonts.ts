export type FontCategory =
  'all' | 'kufi' | 'naskh' | 'calligraphy' | 'modern' | 'display' | 'latin';
import { createLogger } from '@/lib/logger';

const logger = createLogger('fonts');

export interface FontOption {
  id: string;
  name: string;
  arabicName: string;
  englishName: string;
  family: string;
  googleFontName?: string;
  category: FontCategory;
  isOffline?: boolean;
  sampleText?: string;
}

export const ARABIC_FONTS: FontOption[] = [
  // 🏛️ كوفي وهندسي (Kufi & Geometric)
  {
    id: 'cairo',
    name: 'كايرو (Cairo)',
    arabicName: 'كايرو',
    englishName: 'Cairo',
    family: 'Cairo, sans-serif',
    category: 'kufi',
    isOffline: true,
    sampleText: 'أبجد هوز 123',
  },
  {
    id: 'tajawal',
    name: 'تاجوال (Tajawal)',
    arabicName: 'تاجوال',
    englishName: 'Tajawal',
    family: 'Tajawal, sans-serif',
    category: 'kufi',
    isOffline: true,
    sampleText: 'استوديو تصوير فخم',
  },
  {
    id: 'alexandria',
    name: 'الإسكندرية (Alexandria)',
    arabicName: 'الإسكندرية',
    englishName: 'Alexandria',
    family: 'Alexandria, sans-serif',
    category: 'kufi',
    isOffline: true,
    sampleText: 'تصميم عصري هندسي',
  },
  {
    id: 'reem-kufi',
    name: 'الكوفي (Reem Kufi)',
    arabicName: 'ريم الكوفي',
    englishName: 'Reem Kufi',
    family: 'Reem Kufi, sans-serif',
    category: 'kufi',
    isOffline: true,
    sampleText: 'خط كوفي أصيل',
  },
  {
    id: 'readex-pro',
    name: 'ريديكس برو (Readex Pro)',
    arabicName: 'ريديكس برو',
    englishName: 'Readex Pro',
    family: '"Readex Pro", sans-serif',
    googleFontName: 'Readex+Pro',
    category: 'kufi',
    isOffline: true,
    sampleText: 'وضوح فائق ومقروئية',
  },

  // 📜 نسخي وكلاسيكي (Naskh & Classical)
  {
    id: 'noto-naskh',
    name: 'النسخ العربي (Noto Naskh)',
    arabicName: 'النسخ العربي',
    englishName: 'Noto Naskh Arabic',
    family: '"Noto Naskh Arabic", serif',
    category: 'naskh',
    isOffline: true,
    sampleText: 'بسم الله الرحمن الرحيم',
  },
  {
    id: 'amiri',
    name: 'أميري النسخي (Amiri)',
    arabicName: 'أميري',
    englishName: 'Amiri',
    family: 'Amiri, serif',
    category: 'naskh',
    isOffline: true,
    sampleText: 'خط الطباعة الكلاسيكي',
  },
  {
    id: 'scheherazade',
    name: 'شهرزاد (Scheherazade)',
    arabicName: 'شهرزاد الجديد',
    englishName: 'Scheherazade New',
    family: '"Scheherazade New", serif',
    googleFontName: 'Scheherazade+New',
    category: 'naskh',
    sampleText: 'وثائق ومطبوعات رسمية',
  },
  {
    id: 'lateef',
    name: 'لطيف (Lateef)',
    arabicName: 'لطيف',
    englishName: 'Lateef',
    family: 'Lateef, serif',
    googleFontName: 'Lateef',
    category: 'naskh',
    sampleText: 'انسيابية نسخي جميلة',
  },

  // ✍️ رقعة وديواني وحر (Calligraphy, Ruq'ah & Freestyle)
  {
    id: 'aref-ruqaa',
    name: 'عارف رقعة (Aref Ruqaa)',
    arabicName: 'عارف رقعة',
    englishName: 'Aref Ruqaa',
    family: '"Aref Ruqaa", cursive, serif',
    googleFontName: 'Aref+Ruqaa',
    category: 'calligraphy',
    sampleText: 'خط الرقعة التراثي',
  },
  {
    id: 'ibm-plex',
    name: 'ديواني عصري (IBM Plex Arabic)',
    arabicName: 'آي بي إم بلكس',
    englishName: 'IBM Plex Sans Arabic',
    family: '"IBM Plex Sans Arabic", sans-serif',
    category: 'calligraphy',
    isOffline: true,
    sampleText: 'فخامة وأناقة الخط',
  },
  {
    id: 'marhey',
    name: 'مرحي (Marhey)',
    arabicName: 'مرحي',
    englishName: 'Marhey',
    family: 'Marhey, cursive, sans-serif',
    googleFontName: 'Marhey',
    category: 'calligraphy',
    sampleText: 'حيوي ومناسب للمناسبات',
  },
  {
    id: 'lemonada',
    name: 'ليمونادة (Lemonada)',
    arabicName: 'ليمونادة',
    englishName: 'Lemonada',
    family: 'Lemonada, cursive',
    category: 'calligraphy',
    isOffline: true,
    sampleText: 'نص بهيج ولطيف',
  },
  {
    id: 'katibeh',
    name: 'كتيبة (Katibeh)',
    arabicName: 'كتيبة',
    englishName: 'Katibeh',
    family: 'Katibeh, cursive, serif',
    googleFontName: 'Katibeh',
    category: 'calligraphy',
    sampleText: 'عناوين مزخرفة نادرة',
  },
  {
    id: 'lalezar',
    name: 'لاليزار (Lalezar)',
    arabicName: 'لاليزار',
    englishName: 'Lalezar',
    family: 'Lalezar, cursive, display',
    googleFontName: 'Lalezar',
    category: 'calligraphy',
    sampleText: 'عريض جداً للشعارات',
  },

  // 💼 عصري وشركات (Modern Sans & Corporate)
  {
    id: 'almarai',
    name: 'المراعي (Almarai)',
    arabicName: 'المراعي',
    englishName: 'Almarai',
    family: 'Almarai, sans-serif',
    category: 'modern',
    isOffline: true,
    sampleText: 'هوية مؤسسية وبطاقات',
  },
  {
    id: 'rubik',
    name: 'روبيك (Rubik Arabic)',
    arabicName: 'روبيك',
    englishName: 'Rubik',
    family: 'Rubik, sans-serif',
    category: 'modern',
    isOffline: true,
    sampleText: 'حواف ناعمة دائرية',
  },
  {
    id: 'vazirmatn',
    name: 'وزير متن (Vazirmatn)',
    arabicName: 'وزير متن',
    englishName: 'Vazirmatn',
    family: 'Vazirmatn, sans-serif',
    googleFontName: 'Vazirmatn',
    category: 'modern',
    sampleText: 'واضح جداً في الطباعة',
  },
  {
    id: 'baloo-bhaijaan',
    name: 'بالو بهيجان (Baloo Bhaijaan 2)',
    arabicName: 'بالو بهيجان',
    englishName: 'Baloo Bhaijaan 2',
    family: '"Baloo Bhaijaan 2", sans-serif',
    googleFontName: 'Baloo+Bhaijaan+2',
    category: 'modern',
    sampleText: 'شارات وعناوين مرحة',
  },

  // 🏷️ عناوين وشعارات (Display & Headlines)
  {
    id: 'changa',
    name: 'شانغا (Changa)',
    arabicName: 'شانغا',
    englishName: 'Changa',
    family: 'Changa, sans-serif',
    category: 'display',
    isOffline: true,
    sampleText: 'عنوان عريض وقوي',
  },
  {
    id: 'el-messiri',
    name: 'المسيري (El Messiri)',
    arabicName: 'المسيري',
    englishName: 'El Messiri',
    family: '"El Messiri", sans-serif',
    category: 'display',
    isOffline: true,
    sampleText: 'أناقة وزخرفة مميزة',
  },
  {
    id: 'gulzar',
    name: 'جلزار النسعليق (Gulzar)',
    arabicName: 'جلزار',
    englishName: 'Gulzar',
    family: 'Gulzar, serif',
    googleFontName: 'Gulzar',
    category: 'display',
    sampleText: 'شعر واقتباسات فخمة',
  },

  // 🔤 خطوط لاتينية (Latin & Global Typography)
  {
    id: 'inter',
    name: 'إنتر (Inter - Modern)',
    arabicName: 'إنتر',
    englishName: 'Inter',
    family: 'Inter, sans-serif',
    category: 'latin',
    isOffline: true,
    sampleText: 'Grido Studio Pro Design',
  },
  {
    id: 'outfit',
    name: 'أوتفت (Outfit - Geometric)',
    arabicName: 'أوتفت',
    englishName: 'Outfit',
    family: 'Outfit, sans-serif',
    category: 'latin',
    isOffline: true,
    sampleText: 'Modern Geometry 2026',
  },
  {
    id: 'montserrat',
    name: 'مونتسيرات (Montserrat)',
    arabicName: 'مونتسيرات',
    englishName: 'Montserrat',
    family: 'Montserrat, sans-serif',
    category: 'latin',
    isOffline: true,
    sampleText: 'HEADLINE & POSTERS',
  },
  {
    id: 'playfair',
    name: 'بليفيل (Playfair Display)',
    arabicName: 'بليفيل',
    englishName: 'Playfair Display',
    family: '"Playfair Display", serif',
    category: 'latin',
    isOffline: true,
    sampleText: 'Luxury Photography',
  },
  {
    id: 'poppins',
    name: 'بوبينز (Poppins)',
    arabicName: 'بوبينز',
    englishName: 'Poppins',
    family: 'Poppins, sans-serif',
    googleFontName: 'Poppins',
    category: 'latin',
    sampleText: 'Clean Minimalist Look',
  },
  {
    id: 'oswald',
    name: 'أوزوالد (Oswald - Condensed)',
    arabicName: 'أوزوالد',
    englishName: 'Oswald',
    family: 'Oswald, sans-serif',
    googleFontName: 'Oswald',
    category: 'latin',
    sampleText: 'BOLD STUDIO STAMP',
  },
];

const GENERIC_FAMILIES = new Set(['sans-serif', 'serif', 'cursive', 'monospace', 'system-ui']);

/** خطوط نظام شائعة — لا نطلبها من Google ولا ننتظر تحميلها. */
const SYSTEM_FAMILIES = new Set([
  'arial',
  'helvetica',
  'helvetica neue',
  'times new roman',
  'times',
  'georgia',
  'verdana',
  'tahoma',
  'trebuchet ms',
  'courier new',
  'courier',
  'segoe ui',
  'segoe ui variable',
  'calibri',
  'cambria',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  '-apple-system',
  'blinkmacsystemfont',
]);

function cleanFamilyName(fontFamily: string): string {
  return fontFamily.split(',')[0].trim().replace(/['"]/g, '');
}

function normalizeWeight(fontWeight?: number): number {
  if (!fontWeight || !Number.isFinite(fontWeight)) return 400;
  return Math.min(900, Math.max(100, Math.round(fontWeight / 100) * 100));
}

/** المفتاح يشمل الوزن: تحميل 400 لا يعني جاهزية 800 لنفس العائلة. */
const fontLoads = new Map<string, Promise<boolean>>();

/**
 * Callbacks to invoke when a font face finishes loading.
 * Konva text nodes register here to trigger a re-measure + layer.batchDraw()
 * so text layout uses the real font metrics instead of the fallback font —
 * per Konva's official guidance.
 */
type FontReadyCallback = (fontFamily: string, fontWeight?: number) => void;
const fontReadyCallbacks = new Set<FontReadyCallback>();

/** Register a callback that fires whenever a font face finishes loading. */
export function onFontReady(cb: FontReadyCallback): () => void {
  fontReadyCallbacks.add(cb);
  return () => {
    fontReadyCallbacks.delete(cb);
  };
}

function notifyFontReady(cleanName: string, fontWeight: number): void {
  for (const cb of fontReadyCallbacks) {
    try {
      cb(cleanName, fontWeight);
    } catch {
      /* ignore listener errors */
    }
  }
}

/**
 * ينتظر تفعيل ورقة الأنماط قبل طلب الوجه. ملف الـ CSS يُحمَّل لا synchronously،
 * و`document.fonts.load` يحلّ فوراً بقائمة فارغة إن لم تكن @font-face معلنة
 * بعد — فيُقاس النص بخط بديل بلا أي إعادة قياس لاحقة. لا انتظار أبدي إن فشلت
 * الشبكة: المهلة القصوى تكفي لتُظهر المعاينة بالخط البديل.
 */
function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    link.addEventListener('load', done, { once: true });
    link.addEventListener('error', done, { once: true });
    setTimeout(done, 3000);
  });
}

/**
 * Loads a font face on demand (Google stylesheet أو خط مضمّن) وينتظر جاهزية
 * الوجه المطلوب فعلياً عبر `document.fonts.load` — لا `document.fonts.ready`
 * وحدها، لأنها قد تحل قبل أن يكتشف المتصفح الوجه الجديد أصلاً.
 *
 * يُرجع Promise يحلّ true عند اكتمال التحميل (أو تعذّره) — المتصل يعيد القياس
 * حينها. الطلبات المتكررة لنفس (العائلة، الوزن) تتشارك نفس الوعد.
 */
export function loadGoogleFont(
  fontFamily: string,
  fontWeight?: number,
  fontStyle?: 'normal' | 'italic',
): Promise<boolean> {
  if (typeof document === 'undefined' || !fontFamily) return Promise.resolve(false);

  const cleanName = cleanFamilyName(fontFamily);
  const weight = normalizeWeight(fontWeight);

  if (!cleanName || GENERIC_FAMILIES.has(cleanName.toLowerCase())) {
    return Promise.resolve(true);
  }
  if (SYSTEM_FAMILIES.has(cleanName.toLowerCase())) {
    return Promise.resolve(true);
  }

  const key = `${cleanName.toLowerCase()}::${weight}::${fontStyle || 'normal'}`;
  const existing = fontLoads.get(key);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const fontObj = ARABIC_FONTS.find(
        (f) =>
          f.family.includes(cleanName) ||
          f.englishName.toLowerCase() === cleanName.toLowerCase() ||
          f.id === cleanName.toLowerCase(),
      );

      // Offline fonts are already declared in offline-fonts.css — don't inject Google CSS.
      // But they still need an explicit load + notification so Konva re-measures.
      let stylesheet: HTMLLinkElement | null = null;
      if (!fontObj?.isOffline) {
        const googleName = fontObj?.googleFontName || cleanName.replace(/ /g, '+');
        const linkId = `google-font-${googleName.toLowerCase().replace(/\s+/g, '-')}`;
        stylesheet = document.getElementById(linkId) as HTMLLinkElement | null;
        if (!stylesheet) {
          const link = document.createElement('link');
          link.id = linkId;
          link.rel = 'stylesheet';
          link.href = `https://fonts.googleapis.com/css2?family=${googleName}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
          document.head.appendChild(link);
          stylesheet = link;
        }
      }

      // الوجه لا يمكن أن يوجد قبل تفعيل الورقة — الانتظار هنا هو ما يجعل
      // `document.fonts.load` تقيس الوجه المطلوب فعلاً بدل قائمة فارغة.
      if (stylesheet) await waitForStylesheet(stylesheet);

      const fonts = typeof document !== 'undefined' ? document.fonts : undefined;
      if (fonts?.load) {
        const stylePrefix = fontStyle === 'italic' ? 'italic ' : '';
        await fonts.load(`${stylePrefix}${weight} 16px "${cleanName}"`);
      } else if (fonts?.ready) {
        await fonts.ready;
      }

      notifyFontReady(cleanName, weight);
      return true;
    } catch (err) {
      logger.warn('Failed to load font:', cleanName, weight, err);
      // أبلغ المراقبين رغم الفشل كي لا يبقى المحرر مخفياً أو القياس معلّقاً
      notifyFontReady(cleanName, weight);
      fontLoads.delete(key);
      return false;
    }
  })();

  fontLoads.set(key, promise);
  return promise;
}

/**
 * Checks if a matching face is actually loaded (not just "nothing pending").
 */
export function isFontLoaded(fontFamily: string): boolean {
  if (typeof document === 'undefined' || !document.fonts) return true;
  const cleanName = cleanFamilyName(fontFamily).toLowerCase();
  if (GENERIC_FAMILIES.has(cleanName)) return true;
  for (const face of Array.from(document.fonts)) {
    if (face.family.replace(/['"]/g, '').toLowerCase() === cleanName && face.status === 'loaded') {
      return true;
    }
  }
  return false;
}
