import {
  cornerBracketsMarkup,
  iconMarkup,
  runningStitchCircle,
  scallopCirclePath,
  starRowMarkup,
  sunRaysPath,
  ticketStubPath,
} from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const CRAFT_CARDS: StickerTemplate[] = [
  {
    id: 'card_crf_coffee_origin',
    name: 'بطاقة تذوق القهوة المختصة',
    nameEn: 'Specialty Coffee Origin Tasting Card',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة تذوق القهوة المختصة بمقياس التحميص وأصل الحبوب وإيحاءات النكهة',
    defaultWidth: 720,
    defaultHeight: 440,
    aspectRatio: 720 / 440,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 692, height: 412, rx: 20 },
    defaultColors: {
      primary: '#2C1E18',
      secondary: '#C07A4B',
      background: '#FAF4EC',
    },
    fields: [
      { id: 'roaster', label: 'اسم المحمصة', type: 'text', defaultValue: 'محمصة دجلة المختصة' },
      { id: 'origin', label: 'المنشأ والمنطقة', type: 'text', defaultValue: 'إثيوبيا • يرغاشيف' },
      {
        id: 'notes',
        label: 'إيحاءات التذوق',
        type: 'text',
        defaultValue: 'ياسمين • خوخ • كراميل ناعم',
      },
      {
        id: 'brewMethod',
        label: 'التحضير والتحميص',
        type: 'text',
        defaultValue: 'V60 • تحميص متوسط',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const roaster = escapeXml(fields.roaster || 'محمصة دجلة المختصة');
      const origin = escapeXml(fields.origin || 'إثيوبيا • يرغاشيف');
      const notes = escapeXml(fields.notes || 'ياسمين • خوخ • كراميل ناعم');
      const brewMethod = escapeXml(fields.brewMethod || 'V60 • تحميص متوسط');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" width="720" height="440">
  <defs>
    <linearGradient id="cc01-g" x1="0" y1="0" x2="0.9" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cc01-clip">
      <rect x="14" y="14" width="692" height="412" rx="20"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="692" height="412" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cc01-clip)">
    <rect x="14" y="14" width="230" height="412" fill="url(#cc01-g)" data-color-role="primary"/>
    <rect x="26" y="26" width="206" height="388" rx="14" fill="none" stroke="${backgroundColor}" stroke-opacity="0.22" stroke-width="1.2"/>
    <circle cx="129" cy="172" r="62" fill="${backgroundColor}" fill-opacity="0.12"/>
    <circle cx="129" cy="172" r="54" fill="none" stroke="${backgroundColor}" stroke-opacity="0.24" stroke-width="1.2"/>
    <ellipse cx="129" cy="172" rx="32" ry="44" transform="rotate(-18 129 172)" fill="${backgroundColor}" fill-opacity="0.94"/>
    <path d="M 118,134 Q 138,172 140,210" fill="none" stroke="${primaryColor}" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M 116,102 Q 108,86 120,74 M 136,96 Q 128,80 140,68" fill="none" stroke="${backgroundColor}" stroke-opacity="0.74" stroke-width="3" stroke-linecap="round"/>
    <path d="M 48,262 H 210" stroke="${backgroundColor}" stroke-opacity="0.38" stroke-width="1.6"/>
    <polygon points="129,256 135,262 129,268 123,262" fill="${backgroundColor}" fill-opacity="0.72"/>
    <rect x="34" y="294" width="190" height="58" rx="16" fill="${backgroundColor}" fill-opacity="0.14" stroke="${backgroundColor}" stroke-opacity="0.32" stroke-width="1.2"/>
  </g>
  ${cornerBracketsMarkup(260, 32, 426, 376, 18, secondaryColor, 2.2, 'secondary')}
  <text data-field-id="roaster" data-max-width="168" x="129" y="323" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${roaster}
  </text>
  <text data-field-id="origin" data-max-width="380" x="473" y="106" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${origin}
  </text>
  <path d="M 320,148 H 626" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="473,142 479,148 473,154 467,148" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="283" y="172" width="380" height="48" rx="14" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.4" stroke-width="1.3" data-color-role="secondary"/>
  <text data-field-id="notes" data-max-width="354" x="473" y="196" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${notes}
  </text>
  <!-- Coffee roast level scale -->
  <rect x="330" y="242" width="286" height="46" rx="23" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <circle cx="381" cy="265" r="9" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="427" cy="265" r="9" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="473" cy="265" r="9" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="519" cy="265" r="9" fill="none" stroke="${primaryColor}" stroke-opacity="0.42" stroke-width="2"/>
  <circle cx="565" cy="265" r="9" fill="none" stroke="${primaryColor}" stroke-opacity="0.42" stroke-width="2"/>
  <rect x="293" y="314" width="360" height="50" rx="25" fill="${primaryColor}" fill-opacity="0.06" stroke="${primaryColor}" stroke-opacity="0.24" stroke-width="1.4"/>
  <text data-field-id="brewMethod" data-max-width="334" x="473" y="339" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${brewMethod}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_table_reserved',
    name: 'بطاقة حجز طاولة كافيه',
    nameEn: 'Cafe Table Reservation Card',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة طاولة محجوزة أنيقة للكافيهات والمطاعم الراقية',
    defaultWidth: 700,
    defaultHeight: 490,
    aspectRatio: 700 / 490,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 672, height: 462, rx: 22 },
    defaultColors: {
      primary: '#2B3A32',
      secondary: '#C59B5F',
      background: '#FBF8F1',
    },
    fields: [
      { id: 'cafeName', label: 'اسم الكافيه', type: 'text', defaultValue: 'كافيه الرصافة' },
      { id: 'title', label: 'حالة الطاولة', type: 'text', defaultValue: 'طاولة محجوزة' },
      {
        id: 'guestInfo',
        label: 'اسم الضيف والوقت',
        type: 'text',
        defaultValue: 'الأستاذ عمر الكيلاني • 7:30 مساءً',
      },
      { id: 'tableNo', label: 'رقم الطاولة', type: 'text', defaultValue: 'T-08' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const cafeName = escapeXml(fields.cafeName || 'كافيه الرصافة');
      const title = escapeXml(fields.title || 'طاولة محجوزة');
      const guestInfo = escapeXml(fields.guestInfo || 'الأستاذ عمر الكيلاني • 7:30 مساءً');
      const tableNo = escapeXml(fields.tableNo || 'T-08');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 490" width="700" height="490">
  <defs>
    <radialGradient id="cc02-g" cx="50%" cy="38%" r="58%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="672" height="462" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <rect x="28" y="28" width="644" height="434" rx="16" fill="url(#cc02-g)" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  ${cornerBracketsMarkup(44, 44, 612, 402, 24, primaryColor, 2.5, 'primary')}
  <rect x="235" y="64" width="230" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="cafeName" data-max-width="198" x="350" y="86" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${cafeName}
  </text>
  ${iconMarkup('coffee', 324, 126, 52, secondaryColor, 'secondary')}
  <text data-field-id="title" data-max-width="520" x="350" y="232" font-family="${fontFamily}, sans-serif" font-size="${Math.round(50 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${title}
  </text>
  <path d="M 150,280 H 550" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="350,274 356,280 350,286 344,280" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="96" y="302" width="508" height="48" rx="14" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.38" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="guestInfo" data-max-width="476" x="350" y="326" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${guestInfo}
  </text>
  <rect x="275" y="372" width="150" height="48" rx="24" fill="${secondaryColor}" fill-opacity="0.22" stroke="${primaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <text data-field-id="tableNo" data-max-width="120" x="350" y="396" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${tableNo}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_bakery_insert',
    name: 'بطاقة إرفاق المخبز الحِرفي',
    nameEn: 'Artisan Bakery Box Insert Card',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة دافئة توضع داخل علب المخبوزات والكرواسون مع نصيحة التسخين',
    defaultWidth: 720,
    defaultHeight: 440,
    aspectRatio: 720 / 440,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 692, height: 412, rx: 20 },
    defaultColors: {
      primary: '#5C3420',
      secondary: '#D9944A',
      background: '#FFF8ED',
    },
    fields: [
      { id: 'bakeryName', label: 'اسم المخبز', type: 'text', defaultValue: 'مخبز السنبلة الحِرفي' },
      {
        id: 'headline',
        label: 'العنوان الترحيبي',
        type: 'text',
        defaultValue: 'خُبزت طازجة هذا الصباح',
      },
      {
        id: 'careTip',
        label: 'تعليمات الحفظ والتسخين',
        type: 'text',
        defaultValue: 'سخّنها دقيقتين في الفرن لتستعيد قرمشتها',
      },
      { id: 'handle', label: 'حساب التواصل', type: 'text', defaultValue: '@SunbulaBakery.iq' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const bakeryName = escapeXml(fields.bakeryName || 'مخبز السنبلة الحِرفي');
      const headline = escapeXml(fields.headline || 'خُبزت طازجة هذا الصباح');
      const careTip = escapeXml(fields.careTip || 'سخّنها دقيقتين في الفرن لتستعيد قرمشتها');
      const handle = escapeXml(fields.handle || '@SunbulaBakery.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const sealPath = scallopCirclePath(120, 114, 52, 12, 1.12);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" width="720" height="440">
  <defs>
    <linearGradient id="cc03-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="692" height="412" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="28" y="28" width="664" height="384" rx="14" fill="url(#cc03-g)" stroke="${secondaryColor}" stroke-width="1.6" stroke-dasharray="8 6" data-color-role="secondary"/>
  <rect x="36" y="36" width="648" height="368" rx="10" fill="none" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1"/>
  <path d="${sealPath}" fill="${secondaryColor}" fill-opacity="0.25" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <!-- Croissant geometric illustration -->
  <path d="M 80,128 C 86,98 112,88 120,88 C 128,88 154,98 160,128 C 150,136 138,132 130,124 C 124,128 116,128 110,124 C 102,132 90,136 80,128 Z" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="2.4" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 108,94 L 113,124 M 132,94 L 127,124" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>
  <rect x="212" y="90" width="444" height="48" rx="24" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="bakeryName" data-max-width="408" x="434" y="114" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${bakeryName}
  </text>
  <text data-field-id="headline" data-max-width="580" x="360" y="210" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  <path d="M 110,252 H 610" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="360,246 366,252 360,258 354,252" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="76" y="272" width="568" height="54" rx="14" fill="${backgroundColor}" fill-opacity="0.72" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="careTip" data-max-width="536" x="360" y="299" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${careTip}
  </text>
  <rect x="230" y="346" width="260" height="42" rx="21" fill="${secondaryColor}" fill-opacity="0.24" stroke="${primaryColor}" stroke-width="1.6"/>
  <text data-field-id="handle" data-max-width="230" x="360" y="367" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_chef_special',
    name: 'بطاقة طبق الشيف اليومي',
    nameEn: 'Restaurant Chef Special Card',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة قائمة أنيقة لأطباق الشيف الخاصة والعروض اليومية في المطاعم',
    defaultWidth: 510,
    defaultHeight: 660,
    aspectRatio: 510 / 660,
    defaultMm: { width: 85, height: 110 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 482, height: 632, rx: 22 },
    defaultColors: {
      primary: '#1E242B',
      secondary: '#C8923E',
      background: '#FCF9F2',
    },
    fields: [
      { id: 'restaurant', label: 'اسم المطعم', type: 'text', defaultValue: 'مطعم شناشيل بغداد' },
      {
        id: 'dishName',
        label: 'اسم الطبق المميز',
        type: 'text',
        defaultValue: 'مسكوف دجلة بالتوابل',
      },
      {
        id: 'ingredients',
        label: 'المكونات والتفاصيل',
        type: 'text',
        defaultValue: 'سمك نهري طازج • تمر هندي • سماق • خبز تنور',
      },
      { id: 'price', label: 'السعر', type: 'text', defaultValue: '32,000 د.ع' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const restaurant = escapeXml(fields.restaurant || 'مطعم شناشيل بغداد');
      const dishName = escapeXml(fields.dishName || 'مسكوف دجلة بالتوابل');
      const ingredients = escapeXml(
        fields.ingredients || 'سمك نهري طازج • تمر هندي • سماق • خبز تنور',
      );
      const price = escapeXml(fields.price || '32,000 د.ع');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 660" width="510" height="660">
  <defs>
    <linearGradient id="cc04-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cc04-clip">
      <rect x="14" y="14" width="482" height="632" rx="22"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="482" height="632" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cc04-clip)">
    <path d="M 14,14 H 496 V 240 Q 255,286 14,240 Z" fill="${primaryColor}" data-color-role="primary"/>
    <path d="M 14,236 Q 255,282 496,236" fill="none" stroke="${secondaryColor}" stroke-width="4" data-color-role="secondary"/>
  </g>
  ${cornerBracketsMarkup(34, 290, 442, 336, 20, secondaryColor, 2, 'secondary')}
  <text data-field-id="restaurant" data-max-width="400" x="255" y="68" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${restaurant}
  </text>
  <!-- Cloche dome geometric vector -->
  <circle cx="255" cy="118" r="9" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 185,186 A 70,58 0 0,1 325,186 Z" fill="url(#cc04-g)" stroke="${backgroundColor}" stroke-width="2.5"/>
  <rect x="171" y="188" width="168" height="10" rx="5" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="dishName" data-max-width="400" x="255" y="344" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${dishName}
  </text>
  <path d="M 105,390 H 405" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="255,384 261,390 255,396 249,390" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="58" y="416" width="394" height="62" rx="14" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.38" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="ingredients" data-max-width="366" x="255" y="447" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${ingredients}
  </text>
  <rect x="135" y="514" width="240" height="58" rx="29" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="primary"/>
  <text data-field-id="price" data-max-width="206" x="255" y="543" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${price}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_herbal_apothecary',
    name: 'بطاقة صيدلية الأعشاب والشاي',
    nameEn: 'Tea & Herbal Apothecary Card',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة صيدلية أعشاب وشاي طبيعي بإطار عطاري دافئ ودليل التخمير',
    defaultWidth: 510,
    defaultHeight: 660,
    aspectRatio: 510 / 660,
    defaultMm: { width: 85, height: 110 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 482, height: 632, rx: 18 },
    defaultColors: {
      primary: '#294438',
      secondary: '#9C8A53',
      background: '#F7F3E7',
    },
    fields: [
      {
        id: 'apothecary',
        label: 'اسم العطارة أو الدار',
        type: 'text',
        defaultValue: 'عطارة ومشرب النهرين',
      },
      { id: 'blendName', label: 'اسم الخلطة', type: 'text', defaultValue: 'شاي الورد والبابونج' },
      {
        id: 'botanicals',
        label: 'المكونات النباتية',
        type: 'text',
        defaultValue: 'ورد محمدي • بابونج بري • نعناع عطري',
      },
      {
        id: 'steepGuide',
        label: 'إرشادات التحضير',
        type: 'text',
        defaultValue: 'نقع 4 دقائق • 90°C • خالٍ من الكافيين',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const apothecary = escapeXml(fields.apothecary || 'عطارة ومشرب النهرين');
      const blendName = escapeXml(fields.blendName || 'شاي الورد والبابونج');
      const botanicals = escapeXml(fields.botanicals || 'ورد محمدي • بابونج بري • نعناع عطري');
      const steepGuide = escapeXml(fields.steepGuide || 'نقع 4 دقائق • 90°C • خالٍ من الكافيين');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 660" width="510" height="660">
  <defs>
    <radialGradient id="cc05-g" cx="50%" cy="32%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="482" height="632" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2.2" data-color-role="background"/>
  <!-- Warm tactile apothecary double frame -->
  <rect x="28" y="28" width="454" height="604" rx="12" fill="url(#cc05-g)" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <rect x="38" y="38" width="434" height="584" rx="8" fill="none" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1"/>
  <!-- Apothecary jar + leaf emblem -->
  <rect x="225" y="96" width="60" height="16" rx="4" fill="${primaryColor}" data-color-role="primary"/>
  <rect x="206" y="116" width="98" height="96" rx="18" fill="${secondaryColor}" fill-opacity="0.18" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  ${iconMarkup('leaf', 231, 140, 48, secondaryColor, 'secondary')}
  <text data-field-id="apothecary" data-max-width="380" x="255" y="262" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${apothecary}
  </text>
  <path d="M 100,298 H 410" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="255,291 262,298 255,305 248,298" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="blendName" data-max-width="390" x="255" y="352" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${blendName}
  </text>
  <rect x="58" y="396" width="394" height="56" rx="14" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.4" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="botanicals" data-max-width="368" x="255" y="424" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${botanicals}
  </text>
  <!-- Steeping bar -->
  <rect x="76" y="484" width="358" height="62" rx="14" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="primary"/>
  <text data-field-id="steepGuide" data-max-width="328" x="255" y="515" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${steepGuide}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_matcha_bar',
    name: 'بطاقة ركن الماتشا الدائرية',
    nameEn: 'Artisan Matcha Bar Coaster Card',
    category: 'cafe',
    shape: 'circle',
    description: 'بطاقة وكوستر دائري لمشروبات الماتشا والشاي الأخضر بطبقات موجية',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 60, height: 60 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#224735',
      secondary: '#82AD77',
      background: '#F5FAF2',
    },
    fields: [
      {
        id: 'barName',
        label: 'اسم الركن / الكافيه',
        type: 'text',
        defaultValue: 'بار الماتشا الأخضر',
      },
      { id: 'drinkName', label: 'اسم المشروب', type: 'text', defaultValue: 'آيس ماتشا فانيليا' },
      {
        id: 'origin',
        label: 'المصدر والمدينة',
        type: 'text',
        defaultValue: 'درجة احتفالية • بغداد',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const barName = escapeXml(fields.barName || 'بار الماتشا الأخضر');
      const drinkName = escapeXml(fields.drinkName || 'آيس ماتشا فانيليا');
      const origin = escapeXml(fields.origin || 'درجة احتفالية • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="cc06-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.18"/>
    </linearGradient>
    <clipPath id="cc06-clip">
      <circle cx="240" cy="240" r="224"/>
    </clipPath>
  </defs>
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cc06-clip)">
    <path d="M 10,334 Q 120,294 240,330 T 470,322 V 470 H 10 Z" fill="url(#cc06-g)" data-color-role="secondary"/>
    <path d="M 10,366 Q 130,336 250,366 T 470,360 V 470 H 10 Z" fill="${primaryColor}" fill-opacity="0.1"/>
  </g>
  <circle cx="240" cy="240" r="215" fill="none" stroke="${primaryColor}" stroke-opacity="0.2" stroke-width="1"/>
  ${runningStitchCircle(240, 240, 206, secondaryColor, 2.2, '7 7')}
  <!-- Tea bowl + whisk -->
  <path d="M 192,130 H 288 L 274,174 A 34,20 0 0,1 206,174 Z" fill="${secondaryColor}" fill-opacity="0.3" stroke="${primaryColor}" stroke-width="2.5" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 240,86 V 130 M 228,94 L 236,130 M 252,94 L 244,130" stroke="${primaryColor}" stroke-width="2.2" stroke-linecap="round"/>
  <text data-field-id="barName" data-max-width="300" x="240" y="212" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${barName}
  </text>
  <text data-field-id="drinkName" data-max-width="340" x="240" y="266" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${drinkName}
  </text>
  <rect x="112" y="318" width="256" height="42" rx="21" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="primary"/>
  <text data-field-id="origin" data-max-width="226" x="240" y="339" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${origin}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_pastry_menu',
    name: 'بطاقة قائمة الحلويات الموسمية',
    nameEn: 'Patisserie Seasonal Menu Card',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة طاولة لعرض الحلويات الموسمية وأسعارها بالدينار العراقي',
    defaultWidth: 700,
    defaultHeight: 490,
    aspectRatio: 700 / 490,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 672, height: 462, rx: 22 },
    defaultColors: {
      primary: '#592B31',
      secondary: '#D98F70',
      background: '#FFF7F3',
    },
    fields: [
      {
        id: 'patisserie',
        label: 'اسم الباتيسري',
        type: 'text',
        defaultValue: 'باتيسري لؤلؤة الكرادة',
      },
      {
        id: 'seasonTag',
        label: 'عنوان القائمة',
        type: 'text',
        defaultValue: 'مختارات الحلويات الموسمية',
      },
      {
        id: 'itemOne',
        label: 'الصنف الأول والسعر',
        type: 'text',
        defaultValue: 'تارت الفستق والورد • 9,500 د.ع',
      },
      {
        id: 'itemTwo',
        label: 'الصنف الثاني والسعر',
        type: 'text',
        defaultValue: 'ميل فوي الكراميل • 8,000 د.ع',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const patisserie = escapeXml(fields.patisserie || 'باتيسري لؤلؤة الكرادة');
      const seasonTag = escapeXml(fields.seasonTag || 'مختارات الحلويات الموسمية');
      const itemOne = escapeXml(fields.itemOne || 'تارت الفستق والورد • 9,500 د.ع');
      const itemTwo = escapeXml(fields.itemTwo || 'ميل فوي الكراميل • 8,000 د.ع');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const badge = scallopCirclePath(112, 118, 56, 10, 1.12);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 490" width="700" height="490">
  <defs>
    <linearGradient id="cc07-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cc07-clip">
      <rect x="14" y="14" width="672" height="462" rx="22"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="672" height="462" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cc07-clip)">
    <rect x="14" y="14" width="672" height="16" fill="url(#cc07-g)"/>
    <rect x="14" y="460" width="672" height="16" fill="url(#cc07-g)"/>
  </g>
  <rect x="28" y="40" width="644" height="410" rx="16" fill="none" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.3" data-color-role="secondary"/>
  <path d="${badge}" fill="${secondaryColor}" fill-opacity="0.24" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <!-- Cake slice icon -->
  <polygon points="82,138 142,138 134,96 86,118" fill="${primaryColor}" fill-opacity="0.16" stroke="${primaryColor}" stroke-width="2.4" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 84,124 H 139" stroke="${secondaryColor}" stroke-width="3"/>
  <circle cx="114" cy="90" r="6" fill="${primaryColor}"/>
  <text data-field-id="patisserie" data-max-width="430" x="420" y="92" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${patisserie}
  </text>
  <text data-field-id="seasonTag" data-max-width="430" x="420" y="140" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${seasonTag}
  </text>
  <path d="M 210,182 H 630" stroke="${secondaryColor}" stroke-opacity="0.65" stroke-width="1.6" data-color-role="secondary"/>
  <polygon points="420,176 426,182 420,188 414,182" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="64" y="214" width="572" height="78" rx="16" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  <circle cx="88" cy="253" r="5" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="612" cy="253" r="5" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="itemOne" data-max-width="496" x="350" y="253" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${itemOne}
  </text>
  <rect x="64" y="314" width="572" height="78" rx="16" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  <circle cx="88" cy="353" r="5" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="612" cy="353" r="5" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="itemTwo" data-max-width="496" x="350" y="353" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${itemTwo}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_chocolate_tasting',
    name: 'بطاقة تذوق الشوكولاتة الحِرفية',
    nameEn: 'Craft Cacao Tasting Note Card',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة فاخرة للشوكولاتة الحِرفية مع مقياس التركيز الماسي',
    defaultWidth: 720,
    defaultHeight: 440,
    aspectRatio: 720 / 440,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 692, height: 412, rx: 20 },
    defaultColors: {
      primary: '#2A1916',
      secondary: '#C9985A',
      background: '#FBF5EC',
    },
    fields: [
      { id: 'brand', label: 'اسم الدار', type: 'text', defaultValue: 'دار الكاكاو البغدادي' },
      { id: 'barTitle', label: 'النوع والتركيز', type: 'text', defaultValue: 'شوكولاتة داكنة 75%' },
      {
        id: 'tastingNotes',
        label: 'إيحاءات النكهة',
        type: 'text',
        defaultValue: 'توت بري • لوز محمص • فانيليا ناعمة',
      },
      {
        id: 'batchInfo',
        label: 'رقم الدفعة',
        type: 'text',
        defaultValue: 'دفعة #204 • حبوب مفردة',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const brand = escapeXml(fields.brand || 'دار الكاكاو البغدادي');
      const barTitle = escapeXml(fields.barTitle || 'شوكولاتة داكنة 75%');
      const tastingNotes = escapeXml(fields.tastingNotes || 'توت بري • لوز محمص • فانيليا ناعمة');
      const batchInfo = escapeXml(fields.batchInfo || 'دفعة #204 • حبوب مفردة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" width="720" height="440">
  <defs>
    <linearGradient id="cc08-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="692" height="412" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="28" y="28" width="664" height="384" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  ${cornerBracketsMarkup(40, 40, 640, 360, 18, primaryColor, 1.8, 'primary')}
  <!-- Scored chocolate square icon -->
  <rect x="332" y="52" width="56" height="56" rx="8" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 360,52 V 108 M 332,80 H 388" stroke="${backgroundColor}" stroke-width="2"/>
  <text data-field-id="brand" data-max-width="460" x="360" y="138" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${brand}
  </text>
  <rect x="140" y="164" width="440" height="2.4" fill="url(#cc08-g)"/>
  <text data-field-id="barTitle" data-max-width="560" x="360" y="206" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${barTitle}
  </text>
  <!-- Intensity diamond bar -->
  <line x1="250" y1="256" x2="470" y2="256" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <polygon points="270,246 280,256 270,266 260,256" fill="${primaryColor}"/>
  <polygon points="315,246 325,256 315,266 305,256" fill="${primaryColor}"/>
  <polygon points="360,246 370,256 360,266 350,256" fill="${primaryColor}"/>
  <polygon points="405,246 415,256 405,266 395,256" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="450,246 460,256 450,266 440,256" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="2"/>
  <rect x="90" y="284" width="540" height="44" rx="12" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.38" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="tastingNotes" data-max-width="508" x="360" y="306" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${tastingNotes}
  </text>
  <rect x="210" y="346" width="300" height="40" rx="20" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="primary"/>
  <text data-field-id="batchInfo" data-max-width="270" x="360" y="366" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${batchInfo}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_luxury_oud',
    name: 'بطاقة العود والعطور الملكية',
    nameEn: 'Luxury Oud & Perfume Card',
    category: 'beauty',
    shape: 'rect',
    description: 'بطاقة عطور شرقية فاخرة بإطار قوس ذهبي ومؤشر هرم النوتات العطرية',
    defaultWidth: 510,
    defaultHeight: 660,
    aspectRatio: 510 / 660,
    defaultMm: { width: 85, height: 110 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 482, height: 632, rx: 18 },
    defaultColors: {
      primary: '#191614',
      secondary: '#B8893D',
      background: '#FAF5EB',
    },
    fields: [
      { id: 'house', label: 'دار العطور', type: 'text', defaultValue: 'دار بابل للعود والعطور' },
      { id: 'scentName', label: 'اسم العطر', type: 'text', defaultValue: 'مخلّط العنبر الملكي' },
      {
        id: 'scentNotes',
        label: 'النوتات العطرية',
        type: 'text',
        defaultValue: 'زعفران • ورد طائفي • عود معتّق',
      },
      {
        id: 'spec',
        label: 'التركيز والحجم',
        type: 'text',
        defaultValue: 'EXTRAIT DE PARFUM • 100 ML',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const house = escapeXml(fields.house || 'دار بابل للعود والعطور');
      const scentName = escapeXml(fields.scentName || 'مخلّط العنبر الملكي');
      const scentNotes = escapeXml(fields.scentNotes || 'زعفران • ورد طائفي • عود معتّق');
      const spec = escapeXml(fields.spec || 'EXTRAIT DE PARFUM • 100 ML');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 660" width="510" height="660">
  <defs>
    <linearGradient id="cc09-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="482" height="632" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2.2" data-color-role="background"/>
  <path d="M 42,614 V 188 Q 42,64 255,46 Q 468,64 468,188 V 614 Z" fill="none" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <path d="M 54,602 V 194 Q 54,80 255,62 Q 456,80 456,194 V 602 Z" fill="none" stroke="${primaryColor}" stroke-opacity="0.24" stroke-width="1"/>
  <!-- Crisp perfume flacon crest -->
  <rect x="239" y="100" width="32" height="18" rx="4" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="220" y="122" width="70" height="84" rx="14" fill="${secondaryColor}" fill-opacity="0.16" stroke="${primaryColor}" stroke-width="2.4" data-color-role="primary"/>
  <polygon points="255,142 271,164 255,186 239,164" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="house" data-max-width="360" x="255" y="244" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${house}
  </text>
  <rect x="95" y="274" width="320" height="2.5" fill="url(#cc09-g)"/>
  <text data-field-id="scentName" data-max-width="372" x="255" y="328" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${scentName}
  </text>
  <!-- Scent-note diamond bars -->
  <rect x="115" y="378" width="280" height="6" rx="3" fill="${secondaryColor}" fill-opacity="0.22"/>
  <rect x="115" y="378" width="230" height="6" rx="3" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="115,372 123,381 115,390 107,381" fill="${primaryColor}"/>
  <polygon points="255,372 263,381 255,390 247,381" fill="${primaryColor}"/>
  <polygon points="395,372 403,381 395,390 387,381" fill="${secondaryColor}"/>
  <text data-field-id="scentNotes" data-max-width="366" x="255" y="434" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${scentNotes}
  </text>
  <rect x="95" y="476" width="320" height="2.5" fill="url(#cc09-g)"/>
  <rect x="85" y="508" width="340" height="44" rx="22" fill="${primaryColor}" fill-opacity="0.06" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="spec" data-max-width="308" x="255" y="530" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="1.4" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${spec}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_skincare_routine',
    name: 'بطاقة روتين العناية الصباحي والمسائي',
    nameEn: 'Skincare AM/PM Routine Card',
    category: 'beauty',
    shape: 'rect',
    description:
      'بطاقة إرشادية أنيقة لروتين العناية بالبشرة صباحاً ومساءً لعيادات وبراندات التجميل',
    defaultWidth: 510,
    defaultHeight: 660,
    aspectRatio: 510 / 660,
    defaultMm: { width: 85, height: 110 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 482, height: 632, rx: 22 },
    defaultColors: {
      primary: '#2A4338',
      secondary: '#86A789',
      background: '#F4F8F4',
    },
    fields: [
      {
        id: 'brand',
        label: 'اسم البراند أو العيادة',
        type: 'text',
        defaultValue: 'نضارة سكين كير • أربيل',
      },
      { id: 'title', label: 'عنوان البطاقة', type: 'text', defaultValue: 'دليل الروتين اليومي' },
      {
        id: 'amSteps',
        label: 'روتين الصباح',
        type: 'text',
        defaultValue: 'صباحاً: غسول • سيروم C • واقي شمس',
      },
      {
        id: 'pmSteps',
        label: 'روتين المساء',
        type: 'text',
        defaultValue: 'مساءً: تونر لطيف • ريتينول • كريم ليلي',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const brand = escapeXml(fields.brand || 'نضارة سكين كير • أربيل');
      const title = escapeXml(fields.title || 'دليل الروتين اليومي');
      const amSteps = escapeXml(fields.amSteps || 'صباحاً: غسول • سيروم C • واقي شمس');
      const pmSteps = escapeXml(fields.pmSteps || 'مساءً: تونر لطيف • ريتينول • كريم ليلي');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const sunD = sunRaysPath(255, 236, 18, 28, 10, 0.3);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 660" width="510" height="660">
  <defs>
    <linearGradient id="cc10-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="482" height="632" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="30" y="30" width="450" height="600" rx="16" fill="url(#cc10-g)" stroke="${secondaryColor}" stroke-opacity="0.4" stroke-width="1.2"/>
  <rect x="125" y="56" width="260" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="brand" data-max-width="230" x="255" y="77" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${brand}
  </text>
  <text data-field-id="title" data-max-width="400" x="255" y="142" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${title}
  </text>
  <!-- AM card -->
  <rect x="46" y="192" width="418" height="178" rx="18" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <path d="${sunD}" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="255" cy="236" r="14" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 155,278 H 355" stroke="${secondaryColor}" stroke-opacity="0.5" stroke-width="1.4"/>
  <text data-field-id="amSteps" data-max-width="380" x="255" y="320" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${amSteps}
  </text>
  <!-- PM card -->
  <rect x="46" y="394" width="418" height="178" rx="18" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 262,420 A 20,20 0 1,0 278,454 A 15,15 0 1,1 262,420 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  ${iconMarkup('sparkle', 220, 424, 18, backgroundColor)}
  <path d="M 155,480 H 355" stroke="${backgroundColor}" stroke-opacity="0.32" stroke-width="1.4"/>
  <text data-field-id="pmSteps" data-max-width="380" x="255" y="522" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${pmSteps}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_salon_loyalty',
    name: 'بطاقة ولاء صالون التجميل',
    nameEn: 'Nail & Beauty Salon Loyalty Card',
    category: 'beauty',
    shape: 'rect',
    description: 'بطاقة ولاء بـ 6 خانات أختام لصالونات التجميل والعناية بالأظافر',
    defaultWidth: 720,
    defaultHeight: 440,
    aspectRatio: 720 / 440,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 692, height: 412, rx: 22 },
    defaultColors: {
      primary: '#5D2641',
      secondary: '#D49A9A',
      background: '#FFF7F6',
    },
    fields: [
      {
        id: 'salonName',
        label: 'اسم الصالون',
        type: 'text',
        defaultValue: 'صالون ليلاس للأظافر والجمال',
      },
      {
        id: 'rewardText',
        label: 'عرض الولاء',
        type: 'text',
        defaultValue: 'اجمعي 6 أختام لجلسة عناية مجانية',
      },
      {
        id: 'clientLine',
        label: 'اسم العميلة',
        type: 'text',
        defaultValue: 'العميلة: ............................',
      },
      { id: 'phone', label: 'رقم الحجز', type: 'text', defaultValue: '+964 770 412 8890' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const salonName = escapeXml(fields.salonName || 'صالون ليلاس للأظافر والجمال');
      const rewardText = escapeXml(fields.rewardText || 'اجمعي 6 أختام لجلسة عناية مجانية');
      const clientLine = escapeXml(fields.clientLine || 'العميلة: ............................');
      const phone = escapeXml(fields.phone || '+964 770 412 8890');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" width="720" height="440">
  <defs>
    <linearGradient id="cc11-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="692" height="412" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="28" y="28" width="664" height="384" rx="16" fill="url(#cc11-g)" stroke="${secondaryColor}" stroke-opacity="0.48" stroke-width="1.4" data-color-role="secondary"/>
  <!-- Nail polish crest -->
  <rect x="64" y="54" width="18" height="22" rx="3" fill="${primaryColor}" data-color-role="primary"/>
  <rect x="55" y="78" width="36" height="36" rx="8" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${iconMarkup('sparkle', 98, 56, 22, primaryColor, 'primary')}
  <text data-field-id="salonName" data-max-width="500" x="405" y="76" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${salonName}
  </text>
  <text data-field-id="rewardText" data-max-width="520" x="405" y="122" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${rewardText}
  </text>
  <!-- 6 stamp slots -->
  <circle cx="135" cy="216" r="34" fill="${primaryColor}" data-color-role="primary"/>
  ${iconMarkup('sparkle', 117, 198, 36, backgroundColor)}
  <circle cx="225" cy="216" r="34" fill="${primaryColor}" data-color-role="primary"/>
  ${iconMarkup('sparkle', 207, 198, 36, backgroundColor)}
  <circle cx="315" cy="216" r="34" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="2.2" stroke-dasharray="6 5"/>
  <circle cx="405" cy="216" r="34" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="2.2" stroke-dasharray="6 5"/>
  <circle cx="495" cy="216" r="34" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="2.2" stroke-dasharray="6 5"/>
  <circle cx="585" cy="216" r="34" fill="${secondaryColor}" fill-opacity="0.32" stroke="${primaryColor}" stroke-width="2.4"/>
  ${iconMarkup('heart', 569, 200, 32, primaryColor, 'primary')}
  <rect x="64" y="288" width="592" height="2" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="320" y="322" width="336" height="46" rx="14" fill="${backgroundColor}" fill-opacity="0.72" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="clientLine" data-max-width="304" x="488" y="345" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${clientLine}
  </text>
  <rect x="64" y="322" width="236" height="46" rx="23" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="phone" data-max-width="206" x="182" y="345" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${phone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_bridal_package',
    name: 'بطاقة أسعار باقة العروس',
    nameEn: 'Bridal Package Price Card',
    category: 'beauty',
    shape: 'rect',
    description: 'بطاقة عروض وأسعار باقات العرائس للاستوديوهات وصالونات التجميل',
    defaultWidth: 510,
    defaultHeight: 660,
    aspectRatio: 510 / 660,
    defaultMm: { width: 85, height: 110 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 482, height: 632, rx: 20 },
    defaultColors: {
      primary: '#572738',
      secondary: '#CFA27E',
      background: '#FFF9F5',
    },
    fields: [
      {
        id: 'studio',
        label: 'اسم الأتيليه أو الصالون',
        type: 'text',
        defaultValue: 'أتيليه ياسمين للعرائس',
      },
      {
        id: 'packageName',
        label: 'اسم الباقة',
        type: 'text',
        defaultValue: 'الباقة الملكية المتكاملة',
      },
      {
        id: 'services',
        label: 'الخدمات المشمولة',
        type: 'text',
        defaultValue: 'مكياج عروس • تسريحة • بشرة • أظافر',
      },
      {
        id: 'pricePhone',
        label: 'السعر ورقم الحجز',
        type: 'text',
        defaultValue: '350,000 د.ع  •  +964 780 551 2030',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const studio = escapeXml(fields.studio || 'أتيليه ياسمين للعرائس');
      const packageName = escapeXml(fields.packageName || 'الباقة الملكية المتكاملة');
      const services = escapeXml(fields.services || 'مكياج عروس • تسريحة • بشرة • أظافر');
      const pricePhone = escapeXml(fields.pricePhone || '350,000 د.ع  •  +964 780 551 2030');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 660" width="510" height="660">
  <defs>
    <radialGradient id="cc12-g" cx="50%" cy="28%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="482" height="632" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="30" y="30" width="450" height="600" rx="14" fill="url(#cc12-g)" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  ${cornerBracketsMarkup(46, 46, 418, 568, 22, primaryColor, 2, 'primary')}
  <!-- Tiara crown vector -->
  <path d="M 196,142 L 210,104 L 234,126 L 255,90 L 276,126 L 300,104 L 314,142 Z" fill="${secondaryColor}" fill-opacity="0.35" stroke="${primaryColor}" stroke-width="2.2" stroke-linejoin="round" data-color-role="secondary"/>
  <circle cx="255" cy="86" r="5" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="studio" data-max-width="370" x="255" y="188" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${studio}
  </text>
  <path d="M 110,226 H 400" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="255,220 261,226 255,232 249,226" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="packageName" data-max-width="380" x="255" y="286" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${packageName}
  </text>
  ${starRowMarkup(255, 344, 3, 28, 7, secondaryColor, 'secondary')}
  <rect x="58" y="382" width="394" height="64" rx="14" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.3" data-color-role="secondary"/>
  <text data-field-id="services" data-max-width="364" x="255" y="414" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${services}
  </text>
  <rect x="64" y="492" width="382" height="64" rx="32" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="primary"/>
  <text data-field-id="pricePhone" data-max-width="348" x="255" y="524" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${pricePhone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_candle_care',
    name: 'بطاقة العناية بالشموع اليدوية',
    nameEn: 'Handmade Candle Care Card',
    category: 'beauty',
    shape: 'square',
    description: 'بطاقة إرشادات العناية وإشعال الشموع المعطرة المرفقة مع الطلبات',
    defaultWidth: 540,
    defaultHeight: 540,
    aspectRatio: 1,
    defaultMm: { width: 75, height: 75 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 512, rx: 24 },
    defaultColors: {
      primary: '#422B1D',
      secondary: '#D28B4E',
      background: '#FFF7ED',
    },
    fields: [
      { id: 'studio', label: 'اسم البراند', type: 'text', defaultValue: 'شموع دجلة الحِرفية' },
      { id: 'title', label: 'عنوان البطاقة', type: 'text', defaultValue: 'دليل العناية بالشمعة' },
      {
        id: 'tips',
        label: 'نصائح الإشعال',
        type: 'text',
        defaultValue: 'قص الفتيل 5 مم • أول إشعال ساعتين لسطح متساوٍ',
      },
      { id: 'handle', label: 'حساب البراند', type: 'text', defaultValue: '@DijlahCandles.iq' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const studio = escapeXml(fields.studio || 'شموع دجلة الحِرفية');
      const title = escapeXml(fields.title || 'دليل العناية بالشمعة');
      const tips = escapeXml(fields.tips || 'قص الفتيل 5 مم • أول إشعال ساعتين لسطح متساوٍ');
      const handle = escapeXml(fields.handle || '@DijlahCandles.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 540" width="540" height="540">
  <defs>
    <radialGradient id="cc13-g" cx="50%" cy="28%" r="48%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="512" height="512" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="30" y="30" width="480" height="480" rx="18" fill="url(#cc13-g)" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  <rect x="40" y="40" width="460" height="460" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.2" stroke-width="1"/>
  <!-- Crisp geometric candle jar + flame -->
  ${iconMarkup('flame', 250, 60, 40, secondaryColor, 'secondary')}
  <line x1="270" y1="100" x2="270" y2="116" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round"/>
  <rect x="228" y="116" width="84" height="72" rx="12" fill="${secondaryColor}" fill-opacity="0.2" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  <rect x="234" y="136" width="72" height="44" rx="6" fill="${secondaryColor}" fill-opacity="0.4"/>
  <text data-field-id="studio" data-max-width="380" x="270" y="226" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${studio}
  </text>
  <text data-field-id="title" data-max-width="410" x="270" y="278" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${title}
  </text>
  <path d="M 110,318 H 430" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="270,312 276,318 270,324 264,318" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="54" y="340" width="432" height="58" rx="14" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.4" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="tips" data-max-width="400" x="270" y="369" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${tips}
  </text>
  <rect x="145" y="424" width="250" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="220" x="270" y="446" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_organic_soap',
    name: 'بطاقة مكونات الصابون العضوي',
    nameEn: 'Organic Soap Ingredients Card',
    category: 'beauty',
    shape: 'rect',
    description: 'بطاقة مكونات طبيعية لمنتجات الصابون اليدوي ومستحضرات الاستحمام العضوية',
    defaultWidth: 720,
    defaultHeight: 440,
    aspectRatio: 720 / 440,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 692, height: 412, rx: 18 },
    defaultColors: {
      primary: '#2F483A',
      secondary: '#8DA982',
      background: '#F5F6EC',
    },
    fields: [
      { id: 'maker', label: 'اسم المشغل', type: 'text', defaultValue: 'مشغل رحيق للصابون الطبيعي' },
      {
        id: 'soapName',
        label: 'اسم الصابون',
        type: 'text',
        defaultValue: 'صابون زيت الزيتون والغار',
      },
      {
        id: 'ingredients',
        label: 'المكونات الطبيعية',
        type: 'text',
        defaultValue: 'زيت زيتون بكر • زيت غار • زبدة الشيا • عسل',
      },
      {
        id: 'weight',
        label: 'الوزن وطريقة الصنع',
        type: 'text',
        defaultValue: '120 غرام • صُنع يدوياً على البارد',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const maker = escapeXml(fields.maker || 'مشغل رحيق للصابون الطبيعي');
      const soapName = escapeXml(fields.soapName || 'صابون زيت الزيتون والغار');
      const ingredients = escapeXml(
        fields.ingredients || 'زيت زيتون بكر • زيت غار • زبدة الشيا • عسل',
      );
      const weight = escapeXml(fields.weight || '120 غرام • صُنع يدوياً على البارد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" width="720" height="440">
  <defs>
    <linearGradient id="cc14-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.05"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="692" height="412" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="28" y="28" width="664" height="384" rx="12" fill="url(#cc14-g)" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  ${cornerBracketsMarkup(42, 42, 636, 356, 20, primaryColor, 2, 'primary')}
  <!-- Soap bar + botanical leaf -->
  <rect x="74" y="160" width="128" height="108" rx="22" fill="${secondaryColor}" fill-opacity="0.28" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  <rect x="92" y="178" width="92" height="72" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.5" stroke-width="1.6"/>
  ${iconMarkup('leaf', 118, 194, 40, primaryColor, 'primary')}
  <text data-field-id="maker" data-max-width="400" x="444" y="96" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${maker}
  </text>
  <text data-field-id="soapName" data-max-width="408" x="444" y="152" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${soapName}
  </text>
  <path d="M 244,192 H 644" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="444,186 450,192 444,198 438,192" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="236" y="214" width="416" height="56" rx="14" fill="${backgroundColor}" fill-opacity="0.68" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="ingredients" data-max-width="388" x="444" y="242" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${ingredients}
  </text>
  <rect x="274" y="296" width="340" height="46" rx="23" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="weight" data-max-width="310" x="444" y="319" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${weight}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_ceramic_craft',
    name: 'بطاقة الفخار والخزف اليدوي',
    nameEn: 'Handmade Ceramic Studio Tag Card',
    category: 'beauty',
    shape: 'circle',
    description: 'بطاقة خزف وفخار حِرفي دائرية لإرفاقها مع القطع المصنوعة يدوياً',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 60, height: 60 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#5C2F24',
      secondary: '#C97B59',
      background: '#FBF4EE',
    },
    fields: [
      { id: 'studio', label: 'اسم المشغل', type: 'text', defaultValue: 'خزف الرافدين اليدوي' },
      {
        id: 'craftNote',
        label: 'وصف القطعة',
        type: 'text',
        defaultValue: 'مشكّلة يدوياً على الدولاب',
      },
      { id: 'handle', label: 'حساب المشغل', type: 'text', defaultValue: '@RafidainClay.iq' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const studio = escapeXml(fields.studio || 'خزف الرافدين اليدوي');
      const craftNote = escapeXml(fields.craftNote || 'مشكّلة يدوياً على الدولاب');
      const handle = escapeXml(fields.handle || '@RafidainClay.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const innerScallop = scallopCirclePath(240, 240, 186, 16, 1.05);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="cc15-g" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <path d="${innerScallop}" fill="url(#cc15-g)" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  ${runningStitchCircle(240, 240, 210, primaryColor, 1.6, '5 6')}
  <!-- Crisp geometric ceramic vase -->
  <path d="M 222,104 H 258 L 252,126 C 276,140 282,170 268,196 H 212 C 198,170 204,140 228,126 Z" fill="${secondaryColor}" fill-opacity="0.35" stroke="${primaryColor}" stroke-width="2.5" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 212,162 Q 240,174 268,162" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <text data-field-id="studio" data-max-width="320" x="240" y="250" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${studio}
  </text>
  <text data-field-id="craftNote" data-max-width="300" x="240" y="298" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${craftNote}
  </text>
  <rect x="130" y="334" width="220" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="194" x="240" y="355" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_kids_bookmark',
    name: 'فاصل كتاب بطل القراءة',
    nameEn: 'Kids Reading Hero Bookmark Card',
    category: 'kids',
    shape: 'rect',
    description: 'فاصل كتب تعليمي ملون لتحفيز الأطفال على القراءة اليومية في المدارس والمكتبات',
    defaultWidth: 330,
    defaultHeight: 770,
    aspectRatio: 330 / 770,
    defaultMm: { width: 55, height: 128 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 302, height: 742, rx: 28 },
    defaultColors: {
      primary: '#264873',
      secondary: '#F09D49',
      background: '#FFF8EB',
    },
    fields: [
      { id: 'badgeTitle', label: 'اللقب', type: 'text', defaultValue: 'بطل القراءة' },
      { id: 'readerName', label: 'اسم القارئ', type: 'text', defaultValue: 'القارئة: مريم' },
      {
        id: 'motto',
        label: 'عبارة التحفيز',
        type: 'text',
        defaultValue: 'كل كتاب يفتح لك عالماً جديداً',
      },
      { id: 'school', label: 'المدرسة أو النادي', type: 'text', defaultValue: 'نادي قراء بغداد' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const badgeTitle = escapeXml(fields.badgeTitle || 'بطل القراءة');
      const readerName = escapeXml(fields.readerName || 'القارئة: مريم');
      const motto = escapeXml(fields.motto || 'كل كتاب يفتح لك عالماً جديداً');
      const school = escapeXml(fields.school || 'نادي قراء بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 770" width="330" height="770">
  <defs>
    <linearGradient id="cc16-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.16"/>
    </linearGradient>
    <clipPath id="cc16-clip">
      <rect x="14" y="14" width="302" height="742" rx="28"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="302" height="742" rx="28" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cc16-clip)">
    <path d="M 14,586 Q 95,548 170,584 T 316,574 V 756 H 14 Z" fill="url(#cc16-g)" data-color-role="secondary"/>
    <path d="M 14,642 Q 95,612 170,640 T 316,632 V 756 H 14 Z" fill="${primaryColor}" fill-opacity="0.14"/>
  </g>
  <rect x="28" y="28" width="274" height="714" rx="20" fill="none" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.4" data-color-role="secondary"/>
  <!-- Ribbon punch hole -->
  <circle cx="165" cy="58" r="20" fill="none" stroke="${secondaryColor}" stroke-opacity="0.55" stroke-width="1.6"/>
  <circle cx="165" cy="58" r="14" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="2.5"/>
  <!-- Open book geometric vector -->
  <path d="M 88,154 Q 126,138 165,158 Q 204,138 242,154 V 230 Q 204,214 165,232 Q 126,214 88,230 Z" fill="${secondaryColor}" fill-opacity="0.25" stroke="${primaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="primary"/>
  <line x1="165" y1="158" x2="165" y2="232" stroke="${primaryColor}" stroke-width="2.5"/>
  <text data-field-id="badgeTitle" data-max-width="246" x="165" y="294" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${badgeTitle}
  </text>
  ${starRowMarkup(165, 352, 5, 38, 12, secondaryColor, 'secondary')}
  <rect x="48" y="400" width="234" height="52" rx="26" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="readerName" data-max-width="206" x="165" y="426" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${readerName}
  </text>
  <rect x="38" y="476" width="254" height="52" rx="14" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="motto" data-max-width="230" x="165" y="502" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${motto}
  </text>
  <rect x="45" y="664" width="240" height="44" rx="22" fill="${backgroundColor}" fill-opacity="0.86" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="1.4"/>
  <text data-field-id="school" data-max-width="212" x="165" y="686" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${school}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_kids_subject',
    name: 'بطاقة فاصل المواد الدراسية',
    nameEn: 'Kids School Subject Divider Card',
    category: 'kids',
    shape: 'rect',
    description: 'بطاقة تعريفية ملونة لدفاتر ومواد المدرسة بتصميم مبهج وخط واضح',
    defaultWidth: 700,
    defaultHeight: 490,
    aspectRatio: 700 / 490,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 672, height: 462, rx: 24 },
    defaultColors: {
      primary: '#2A596D',
      secondary: '#E8A54B',
      background: '#F4FAFC',
    },
    fields: [
      { id: 'subject', label: 'المادة الدراسية', type: 'text', defaultValue: 'العلوم والرياضيات' },
      { id: 'studentName', label: 'اسم الطالب/ة', type: 'text', defaultValue: 'الطالب: زيد حيدر' },
      {
        id: 'grade',
        label: 'الصف والشعبة',
        type: 'text',
        defaultValue: 'الصف الرابع الابتدائي • أ',
      },
      { id: 'year', label: 'السنة الدراسية', type: 'text', defaultValue: '2026 - 2027' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const subject = escapeXml(fields.subject || 'العلوم والرياضيات');
      const studentName = escapeXml(fields.studentName || 'الطالب: زيد حيدر');
      const grade = escapeXml(fields.grade || 'الصف الرابع الابتدائي • أ');
      const year = escapeXml(fields.year || '2026 - 2027');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 490" width="700" height="490">
  <defs>
    <linearGradient id="cc17-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.08"/>
    </linearGradient>
    <clipPath id="cc17-clip">
      <rect x="14" y="14" width="672" height="462" rx="24"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="672" height="462" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cc17-clip)">
    <path d="M 14,358 Q 180,318 350,356 T 686,348 V 476 H 14 Z" fill="url(#cc17-g)" data-color-role="secondary"/>
    <rect x="14" y="14" width="672" height="106" fill="${primaryColor}" data-color-role="primary"/>
    <rect x="14" y="114" width="672" height="6" fill="${secondaryColor}" data-color-role="secondary"/>
  </g>
  <!-- Crisp geometric pencil + triangle ruler -->
  <polygon points="74,244 134,184 152,202 92,262 68,268" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="2.4" stroke-linejoin="round" data-color-role="secondary"/>
  <polygon points="84,306 164,306 84,226" fill="none" stroke="${primaryColor}" stroke-width="2.6" stroke-linejoin="round" data-color-role="primary"/>
  <text data-field-id="subject" data-max-width="580" x="350" y="64" font-family="${fontFamily}, sans-serif" font-size="${Math.round(37 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${subject}
  </text>
  <text data-field-id="studentName" data-max-width="410" x="424" y="196" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${studentName}
  </text>
  <path d="M 224,238 H 624" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <polygon points="424,232 430,238 424,244 418,238" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="224" y="262" width="400" height="54" rx="14" fill="${backgroundColor}" fill-opacity="0.72" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.3" data-color-role="secondary"/>
  <text data-field-id="grade" data-max-width="370" x="424" y="289" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${grade}
  </text>
  <rect x="270" y="392" width="160" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="year" data-max-width="134" x="350" y="414" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${year}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_kids_party_ticket',
    name: 'تذكرة حفلة أطفال مخرّمة',
    nameEn: 'Kids Party Pass Ticket Card',
    category: 'kids',
    shape: 'rect',
    description: 'تذكرة دعوة لحفلات الأطفال والأعياد بتثقيب جانبي ونجوم احتفالية',
    defaultWidth: 720,
    defaultHeight: 420,
    aspectRatio: 720 / 420,
    defaultMm: { width: 108, height: 63 },
    cutShape: { kind: 'path', d: ticketStubPath(14, 14, 692, 392, 24, 18, 0.5) },
    defaultColors: {
      primary: '#4A367A',
      secondary: '#EC9A43',
      background: '#FBF6FF',
    },
    fields: [
      {
        id: 'eventTitle',
        label: 'عنوان الحفلة',
        type: 'text',
        defaultValue: 'تذكرة حفلة عيد الميلاد',
      },
      {
        id: 'guestName',
        label: 'اسم الطفل المدعو',
        type: 'text',
        defaultValue: 'البطل المدعو: أمير',
      },
      {
        id: 'details',
        label: 'التاريخ والمكان',
        type: 'text',
        defaultValue: 'الجمعة 5:00 عصراً • قاعة بغداد',
      },
      { id: 'ticketCode', label: 'رقم التذكرة', type: 'text', defaultValue: 'VIP #07' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const eventTitle = escapeXml(fields.eventTitle || 'تذكرة حفلة عيد الميلاد');
      const guestName = escapeXml(fields.guestName || 'البطل المدعو: أمير');
      const details = escapeXml(fields.details || 'الجمعة 5:00 عصراً • قاعة بغداد');
      const ticketCode = escapeXml(fields.ticketCode || 'VIP #07');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const stubPath = ticketStubPath(14, 14, 692, 392, 24, 18, 0.5);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 420" width="720" height="420">
  <defs>
    <linearGradient id="cc18-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.1"/>
    </linearGradient>
  </defs>
  <path d="${stubPath}" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <path d="${stubPath}" fill="url(#cc18-g)"/>
  <!-- Perforated tear line -->
  <line x1="518" y1="34" x2="518" y2="386" stroke="${primaryColor}" stroke-opacity="0.45" stroke-width="2.5" stroke-dasharray="8 8"/>
  <!-- Confetti dots & balloon in stub -->
  <ellipse cx="604" cy="148" rx="34" ry="42" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="secondary"/>
  <path d="M 604,190 Q 594,214 606,236" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
  <circle cx="560" cy="96" r="6" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="652" cy="108" r="5" fill="${secondaryColor}"/>
  <text data-field-id="eventTitle" data-max-width="420" x="275" y="96" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${eventTitle}
  </text>
  ${starRowMarkup(275, 150, 5, 42, 11, secondaryColor, 'secondary')}
  <rect x="71" y="194" width="408" height="64" rx="32" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="guestName" data-max-width="370" x="275" y="226" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${guestName}
  </text>
  <rect x="71" y="286" width="408" height="54" rx="14" fill="${backgroundColor}" fill-opacity="0.72" stroke="${secondaryColor}" stroke-opacity="0.48" stroke-width="1.3" data-color-role="secondary"/>
  <text data-field-id="details" data-max-width="378" x="275" y="313" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${details}
  </text>
  <rect x="544" y="280" width="120" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="ticketCode" data-max-width="100" x="604" y="302" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${ticketCode}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_kids_chore_chart',
    name: 'بطاقة جدول المهام والنجوم',
    nameEn: 'Kids Chore & Star Chart Card',
    category: 'kids',
    shape: 'rect',
    description: 'لوحة تحفيزية يومية لتشجيع الأطفال على إنجاز مهامهم وجمع النجوم الذهبية',
    defaultWidth: 510,
    defaultHeight: 660,
    aspectRatio: 510 / 660,
    defaultMm: { width: 85, height: 110 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 482, height: 632, rx: 24 },
    defaultColors: {
      primary: '#2B5B6C',
      secondary: '#E5A33A',
      background: '#FFFDF5',
    },
    fields: [
      { id: 'title', label: 'عنوان اللوحة', type: 'text', defaultValue: 'جدول نجوم البطل' },
      { id: 'childName', label: 'اسم البطل', type: 'text', defaultValue: 'البطل: علي' },
      {
        id: 'goalText',
        label: 'المهام اليومية',
        type: 'text',
        defaultValue: 'ترتيب السرير • الواجب • مساعدة العائلة',
      },
      {
        id: 'reward',
        label: 'الجائزة الكبرى',
        type: 'text',
        defaultValue: 'المكافأة: رحلة نهاية الأسبوع',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const title = escapeXml(fields.title || 'جدول نجوم البطل');
      const childName = escapeXml(fields.childName || 'البطل: علي');
      const goalText = escapeXml(fields.goalText || 'ترتيب السرير • الواجب • مساعدة العائلة');
      const reward = escapeXml(fields.reward || 'المكافأة: رحلة نهاية الأسبوع');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 660" width="510" height="660">
  <defs>
    <linearGradient id="cc19-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.1"/>
    </linearGradient>
    <clipPath id="cc19-clip">
      <rect x="14" y="14" width="482" height="632" rx="24"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="482" height="632" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cc19-clip)">
    <path d="M 14,508 Q 140,464 255,504 T 496,496 V 646 H 14 Z" fill="url(#cc19-g)" data-color-role="secondary"/>
  </g>
  <rect x="28" y="28" width="454" height="604" rx="18" fill="none" stroke="${secondaryColor}" stroke-opacity="0.38" stroke-width="1.3"/>
  <!-- Geometric trophy cup -->
  <path d="M 215,62 H 295 V 104 A 40,40 0 0,1 215,104 Z" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="secondary"/>
  <path d="M 215,72 H 196 Q 190,98 215,102 M 295,72 H 314 Q 320,98 295,102" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
  <rect x="247" y="142" width="16" height="22" fill="${primaryColor}"/>
  <rect x="225" y="164" width="60" height="12" rx="6" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="title" data-max-width="400" x="255" y="218" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${title}
  </text>
  <rect x="115" y="256" width="280" height="48" rx="24" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="childName" data-max-width="250" x="255" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${childName}
  </text>
  <text data-field-id="goalText" data-max-width="410" x="255" y="346" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${goalText}
  </text>
  <!-- Twin star rows for progress tracking -->
  <rect x="58" y="388" width="394" height="114" rx="18" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${starRowMarkup(255, 422, 5, 64, 18, secondaryColor, 'secondary')}
  ${starRowMarkup(255, 470, 5, 64, 18, primaryColor, 'primary')}
  <rect x="64" y="544" width="382" height="54" rx="27" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="primary"/>
  <text data-field-id="reward" data-max-width="348" x="255" y="571" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${reward}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_crf_kids_flashcard',
    name: 'بطاقة تعليمية ذكية للأطفال',
    nameEn: 'Kids Smart Educational Flashcard',
    category: 'kids',
    shape: 'rect',
    description: 'بطاقة فلاش تعليمية ملونة للعلوم واللغات بتصميم تفاعلي واضح',
    defaultWidth: 720,
    defaultHeight: 440,
    aspectRatio: 720 / 440,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 692, height: 412, rx: 24 },
    defaultColors: {
      primary: '#2F4580',
      secondary: '#F09D42',
      background: '#F4F7FF',
    },
    fields: [
      { id: 'topicTag', label: 'التصنيف', type: 'text', defaultValue: 'بطاقة ذكاء • علوم' },
      { id: 'mainWord', label: 'المفهوم الأساسي', type: 'text', defaultValue: 'المجموعة الشمسية' },
      {
        id: 'factText',
        label: 'المعلومة المبسطة',
        type: 'text',
        defaultValue: 'تدور الكواكب الثمانية حول الشمس في مدارات ثابتة',
      },
      { id: 'level', label: 'المستوى', type: 'text', defaultValue: 'المستوى 2' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const topicTag = escapeXml(fields.topicTag || 'بطاقة ذكاء • علوم');
      const mainWord = escapeXml(fields.mainWord || 'المجموعة الشمسية');
      const factText = escapeXml(
        fields.factText || 'تدور الكواكب الثمانية حول الشمس في مدارات ثابتة',
      );
      const level = escapeXml(fields.level || 'المستوى 2');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const badge = scallopCirclePath(118, 110, 50, 10, 1.12);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 440" width="720" height="440">
  <defs>
    <linearGradient id="cc20-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="692" height="412" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <rect x="28" y="28" width="664" height="384" rx="18" fill="url(#cc20-g)" stroke="${secondaryColor}" stroke-width="1.8" stroke-dasharray="10 6" data-color-role="secondary"/>
  <path d="${badge}" fill="${secondaryColor}" fill-opacity="0.3" stroke="${primaryColor}" stroke-width="2" data-color-role="secondary"/>
  <!-- Orbit + planet geometric illustration -->
  <ellipse cx="118" cy="110" rx="32" ry="13" transform="rotate(-24 118 110)" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
  <circle cx="118" cy="110" r="15" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="146" cy="96" r="5" fill="${secondaryColor}"/>
  <rect x="270" y="62" width="300" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="topicTag" data-max-width="268" x="420" y="83" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${topicTag}
  </text>
  <text data-field-id="mainWord" data-max-width="430" x="420" y="160" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${mainWord}
  </text>
  ${starRowMarkup(420, 212, 3, 34, 9, secondaryColor, 'secondary')}
  <rect x="76" y="250" width="568" height="58" rx="14" fill="${backgroundColor}" fill-opacity="0.72" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="1.3" data-color-role="secondary"/>
  <text data-field-id="factText" data-max-width="536" x="360" y="279" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${factText}
  </text>
  <rect x="270" y="336" width="180" height="42" rx="21" fill="${secondaryColor}" fill-opacity="0.28" stroke="${primaryColor}" stroke-width="1.8"/>
  <text data-field-id="level" data-max-width="150" x="360" y="357" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${level}
  </text>
</svg>`;
    },
  },
];
