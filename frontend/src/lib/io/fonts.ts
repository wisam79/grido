import { createLogger } from '@/lib/logger';

export type FontCategory =
  'all' | 'kufi' | 'naskh' | 'calligraphy' | 'modern' | 'display' | 'latin';

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
  weights: readonly number[];
  offlineWeights?: readonly number[];
  sampleText?: string;
}

const STANDARD_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;
const REGULAR_BOLD = [400, 700] as const;

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
    weights: [200, 300, 400, 500, 600, 700, 800, 900, 1000],
    offlineWeights: REGULAR_BOLD,
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
    weights: [200, 300, 400, 500, 700, 800, 900],
    offlineWeights: REGULAR_BOLD,
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
    weights: STANDARD_WEIGHTS,
    offlineWeights: REGULAR_BOLD,
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
    weights: [400, 500, 600, 700],
    offlineWeights: REGULAR_BOLD,
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
    weights: [200, 300, 400, 500, 600, 700],
    offlineWeights: REGULAR_BOLD,
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
    weights: [400, 500, 600, 700],
    offlineWeights: REGULAR_BOLD,
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
    weights: REGULAR_BOLD,
    offlineWeights: REGULAR_BOLD,
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
    weights: [400, 500, 600, 700],
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
    weights: [200, 300, 400, 500, 600, 700, 800],
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
    weights: REGULAR_BOLD,
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
    weights: [100, 200, 300, 400, 500, 600, 700],
    offlineWeights: [400, 500, 600, 700],
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
    weights: [300, 400, 500, 600, 700],
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
    weights: [300, 400, 500, 600, 700],
    offlineWeights: REGULAR_BOLD,
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
    weights: [400],
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
    weights: [400],
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
    weights: [300, 400, 700, 800],
    offlineWeights: REGULAR_BOLD,
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
    weights: [300, 400, 500, 600, 700, 800, 900],
    offlineWeights: REGULAR_BOLD,
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
    weights: STANDARD_WEIGHTS,
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
    weights: [400, 500, 600, 700, 800],
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
    weights: [200, 300, 400, 500, 600, 700, 800],
    offlineWeights: REGULAR_BOLD,
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
    weights: [400, 500, 600, 700],
    offlineWeights: REGULAR_BOLD,
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
    weights: [400],
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
    weights: STANDARD_WEIGHTS,
    offlineWeights: REGULAR_BOLD,
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
    weights: STANDARD_WEIGHTS,
    offlineWeights: REGULAR_BOLD,
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
    weights: STANDARD_WEIGHTS,
    offlineWeights: REGULAR_BOLD,
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
    weights: [400, 500, 600, 700, 800, 900],
    offlineWeights: REGULAR_BOLD,
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
    weights: STANDARD_WEIGHTS,
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
    weights: [200, 300, 400, 500, 600, 700],
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

export function findFontOption(fontFamily: string): FontOption | undefined {
  const name = cleanFamilyName(fontFamily).toLowerCase();
  return ARABIC_FONTS.find(
    (font) =>
      cleanFamilyName(font.family).toLowerCase() === name ||
      font.id === name ||
      font.arabicName === name,
  );
}

/** المحلي لا يستعير وزناً سحابياً: القائمة والقياس والتحميل تستخدم الوجوه المشحونة نفسها. */
export function getSupportedFontWeights(fontFamily: string): readonly number[] {
  const font = findFontOption(fontFamily);
  return (font?.isOffline ? font.offlineWeights : font?.weights) ?? STANDARD_WEIGHTS;
}

export function resolveSupportedFontWeight(fontFamily: string, fontWeight?: number): number {
  const requested = Number.isFinite(fontWeight) && fontWeight ? fontWeight : 400;
  return getSupportedFontWeights(fontFamily).reduce((nearest, weight) =>
    Math.abs(weight - requested) < Math.abs(nearest - requested) ? weight : nearest,
  );
}

/** المفتاح يشمل الوزن والنمط: تحميل 400 لا يعني جاهزية 700 لنفس العائلة. */
const fontLoads = new Map<string, Promise<boolean>>();
const stylesheetLoads = new WeakMap<HTMLLinkElement, Promise<void>>();

/** Konva listeners re-measure after a font request settles, including a failed request. */
type FontReadyCallback = (fontFamily: string, fontWeight?: number) => void;
const fontReadyCallbacks = new Set<FontReadyCallback>();

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

/** لا نطلب الوجه قبل تفعيل CSS، ولا نحتفظ بورقة فاشلة تمنع إعادة المحاولة. */
function waitForStylesheet(link: HTMLLinkElement): Promise<void> {
  if (link.sheet) return Promise.resolve();
  const existing = stylesheetLoads.get(link);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timeout);
      link.removeEventListener('load', onLoad);
      link.removeEventListener('error', onError);
      if (error) {
        stylesheetLoads.delete(link);
        link.remove();
        reject(error);
      } else {
        resolve();
      }
    };
    const onLoad = () => finish();
    const onError = () => finish(new Error('Font stylesheet failed to load'));
    const timeout = setTimeout(() => finish(new Error('Font stylesheet timed out')), 3000);
    link.addEventListener('load', onLoad, { once: true });
    link.addEventListener('error', onError, { once: true });
  });
  stylesheetLoads.set(link, promise);
  return promise;
}

