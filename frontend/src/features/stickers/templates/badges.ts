import { scallopCirclePath, starPoints } from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

function laurelSprig(x: number, y: number, color: string, mirrored = false): string {
  return `<g transform="translate(${x} ${y}) scale(${mirrored ? -1 : 1} 1)" fill="${color}" data-color-role="primary">
    <path d="M 0,56 C -30,26 -36,-18 -14,-54" fill="none" stroke="${color}" stroke-width="2"/>
    <path d="M -9,44 Q -36,42 -38,19 Q -16,23 -9,44 Z M -22,23 Q -49,14 -43,-7 Q -24,1 -22,23 Z M -28,0 Q -48,-17 -36,-35 Q -22,-19 -28,0 Z M -25,-24 Q -34,-49 -16,-61 Q -10,-40 -25,-24 Z M -6,43 Q -14,19 2,8 Q 10,30 -6,43 Z M -21,18 Q -24,-6 -5,-15 Q -4,7 -21,18 Z M -26,-9 Q -22,-34 -5,-37 Q -7,-16 -26,-9 Z"/>
  </g>`;
}

export const BADGE_TEMPLATES: StickerTemplate[] = [
  {
    id: 'seal_gold_guarantee',
    name: 'ختم الضمان الذهبي',
    nameEn: 'Gold Guarantee Seal',
    category: 'badges',
    description: 'ختم تجاري ذهبي دائري مسنن للضمان المعتمد والأصالة 100%',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 100, height: 100 },
    defaultColors: {
      primary: '#A77B36',
      secondary: '#3B3021',
      background: '#FCF7E9',
    },
    fields: [
      { id: 'topText', label: 'النص العلوي', type: 'text', defaultValue: '★ أصلي ومضمون ★' },
      { id: 'centerText', label: 'النص الرئيسي', type: 'text', defaultValue: '100%' },
      { id: 'bottomText', label: 'النص السفلي', type: 'text', defaultValue: 'ضمان ذهبي معتمد' },
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
      const bg = isTransparent ? 'none' : backgroundColor;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="gold-rim" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${secondaryColor}"/><stop offset="0.3" stop-color="${primaryColor}"/>
      <stop offset="0.5" stop-color="${backgroundColor}"/><stop offset="0.7" stop-color="${primaryColor}"/><stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <path d="${scallopCirclePath(250, 250, 225, 36, 1.065)} M 461,250 A 211,211 0 1,0 39,250 A 211,211 0 1,0 461,250 Z" fill="url(#gold-rim)" fill-rule="evenodd" data-color-role="primary"/>
  <circle cx="250" cy="250" r="211" fill="${bg}" data-color-role="background"/>
  <circle cx="250" cy="250" r="202" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
  <circle cx="250" cy="250" r="193" fill="none" stroke="${primaryColor}" stroke-width="1" stroke-dasharray="1 7" stroke-linecap="round"/>
  ${laurelSprig(134, 275, primaryColor)}
  ${laurelSprig(366, 275, primaryColor, true)}
  <path d="M 213,104 H 238 M 262,104 H 287" stroke="${primaryColor}" stroke-width="1.5"/>
  <polygon points="${starPoints(250, 104, 4, 10, 3.5)}" fill="${primaryColor}"/>
  <text data-field-id="topText" data-max-width="280" x="250" y="157" font-family="${fontFamily}, sans-serif" font-size="${22 * fontScale}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.topText || '★ أصلي ومضمون ★')}</text>
  <text data-field-id="centerText" data-max-width="242" x="250" y="277" font-family="${fontFamily}, sans-serif" font-size="${78 * fontScale}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.centerText || '100%')}</text>
  <path d="M 199,310 H 301" stroke="${primaryColor}" stroke-width="1.5"/>
  <text data-field-id="bottomText" data-max-width="276" x="250" y="356" font-family="${fontFamily}, sans-serif" font-size="${21 * fontScale}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.bottomText || 'ضمان ذهبي معتمد')}</text>
  <circle cx="250" cy="390" r="3" fill="${primaryColor}"/>
</svg>`;
    },
  },
  {
    id: 'seal_premium_ribbon',
    name: 'شريط الفخامة والتميز',
    nameEn: 'Premium Ribbon Seal',
    category: 'badges',
    description: 'شارة ملوكية أنيقة مع وشاح سفلي للمنتجات الراقية',
    defaultWidth: 500,
    defaultHeight: 560,
    aspectRatio: 500 / 560,
    defaultMm: { width: 100, height: 112 },
    defaultColors: {
      primary: '#A98552',
      secondary: '#233F40',
      background: '#FAF7EF',
    },
    fields: [
      { id: 'ribbonText', label: 'نص الوشاح', type: 'text', defaultValue: 'جودة ممتازة' },
      { id: 'mainText', label: 'النص الأوسط', type: 'text', defaultValue: 'PREMIUM' },
      { id: 'subText', label: 'النص الفرعي', type: 'text', defaultValue: 'مختار بعناية فائقة' },
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
      const bg = isTransparent ? 'none' : backgroundColor;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 560" width="500" height="560">
  <path d="M 144,326 L 102,513 L 166,484 L 202,529 L 242,342 Z M 356,326 L 398,513 L 334,484 L 298,529 L 258,342 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 156,356 L 130,486 M 195,362 L 175,471 M 344,356 L 370,486 M 305,362 L 325,471" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <circle cx="250" cy="222" r="184" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="250" cy="222" r="171" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 111,205 A 141,141 0 0,1 389,205" fill="none" stroke="${primaryColor}" stroke-width="1"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <polygon points="${starPoints(250, 117, 4, 19, 7)}"/>
    <polygon points="${starPoints(213, 130, 4, 8, 3)}"/>
    <polygon points="${starPoints(287, 130, 4, 8, 3)}"/>
  </g>
  <text data-field-id="mainText" data-max-width="282" x="250" y="221" font-family="${fontFamily}, sans-serif" font-size="${42 * fontScale}" font-weight="800" letter-spacing="3" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.mainText || 'PREMIUM')}</text>
  <text data-field-id="subText" data-max-width="268" x="250" y="268" font-family="${fontFamily}, sans-serif" font-size="${19 * fontScale}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.subText || 'مختار بعناية فائقة')}</text>
  <path d="M 191,295 H 237 M 263,295 H 309" stroke="${primaryColor}" stroke-width="1.5"/>
  <circle cx="250" cy="295" r="3" fill="${primaryColor}"/>
  <path d="M 41,349 H 110 V 417 H 41 L 59,383 Z M 459,349 H 390 V 417 H 459 L 441,383 Z" fill="${secondaryColor}"/>
  <path d="M 75,397 L 110,417 V 397 Z M 425,397 L 390,417 V 397 Z" fill="${primaryColor}"/>
  <rect x="75" y="333" width="350" height="64" rx="3" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 88,342 H 412 M 88,388 H 412" stroke="${primaryColor}" stroke-width="1"/>
  <text data-field-id="ribbonText" data-max-width="304" x="250" y="376" font-family="${fontFamily}, sans-serif" font-size="${25 * fontScale}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">${escapeXml(fields.ribbonText || 'جودة ممتازة')}</text>
</svg>`;
    },
  },
  {
    id: 'seal_handmade_craft',
    name: 'صنع يدوياً بحب',
    nameEn: 'Handmade Craft',
    category: 'badges',
    description: 'ملصق للأعمال اليدوية والمتاجر الحرفية والعائلية',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 96, height: 96 },
    defaultColors: {
      primary: '#A45D4E',
      secondary: '#563C35',
      background: '#FBF3EA',
    },
    fields: [
      { id: 'craftText', label: 'النص الرئيسي', type: 'text', defaultValue: 'صُنع يدوياً بحب' },
      { id: 'storeName', label: 'اسم المتجر أو الصانع', type: 'text', defaultValue: 'حِرف وأصالة' },
      {
        id: 'tagline',
        label: 'الشعار اللطيف',
        type: 'text',
        defaultValue: 'قطعة فريدة صُممت لأجلك',
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
      const bg = isTransparent ? 'none' : backgroundColor;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <rect x="23" y="23" width="434" height="434" rx="92" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="35" y="35" width="410" height="410" rx="82" fill="none" stroke="${primaryColor}" stroke-width="1.4" stroke-dasharray="3 7" stroke-linecap="round"/>
  <path d="M 240,113 C 212,76 171,97 176,132 C 181,165 219,184 240,200 C 261,184 299,165 304,132 C 309,97 268,76 240,113 Z" fill="${primaryColor}" fill-opacity="0.12"/>
  <path d="M 240,126 C 219,95 190,108 192,132 C 194,154 222,172 240,186 C 258,172 286,154 288,132 C 290,108 261,95 240,126 Z" fill="none" stroke="${primaryColor}" stroke-width="3" data-color-role="primary"/>
  <path d="M 240,186 C 207,221 170,185 153,202 C 142,214 165,224 178,210 M 260,114 L 300,78 M 294,83 L 300,78" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
  <ellipse cx="298" cy="80" rx="2.5" ry="5" transform="rotate(47 298 80)" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 121,139 L 129,146 M 134,116 L 140,126 M 346,162 L 356,158 M 342,184 L 350,188" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
  <text data-field-id="craftText" data-max-width="344" x="240" y="281" font-family="${fontFamily}, sans-serif" font-size="${34 * fontScale}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.craftText || 'صُنع يدوياً بحب')}</text>
  <text data-field-id="storeName" data-max-width="320" x="240" y="331" font-family="${fontFamily}, sans-serif" font-size="${23 * fontScale}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${escapeXml(fields.storeName || 'حِرف وأصالة')}</text>
  <path d="M 216,355 H 264" stroke="${primaryColor}" stroke-width="1.5"/>
  <text data-field-id="tagline" data-max-width="324" x="240" y="390" font-family="${fontFamily}, sans-serif" font-size="${17 * fontScale}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.tagline || 'قطعة فريدة صُممت لأجلك')}</text>
</svg>`;
    },
  },
  {
    id: 'seal_organic_natural',
    name: 'منتج عضوي طبيعي 100%',
    nameEn: '100% Organic Natural',
    category: 'badges',
    description: 'ملصق للمنتجات الغذائية الطبيعية، العسل، والمستحضرات العضوية',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 96, height: 96 },
    defaultColors: {
      primary: '#587451',
      secondary: '#2D4638',
      background: '#F6F5E9',
    },
    fields: [
      { id: 'title', label: 'العنوان الرئيسي', type: 'text', defaultValue: '100% طبيعي' },
      {
        id: 'subtitle',
        label: 'الوصف العضوي',
        type: 'text',
        defaultValue: 'عضوي وخالٍ من الإضافات',
      },
      {
        id: 'source',
        label: 'مصدر المكونات',
        type: 'text',
        defaultValue: 'مستخلص من الطبيعة النقية',
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
      const bg = isTransparent ? 'none' : backgroundColor;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="220" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 65,200 A 180,180 0 0,1 415,200 M 77,316 A 180,180 0 0,0 403,316" fill="none" stroke="${primaryColor}" stroke-width="1"/>
  <circle cx="68" cy="285" r="3" fill="${primaryColor}"/><circle cx="412" cy="285" r="3" fill="${primaryColor}"/>
  <path d="M 238,219 C 226,174 247,139 269,97" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M 239,183 C 191,190 167,163 169,131 C 207,128 236,146 239,183 Z"/>
    <path d="M 246,158 C 251,112 281,101 315,112 C 304,148 282,166 246,158 Z" fill-opacity="0.75"/>
    <path d="M 262,115 C 240,98 244,73 264,57 C 286,77 286,99 262,115 Z"/>
  </g>
  <path d="M 185,143 Q 209,157 238,183 M 247,158 Q 278,140 300,123 M 263,74 L 262,114" fill="none" stroke="${backgroundColor}" stroke-width="1.5" stroke-linecap="round"/>
  <text data-field-id="title" data-max-width="314" x="240" y="278" font-family="${fontFamily}, sans-serif" font-size="${39 * fontScale}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.title || '100% طبيعي')}</text>
  <text data-field-id="subtitle" data-max-width="316" x="240" y="325" font-family="${fontFamily}, sans-serif" font-size="${21 * fontScale}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${escapeXml(fields.subtitle || 'عضوي وخالٍ من الإضافات')}</text>
  <text data-field-id="source" data-max-width="288" x="240" y="368" font-family="${fontFamily}, sans-serif" font-size="${16 * fontScale}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.source || 'مستخلص من الطبيعة النقية')}</text>
</svg>`;
    },
  },
  {
    id: 'seal_sale_burst',
    name: 'نجمة العروض والتخفيضات',
    nameEn: 'Super Sale Burst',
    category: 'badges',
    description: 'ملصق عروض ترويجية ناري جاذب للانتباه على العبوات والمنتجات',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 96, height: 96 },
    defaultColors: {
      primary: '#B73C43',
      secondary: '#F6DAA1',
      background: '#FFF8EE',
    },
    fields: [
      { id: 'saleBadge', label: 'شارة الخصم', type: 'text', defaultValue: 'خصم خاص' },
      { id: 'salePercent', label: 'نسبة التخفيض', type: 'text', defaultValue: '50%' },
      { id: 'salePeriod', label: 'فترة العرض', type: 'text', defaultValue: 'لفترة محدودة' },
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
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <polygon points="${starPoints(240, 240, 18, 225, 201)}" fill="${isTransparent ? 'none' : primaryColor}" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <circle cx="240" cy="240" r="184" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <path d="M 97,225 V 253 M 383,225 V 253" stroke="${secondaryColor}" stroke-width="2"/>
  <rect x="161" y="104" width="158" height="40" rx="20" fill="${secondaryColor}"/>
  <text data-field-id="saleBadge" data-max-width="132" x="240" y="132" font-family="${fontFamily}, sans-serif" font-size="${21 * fontScale}" font-weight="700" fill="${primaryColor}" text-anchor="middle">${escapeXml(fields.saleBadge || 'خصم خاص')}</text>
  <text data-field-id="salePercent" data-max-width="278" x="240" y="281" font-family="${fontFamily}, sans-serif" font-size="${92 * fontScale}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">${escapeXml(fields.salePercent || '50%')}</text>
  <path d="M 181,313 H 299" stroke="${secondaryColor}" stroke-width="1.5"/>
  <text data-field-id="salePeriod" data-max-width="266" x="240" y="354" font-family="${fontFamily}, sans-serif" font-size="${21 * fontScale}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.salePeriod || 'لفترة محدودة')}</text>
</svg>`;
    },
  },
  {
    id: 'seal_quality_approved',
    name: 'فحص الجودة معتمد QC',
    nameEn: 'Quality Approved Stamp',
    category: 'badges',
    description: 'ختم مصنعي رسمي يؤكد اجتياز فحص الجودة والمطابقة',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 96, height: 96 },
    defaultColors: {
      primary: '#476D79',
      secondary: '#233E4D',
      background: '#F2F7F6',
    },
    fields: [
      { id: 'status', label: 'الحالة', type: 'text', defaultValue: 'QC PASSED' },
      {
        id: 'inspector',
        label: 'رقم الفاحص أو المعمل',
        type: 'text',
        defaultValue: 'مفتش الجودة #42',
      },
      { id: 'date', label: 'تاريخ المطابقة', type: 'text', defaultValue: 'معتمد ومطابق للمواصفات' },
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
      const bg = isTransparent ? 'none' : backgroundColor;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="218" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="240" cy="240" r="204" fill="none" stroke="${primaryColor}" stroke-width="1"/>
  <path d="M 201,98 Q 240,101 279,98 L 275,143 Q 272,167 240,183 Q 208,167 205,143 Z" fill="${primaryColor}" fill-opacity="0.12"/>
  <path d="M 207,104 Q 240,106 273,104 L 269,140 Q 268,160 240,175 Q 212,160 211,140 Z" fill="none" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  <path d="M 225,136 L 237,148 L 258,123" fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  ${laurelSprig(161, 147, primaryColor)}
  ${laurelSprig(319, 147, primaryColor, true)}
  <text data-field-id="status" data-max-width="318" x="240" y="260" font-family="${fontFamily}, sans-serif" font-size="${37 * fontScale}" font-weight="800" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.status || 'QC PASSED')}</text>
  <path d="M 109,283 H 371" stroke="${primaryColor}" stroke-width="1"/>
  <text data-field-id="inspector" data-max-width="312" x="240" y="325" font-family="${fontFamily}, sans-serif" font-size="${22 * fontScale}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${escapeXml(fields.inspector || 'مفتش الجودة #42')}</text>
  <text data-field-id="date" data-max-width="286" x="240" y="367" font-family="${fontFamily}, sans-serif" font-size="${17 * fontScale}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.date || 'معتمد ومطابق للمواصفات')}</text>
</svg>`;
    },
  },
  {
    id: 'seal_limited_edition',
    name: 'إصدار محدود فاخر',
    nameEn: 'Limited Edition Badge',
    category: 'badges',
    description: 'شارة ذهبية فاخرة للقطع الحصرية والإصدارات الخاصة المحدودة',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 96, height: 96 },
    defaultColors: {
      primary: '#A77455',
      secondary: '#433B38',
      background: '#FAF4EA',
    },
    fields: [
      { id: 'top', label: 'الشارة العليا', type: 'text', defaultValue: 'نسخة حصرية' },
      { id: 'title', label: 'العنوان الرئيسي', type: 'text', defaultValue: 'LIMITED EDITION' },
      {
        id: 'number',
        label: 'الترقيم أو التخصيص',
        type: 'text',
        defaultValue: 'إصدار مرقم ومحدود',
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
      const bg = isTransparent ? 'none' : backgroundColor;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <path d="M 55,25 H 425 L 455,55 V 425 L 425,455 H 55 L 25,425 V 55 Z" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <path d="M 61,37 H 419 L 443,61 V 419 L 419,443 H 61 L 37,419 V 61 Z" fill="none" stroke="${primaryColor}" stroke-width="1"/>
  <path d="M 54,105 V 68 L 68,54 H 105 M 375,54 H 412 L 426,68 V 105 M 54,375 V 412 L 68,426 H 105 M 375,426 H 412 L 426,412 V 375" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <g stroke="${primaryColor}" stroke-width="2" stroke-linejoin="round" data-color-role="primary">
    <path d="M 198,114 L 205,149 H 275 L 282,114 L 257,132 L 240,105 L 223,132 Z" fill="${primaryColor}" fill-opacity="0.14"/>
    <path d="M 207,158 H 273"/>
  </g>
  <circle cx="198" cy="109" r="3" fill="${primaryColor}"/><circle cx="282" cy="109" r="3" fill="${primaryColor}"/><circle cx="240" cy="99" r="3" fill="${primaryColor}"/>
  <text data-field-id="top" data-max-width="324" x="240" y="214" font-family="${fontFamily}, sans-serif" font-size="${22 * fontScale}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${escapeXml(fields.top || 'نسخة حصرية')}</text>
  <text data-field-id="title" data-max-width="360" x="240" y="277" font-family="${fontFamily}, sans-serif" font-size="${33 * fontScale}" font-weight="800" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.title || 'LIMITED EDITION')}</text>
  <path d="M 107,314 H 220 M 260,314 H 373" stroke="${primaryColor}" stroke-width="1"/>
  <polygon points="240,308 246,314 240,320 234,314" fill="${primaryColor}"/>
  <text data-field-id="number" data-max-width="316" x="240" y="367" font-family="${fontFamily}, sans-serif" font-size="${20 * fontScale}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">${escapeXml(fields.number || 'إصدار مرقم ومحدود')}</text>
</svg>`;
    },
  },
];
