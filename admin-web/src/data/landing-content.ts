export type CurrencyCode = "IQD" | "SAR" | "USD";

export interface CurrencyConfig {
  code: CurrencyCode;
  label: string;
  name: string;
  symbol: string;
  originalPrice: number;
  currentPrice: number;
  priceFormatted: string;
  originalPriceFormatted: string;
  unit: string;
  note: string;
  defaultRoiPrice: number;
  roiMinPrice: number;
  roiMaxPrice: number;
  roiStep: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  IQD: {
    code: "IQD",
    label: "د.ع (العراق)",
    name: "دينار عراقي",
    symbol: "د.ع",
    originalPrice: 150000,
    currentPrice: 75000,
    priceFormatted: "75,000",
    originalPriceFormatted: "150,000",
    unit: "دينار",
    note: "دفع لمرة واحدة فقط",
    defaultRoiPrice: 4000,
    roiMinPrice: 1000,
    roiMaxPrice: 10000,
    roiStep: 500,
  },
  SAR: {
    code: "SAR",
    label: "ر.س (السعودية والخليج)",
    name: "ريال سعودي",
    symbol: "ر.س",
    originalPrice: 399,
    currentPrice: 199,
    priceFormatted: "199",
    originalPriceFormatted: "399",
    unit: "ريال",
    note: "دفع لمرة واحدة فقط",
    defaultRoiPrice: 20,
    roiMinPrice: 5,
    roiMaxPrice: 50,
    roiStep: 5,
  },
  USD: {
    code: "USD",
    label: "$ (الدولار الدولي)",
    name: "دولار أمريكي",
    symbol: "$",
    originalPrice: 99,
    currentPrice: 49,
    priceFormatted: "$49",
    originalPriceFormatted: "$99",
    unit: "USD",
    note: "دفع لمرة واحدة فقط",
    defaultRoiPrice: 5,
    roiMinPrice: 2,
    roiMaxPrice: 20,
    roiStep: 1,
  },
};

export interface MockupPreset {
  id: string;
  name: string;
  countryFlag: string;
  dimensions: string;
  specStandard: string;
  description: string;
  sheetCount: string;
  cutMargins: string;
  headRatio: string;
  eyeLine: string;
  badgeColor: string;
}

export const MOCKUP_PRESETS: MockupPreset[] = [
  {
    id: "iraq-passport",
    name: "جواز عراقي",
    countryFlag: "🇮🇶",
    dimensions: "35×45 mm",
    specStandard: "معايير ICAO الرسمية",
    description:
      "خلفية بيضاء نقية مع ضبط تلقائي لمستوى العينين وهامش الرأس 70-80%",
    sheetCount: "8 صور في ورقة A4 أو 4 صور 10×15",
    cutMargins: "0.5mm خطوط مقص آلي",
    headRatio: "72% نسبة الرأس",
    eyeLine: "مستوى بؤبؤ العينين 31mm",
    badgeColor: "#3b82f6",
  },
  {
    id: "us-visa",
    name: "فيزا أمريكا / اللوتري",
    countryFlag: "🇺🇸",
    dimensions: '50×50 mm (2×2")',
    specStandard: "معايير وزارة الخارجية الأمريكية",
    description: "مراجعة موضع العينين والإضاءة أثناء تجهيز صورة الفيزا",
    sheetCount: "6 صور في ورقة 10×15cm",
    cutMargins: "0.5mm خطوط متقاطعة",
    headRatio: "50-69% من إجمالي الارتفاع",
    eyeLine: "ارتفاع العينين 28-35mm",
    badgeColor: "#10b981",
  },
  {
    id: "schengen",
    name: "فيزا شينغن الأوروبية",
    countryFlag: "🇪🇺",
    dimensions: "35×45 mm",
    specStandard: "الاتحاد الأوروبي ICAO",
    description: "تجهيز المقاس والخلفية مع مراجعة متطلبات الجهة المستلمة",
    sheetCount: "8 صور جاهزة للقص",
    cutMargins: "0.5mm Safe Bleed",
    headRatio: "32-36mm طول الوجه",
    eyeLine: "توسيط دقيق للرأس 100%",
    badgeColor: "#60a5fa",
  },
  {
    id: "a4-sheet",
    name: "طقم طباعة A4 مجمّع",
    countryFlag: "🖨️",
    dimensions: "210×297 mm",
    specStandard: "أقصى توفير في الورق",
    description: "توزيع شبكي قابل للضبط لاستغلال مساحة الورق حسب مقاسات الصور",
    sheetCount: "توزيع حر أو طقم 16-24 صورة",
    cutMargins: "خطوط إرشادية كاملة لسكين القص",
    headRatio: "دقة 300 DPI - CMYK",
    eyeLine: "محاذاة مغناطيسية فورية",
    badgeColor: "#f59e0b",
  },
];

export interface UsageExample {
  id: string;
  title: string;
  description: string;
}

// Illustrative workflows, not sourced customer testimonials or measured results.
export const USAGE_EXAMPLES: UsageExample[] = [
  {
    id: "test-1",
    title: "صور الهوية والفيزا",
    description:
      "اختر المقاس، راجع تأطير الوجه والخلفية ثم جهّز ورقة الصور. تحقّق من متطلبات الجهة المستلمة قبل الطباعة.",
  },
  {
    id: "test-2",
    title: "ورقة تجمع صوراً متعددة",
    description:
      "رتّب الصور في شبكة واضبط الهوامش والفواصل وخطوط القص بما يناسب ورق الطابعة.",
  },
  {
    id: "test-3",
    title: "عمل محلي وخيارات سحابية",
    description:
      "حرّر الصور ورتّبها واطبعها محلياً. استخدم أدوات الذكاء الاصطناعي السحابية اختيارياً عند الحاجة وبوجود اتصال.",
  },
];