/**
 * ينتظر الوجه الفعلي بوزنه المتاح، محلياً أو من Google، ويشارك الطلبات المتطابقة.
 * false تعني فشل التحميل؛ لا تُخزَّن كجاهزية دائمة ويظل الخط البديل قابلاً للعرض.
 */
export function loadGoogleFont(
  fontFamily: string,
  fontWeight?: number,
  fontStyle?: 'normal' | 'italic',
): Promise<boolean> {
  if (typeof document === 'undefined' || !fontFamily) return Promise.resolve(false);

  const fontObj = findFontOption(fontFamily);
  const cleanName = fontObj?.englishName ?? cleanFamilyName(fontFamily);
  const weight = resolveSupportedFontWeight(fontFamily, fontWeight);

  if (
    !cleanName ||
    GENERIC_FAMILIES.has(cleanName.toLowerCase()) ||
    SYSTEM_FAMILIES.has(cleanName.toLowerCase())
  ) {
    return Promise.resolve(true);
  }

  const key = `${cleanName.toLowerCase()}::${weight}::${fontStyle || 'normal'}`;
  const existing = fontLoads.get(key);
  if (existing) return existing;

  const promise = (async () => {
    let stylesheet: HTMLLinkElement | null = null;
    try {
      // Offline faces are declared in offline-fonts.css but still need an explicit load.
      if (!fontObj?.isOffline) {
        const googleName =
          fontObj?.googleFontName || encodeURIComponent(cleanName).replace(/%20/g, '+');
        const weights = fontObj?.weights ?? [weight];
        const linkId = `google-font-${googleName.toLowerCase()}${fontObj ? '' : `-${weight}`}`;
        stylesheet = document.getElementById(linkId) as HTMLLinkElement | null;
        if (!stylesheet) {
          stylesheet = document.createElement('link');
          stylesheet.id = linkId;
          stylesheet.rel = 'stylesheet';
          stylesheet.href = `https://fonts.googleapis.com/css2?family=${googleName}:wght@${weights.join(';')}&display=swap`;
        }
        const ready = waitForStylesheet(stylesheet);
        if (!stylesheet.isConnected) document.head.appendChild(stylesheet);
        await ready;
      }

      const fonts = document.fonts;
      if (fonts?.load) {
        const stylePrefix = fontStyle === 'italic' ? 'italic ' : '';
        // space alone only warms the Latin subset; Arabic must be ready before canvas measures it.
        const sample =
          fontObj && fontObj.category !== 'latin'
            ? 'أبجد هوز Grido 0123456789'
            : 'Grido 0123456789';
        const faces = await fonts.load(`${stylePrefix}${weight} 16px "${cleanName}"`, sample);
        if (faces.length === 0) throw new Error('No matching font face was loaded');
      } else if (fonts?.ready) {
        await fonts.ready;
      }

      notifyFontReady(cleanName, weight);
      return true;
    } catch (err) {
      // A CSS FontFace in error state cannot retry its binary until its owning sheet is replaced.
      if (stylesheet?.isConnected && document.getElementById(stylesheet.id) === stylesheet) {
        stylesheet.remove();
        stylesheetLoads.delete(stylesheet);
        for (const loadKey of fontLoads.keys()) {
          if (loadKey.startsWith(`${cleanName.toLowerCase()}::`)) fontLoads.delete(loadKey);
        }
      }
      logger.warn('Failed to load font:', cleanName, weight, err);
      notifyFontReady(cleanName, weight);
      return false;
    }
  })();

  fontLoads.set(key, promise);
  void promise.then((loaded) => {
    if (!loaded && fontLoads.get(key) === promise) fontLoads.delete(key);
  });
  return promise;
}

/** Checks if a matching face is actually loaded (not just "nothing pending"). */
export function isFontLoaded(fontFamily: string): boolean {
  if (typeof document === 'undefined' || !document.fonts) return true;
  const cleanName = cleanFamilyName(fontFamily).toLowerCase();
  if (GENERIC_FAMILIES.has(cleanName) || SYSTEM_FAMILIES.has(cleanName)) return true;
  for (const face of Array.from(document.fonts)) {
    if (face.family.replace(/['"]/g, '').toLowerCase() === cleanName && face.status === 'loaded') {
      return true;
    }
  }
  return false;
}

/**
 * ينتظر جاهزية خطوط جميع عناصر النص المرئية قبل التصدير أو الطباعة.
 * في البيئات التي لا تملك FontFaceSet (مثل jsdom) يحلّ فوراً دون إبطاء الاختبارات.
 */
export async function ensureElementsFontsLoaded(
  elements: ReadonlyArray<{
    type?: string;
    visible?: boolean;
    fontFamily?: string;
    fontWeight?: number;
    fontStyle?: 'normal' | 'italic';
  }>,
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const tasks = elements
    .filter((el) => el.type === 'text' && el.visible !== false && !!el.fontFamily)
    .map((el) => loadGoogleFont(el.fontFamily!, el.fontWeight, el.fontStyle));
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
}
