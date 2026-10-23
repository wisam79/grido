import { starPoints } from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const SEASONAL_TEMPLATES: StickerTemplate[] = [
  {
    id: 'seasonal_ramadan_crescent',
    name: 'هلال رمضان الكريم',
    nameEn: 'Ramadan Crescent',
    category: 'seasonal',
    shape: 'circle',
    description: 'ملصق رمضاني بهلال ونجوم وفانوس للتهاني والعروض الرمضانية',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    defaultColors: {
      primary: '#243E48',
      secondary: '#B88D4B',
      background: '#F8F3E7',
    },
    fields: [
      { id: 'greeting', label: 'عبارة التهنئة', type: 'text', defaultValue: 'رمضان كريم' },
      { id: 'wish', label: 'الدعاء', type: 'text', defaultValue: 'كل عام وأنتم بخير' },
      { id: 'brand', label: 'العلامة أو المتجر', type: 'text', defaultValue: '@YourStore.iq' },
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
      const greeting = escapeXml(fields.greeting || 'رمضان كريم');
      const wish = escapeXml(fields.wish || 'كل عام وأنتم بخير');
      const brand = escapeXml(fields.brand || '@YourStore.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const star = starPoints(275, 124, 8, 14, 6);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <circle cx="250" cy="250" r="226" fill="${bg}" data-color-role="background"/>
  <path d="M 243,83 C 183,66 145,128 169,178 C 191,224 251,227 282,184 C 244,207 200,182 199,143 C 198,115 216,94 243,83 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 181,135 C 174,167 194,192 219,199" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
  <polygon points="${star}" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 331,76 V 116" stroke="${primaryColor}" stroke-width="1.5" data-color-role="primary"/>
  <circle cx="331" cy="122" r="6" fill="none" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <path d="M 312,145 Q 316,132 331,128 Q 346,132 350,145 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 309,149 H 353 L 348,191 L 331,207 L 314,191 Z" fill="${secondaryColor}" fill-opacity="0.2" stroke="${primaryColor}" stroke-width="2" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 321,150 L 323,190 L 331,204 L 339,190 L 341,150 M 314,191 H 348 M 331,208 V 222" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 331,159 C 321,172 322,182 331,185 C 340,182 341,172 331,159 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 139,108 V 120 M 133,114 H 145 M 287,72 V 80 M 283,76 H 291" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="greeting" data-max-width="366" x="250" y="298" font-family="${fontFamily}, sans-serif" font-size="${Math.round(47 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${greeting}
  </text>
  <text data-field-id="wish" data-max-width="332" x="250" y="350" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${wish}
  </text>
  <path d="M 220,375 H 280" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="brand" data-max-width="280" x="250" y="408" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${brand}
  </text>
</svg>`;
    },
  },
  {
    id: 'seasonal_new_year_sparkle',
    name: 'سنة جديدة متوهجة',
    nameEn: 'Sparkling New Year',
    category: 'seasonal',
    shape: 'rect',
    description: 'ملصق سنة جديدة بألوان متلألئة للتهاني والعروض الاستثنائية',
    defaultWidth: 520,
    defaultHeight: 340,
    aspectRatio: 520 / 340,
    defaultMm: { width: 60, height: 39 },
    defaultColors: {
      primary: '#F6EDDF',
      secondary: '#CBA76C',
      background: '#202E41',
    },
    fields: [
      { id: 'year', label: 'السنة الجديدة', type: 'text', defaultValue: '2027' },
      {
        id: 'greeting',
        label: 'عبارة التهنئة',
        type: 'text',
        defaultValue: 'سنة سعيدة وأمنيات تتحقق',
      },
      { id: 'brand', label: 'العلامة أو المتجر', type: 'text', defaultValue: '@YourStore.iq' },
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
      const year = escapeXml(fields.year || '2027');
      const greeting = escapeXml(fields.greeting || 'سنة سعيدة وأمنيات تتحقق');
      const brand = escapeXml(fields.brand || '@YourStore.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">
  <rect x="12" y="12" width="496" height="316" rx="14" fill="${bg}" data-color-role="background"/>
  <path d="M 36,151 V 304 H 102 M 484,151 V 304 H 418 M 156,44 H 226 M 294,44 H 364" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <path d="M 91,53 V 30 M 91,80 V 104 M 77,67 H 53 M 105,67 H 129 M 81,57 L 64,40 M 101,77 L 118,94 M 81,77 L 64,94 M 101,57 L 118,40 M 429,53 V 30 M 429,80 V 104 M 415,67 H 391 M 443,67 H 467 M 419,57 L 402,40 M 439,77 L 456,94 M 419,77 L 402,94 M 439,57 L 456,40" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 79,39 L 83,48 M 110,59 L 119,55 M 79,95 L 83,86 M 63,55 L 72,59 M 417,39 L 421,48 M 448,59 L 457,55 M 417,95 L 421,86 M 401,55 L 410,59" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 250,44 L 260,34 L 270,44 L 260,54 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="year" data-max-width="350" x="260" y="190" font-family="${fontFamily}, sans-serif" font-size="${Math.round(86 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2">
    ${year}
  </text>
  <text data-field-id="greeting" data-max-width="406" x="260" y="239" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${greeting}
  </text>
  <path d="M 230,263 H 290" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="brand" data-max-width="350" x="260" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${brand}
  </text>
</svg>`;
    },
  },
  {
    id: 'seasonal_summer_wave',
    name: 'موج الصيف الحار',
    nameEn: 'Hot Summer Wave',
    category: 'seasonal',
    shape: 'rect',
    description: 'ملصق صيفي بأمواج وشمس حارقة لعروض الموسم والخصومات',
    defaultWidth: 520,
    defaultHeight: 320,
    aspectRatio: 520 / 320,
    defaultMm: { width: 65, height: 40 },
    defaultColors: {
      primary: '#AE5037',
      secondary: '#277F8A',
      background: '#FFF3DC',
    },
    fields: [
      { id: 'title', label: 'عنوان العرض', type: 'text', defaultValue: 'عرض الصيف الحار' },
      { id: 'discount', label: 'الخصم', type: 'text', defaultValue: 'خصم 40%' },
      { id: 'period', label: 'الفترة', type: 'text', defaultValue: 'طوال شهر حزيران' },
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
      const title = escapeXml(fields.title || 'عرض الصيف الحار');
      const discount = escapeXml(fields.discount || 'خصم 40%');
      const period = escapeXml(fields.period || 'طوال شهر حزيران');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="520" height="320">
  <defs>
    <clipPath id="summer-wave-edge">
      <rect x="12" y="12" width="496" height="296" rx="20"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="496" height="296" rx="20" fill="${bg}" data-color-role="background"/>
  <circle cx="434" cy="92" r="31" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 434,45 V 36 M 434,139 V 148 M 387,92 H 378 M 481,92 H 490 M 401,59 L 394,52 M 467,125 L 474,132 M 401,125 L 394,132 M 467,59 L 474,52" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="primary"/>
  <g clip-path="url(#summer-wave-edge)">
    <path d="M 12,263 C 114,238 169,289 283,262 C 356,244 387,217 409,187 C 428,160 463,166 478,189 C 452,177 435,192 440,210 C 445,230 476,238 508,226 V 308 H 12 Z" fill="${secondaryColor}" fill-opacity="0.18" data-color-role="secondary"/>
    <path d="M 12,280 C 128,260 183,310 294,280 C 367,258 398,233 421,217 C 443,202 464,210 474,225 C 445,218 441,245 462,252 Q 484,264 508,255 V 308 H 12 Z" fill="${secondaryColor}" data-color-role="secondary"/>
    <path d="M 346,279 Q 390,269 414,247 M 387,281 Q 406,272 417,262" fill="none" stroke="${backgroundColor}" stroke-width="2" stroke-linecap="round"/>
  </g>
  <text data-field-id="title" data-max-width="320" x="208" y="97" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="discount" data-max-width="320" x="208" y="176" font-family="${fontFamily}, sans-serif" font-size="${Math.round(53 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${discount}
  </text>
  <text data-field-id="period" data-max-width="310" x="208" y="228" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${period}
  </text>
</svg>`;
    },
  },
];
