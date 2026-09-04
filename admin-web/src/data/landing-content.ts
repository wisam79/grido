export type CurrencyCode = 'IQD' | 'SAR' | 'USD';

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
    code: 'IQD',
    label: 'د.ع (العراق)',
    name: 'دينار عراقي',
    symbol: 'د.ع',
    originalPrice: 150000,
    currentPrice: 75000,
    priceFormatted: '75,000',
    originalPriceFormatted: '150,000',
    unit: 'دينار',
    note: 'دفع لمرة واحدة فقط',
    defaultRoiPrice: 4000,
    roiMinPrice: 1000,
    roiMaxPrice: 10000,
    roiStep: 500,
  },
  SAR: {
    code: 'SAR',
    label: 'ر.س (السعودية والخليج)',
    name: 'ريال سعودي',
    symbol: 'ر.س',
    originalPrice: 399,
    currentPrice: 199,
    priceFormatted: '199',
    originalPriceFormatted: '399',
    unit: 'ريال',
    note: 'دفع لمرة واحدة فقط',
    defaultRoiPrice: 20,
    roiMinPrice: 5,
    roiMaxPrice: 50,
    roiStep: 5,
  },
  USD: {
    code: 'USD',
    label: '$ (الدولار الدولي)',
    name: 'دولار أمريكي',
    symbol: '$',
    originalPrice: 99,
    currentPrice: 49,
    priceFormatted: '$49',
    originalPriceFormatted: '$99',
    unit: 'USD',
    note: 'دفع لمرة واحدة فقط',
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
    id: 'iraq-passport',
    name: 'جواز عراقي',
    countryFlag: '🇮🇶',
    dimensions: '35×45 mm',
    specStandard: 'معايير ICAO الرسمية',
    description: 'خلفية بيضاء نقية مع ضبط تلقائي لمستوى العينين وهامش الرأس 70-80%',
    sheetCount: '8 صور في ورقة A4 أو 4 صور 10×15',
    cutMargins: '0.5mm خطوط مقص آلي',
    headRatio: '72% نسبة الرأس',
    eyeLine: 'مستوى بؤبؤ العينين 31mm',
    badgeColor: '#3b82f6',
  },
  {
    id: 'us-visa',
    name: 'فيزا أمريكا / اللوتري',
    countryFlag: '🇺🇸',
    dimensions: '50×50 mm (2×2")',
    specStandard: 'معايير وزارة الخارجية الأمريكية',
    description: 'فحص صارم للعيون المفتوحة، الأذنين، ومنع الظلال واللمعان تماماً',
    sheetCount: '6 صور في ورقة 10×15cm',
    cutMargins: '0.5mm خطوط متقاطعة',
    headRatio: '50-69% من إجمالي الارتفاع',
    eyeLine: 'ارتفاع العينين 28-35mm',
    badgeColor: '#10b981',
  },
  {
    id: 'schengen',
    name: 'فيزا شينغن الأوروبية',
    countryFlag: '🇪🇺',
    dimensions: '35×45 mm',
    specStandard: 'الاتحاد الأوروبي ICAO',
    description: 'عزل احترافي مع إضاءة وجه متوازنة تمنع الرفض في السفارات',
    sheetCount: '8 صور جاهزة للقص',
    cutMargins: '0.5mm Safe Bleed',
    headRatio: '32-36mm طول الوجه',
    eyeLine: 'توسيط دقيق للرأس 100%',
    badgeColor: '#60a5fa',
  },
  {
    id: 'a4-sheet',
    name: 'طقم طباعة A4 مجمّع',
    countryFlag: '🖨️',
    dimensions: '210×297 mm',
    specStandard: 'أقصى توفير في الورق',
    description: 'توزيع شبكي آلي يملأ الفراغات بالكامل ويوفر حتى 35% من الورق والأحبار',
    sheetCount: 'توزيع حر أو طقم 16-24 صورة',
    cutMargins: 'خطوط إرشادية كاملة لسكين القص',
    headRatio: 'دقة 300 DPI - CMYK',
    eyeLine: 'محاذاة مغناطيسية فورية',
    badgeColor: '#f59e0b',
  },
];

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  studioName: string;
  location: string;
  quote: string;
  highlightMetric: string;
  rating: number;
  avatarSeed: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    name: 'حيدر الكعبي',
    role: 'مالك الاستوديو والمصور الرئيسي',
    studioName: 'استوديو بغداد آرت',
    location: 'بغداد — المنصور',
    quote: 'كنا نأخذ 8 دقائق لكل زبون لعزل الصورة وتعديل الإضاءة وترتيبها للطباعة في الفوتوشوب. مع استوديو جريدو صار الموضوع يكتمل بـ 3 ثوانٍ فقط وبدقة عزل مذهلة للشعر والأطراف دون أي هالات بيضاء!',
    highlightMetric: 'توفير 4 ساعات يومياً',
    rating: 5,
    avatarSeed: 'HK',
  },
  {
    id: 'test-2',
    name: 'آزاد هلكورد',
    role: 'مدير العمليات والطباعة الرقمية',
    studioName: 'مركز ألفا لخدمات الطباعة',
    location: 'أربيل — كولان',
    quote: 'أكثر ميزة غيرت عملنا هي خطوط القص الآلية وتوزيع الصور في الورقة. وفرنا أكثر من 30% من ورق DNP الغالي، واختفت تماماً مشكلة رفض السفارات لصور الفيزا الأمريكية وشينغن بسبب المقاسات.',
    highlightMetric: 'توفير 35% استهلاك الورق',
    rating: 5,
    avatarSeed: 'AH',
  },
  {
    id: 'test-3',
    name: 'عمار التميمي',
    role: 'مصور ومصمم معاملات',
    studioName: 'استوديو الأضواء الرقمي',
    location: 'البصرة — العشار',
    quote: 'أهم شيء عندنا أن البرنامج يعمل محلياً 100% دون إنترنت؛ حتى لو قطعت الشبكة في المحل فالعمل لا يتوقف ثانية واحدة، وسرعة إقلاع البرنامج خفيفة جداً حتى على أجهزتنا المتوسطة.',
    highlightMetric: '100% عمل مستمر دون انقطاع',
    rating: 5,
    avatarSeed: 'AT',
  },
];
