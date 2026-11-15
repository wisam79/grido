import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const CAFE_TEMPLATES: StickerTemplate[] = [
  {
    id: 'cafe_freshly_brewed',
    name: 'قهوة محمصة طازجة',
    nameEn: 'Freshly Brewed Coffee',
    category: 'cafe',
    shape: 'circle',
    description: 'ملصق قهوة عصري بفقاعات بخار ودرجة التحميص للكافيهات والمحامص',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#3E2B24',
      secondary: '#B68150',
      background: '#F8F1E5',
    },
    fields: [
      { id: 'brand', label: 'اسم المحمصة أو الكافيه', type: 'text', defaultValue: 'محمصة دجلة' },
      { id: 'blend', label: 'نوع القهوة', type: 'text', defaultValue: 'حبوب مختصة' },
      { id: 'roastLevel', label: 'درجة التحميص', type: 'text', defaultValue: 'تحميص وسط' },
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
      const brand = escapeXml(fields.brand || 'محمصة دجلة');
      const blend = escapeXml(fields.blend || 'حبوب مختصة');
      const roast = escapeXml(fields.roastLevel || 'تحميص وسط');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="226" fill="${bg}" data-color-role="background"/>
  <path d="M 65,180 A 184,184 0 0,1 130,93 M 350,93 A 184,184 0 0,1 415,180 M 112,375 A 184,184 0 0,0 368,375" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="blend" data-max-width="240" x="240" y="91" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${blend}
  </text>
  <path d="M 216,146 C 201,130 231,126 216,110 M 240,140 C 226,123 255,119 241,104 M 266,146 C 252,132 278,128 267,116" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 298,169 C 340,158 340,206 302,204" fill="none" stroke="${primaryColor}" stroke-width="5" data-color-role="primary"/>
  <path d="M 179,166 C 183,217 199,231 240,231 C 281,231 297,217 301,166 Z" fill="${secondaryColor}" fill-opacity="0.18" stroke="${primaryColor}" stroke-width="3" data-color-role="secondary"/>
  <ellipse cx="240" cy="166" rx="61" ry="15" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 210,165 C 222,151 262,154 270,165 C 260,175 224,176 216,165 C 224,159 250,158 258,165 C 250,169 236,169 231,165" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 194,185 Q 199,207 214,213 M 163,237 Q 240,262 317,237 M 184,235 H 296" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="primary"/>
  <g transform="rotate(-28 121 208)">
    <ellipse cx="121" cy="208" rx="12" ry="19" fill="${secondaryColor}" data-color-role="secondary"/>
    <path d="M 123,191 C 111,202 130,212 118,225" fill="none" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  </g>
  <g transform="rotate(30 357 192)">
    <ellipse cx="357" cy="192" rx="10" ry="16" fill="${secondaryColor}" data-color-role="secondary"/>
    <path d="M 359,179 C 349,187 364,198 355,205" fill="none" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  </g>
  <text data-field-id="brand" data-max-width="352" x="240" y="307" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${brand}
  </text>
  <path d="M 178,332 H 302" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="roastLevel" data-max-width="260" x="240" y="370" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${roast}
  </text>
</svg>`;
    },
  },
  {
    id: 'cafe_artisan_bakery',
    name: 'مخبز حرفي',
    nameEn: 'Artisan Bakery Label',
    category: 'cafe',
    shape: 'rect',
    description: 'ملصق مخبز حرفي بأسلوب السوق الشعبي للأفران والمعجنات المنزلية',
    defaultWidth: 520,
    defaultHeight: 340,
    aspectRatio: 520 / 340,
    defaultMm: { width: 65, height: 42 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 496, height: 316, rx: 14 },
    defaultColors: {
      primary: '#81452D',
      secondary: '#C39957',
      background: '#FFF6E5',
    },
    fields: [
      { id: 'bakeryName', label: 'اسم المخبز', type: 'text', defaultValue: 'فرن السيدة نوريا' },
      { id: 'product', label: 'المنتج', type: 'text', defaultValue: 'خبز تنور حطبي' },
      { id: 'note', label: 'ملاحظة', type: 'text', defaultValue: 'يُخبز يومياً على الحجر الساخن' },
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
      const name = escapeXml(fields.bakeryName || 'فرن السيدة نوريا');
      const product = escapeXml(fields.product || 'خبز تنور حطبي');
      const note = escapeXml(fields.note || 'يُخبز يومياً على الحجر الساخن');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">
  <rect x="12" y="12" width="496" height="316" rx="14" fill="${bg}" data-color-role="background"/>
  <rect x="24" y="24" width="472" height="292" rx="8" fill="none" stroke="${primaryColor}" stroke-width="1.5" data-color-role="primary"/>
  <path d="M 173,119 C 175,76 208,53 261,55 C 308,56 344,82 347,119 Q 344,136 327,137 H 195 Q 177,137 173,119 Z" fill="${secondaryColor}" fill-opacity="0.35" stroke="${primaryColor}" stroke-width="2.5" data-color-role="secondary"/>
  <path d="M 211,114 Q 214,88 231,76 M 248,117 Q 251,87 267,71 M 285,118 Q 288,94 301,84 M 185,124 Q 260,134 337,123" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 99,137 Q 118,100 111,55 M 421,137 Q 402,100 409,55" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 113,80 Q 91,76 97,59 Q 115,64 113,80 Z M 114,96 Q 94,96 95,80 Q 112,82 114,96 Z M 111,113 Q 89,113 91,98 Q 108,100 111,113 Z M 114,83 Q 131,76 128,62 Q 113,66 114,83 Z M 114,100 Q 134,94 131,80 Q 115,84 114,100 Z M 108,118 Q 128,117 128,102 Q 112,105 108,118 Z M 407,80 Q 429,76 423,59 Q 405,64 407,80 Z M 406,96 Q 426,96 425,80 Q 408,82 406,96 Z M 409,113 Q 431,113 429,98 Q 412,100 409,113 Z M 406,83 Q 389,76 392,62 Q 407,66 406,83 Z M 406,100 Q 386,94 389,80 Q 405,84 406,100 Z M 412,118 Q 392,117 392,102 Q 408,105 412,118 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="bakeryName" data-max-width="420" x="260" y="193" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="product" data-max-width="390" x="260" y="240" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${product}
  </text>
  <path d="M 200,258 H 320" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="note" data-max-width="410" x="260" y="290" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: 'cafe_ice_cold',
    name: 'مشروب مثلج',
    nameEn: 'Ice Cold Drink Label',
    category: 'cafe',
    shape: 'circle',
    description: 'ملصق مشروبات بارد بندفة الثلج للعصائر والمشروبات الصيفية',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#215A56',
      secondary: '#8DAF62',
      background: '#F3F8E9',
    },
    fields: [
      { id: 'drinkName', label: 'اسم المشروب', type: 'text', defaultValue: 'ليمون نعناع مثلج' },
      { id: 'tagline', label: 'العبارة الدعائية', type: 'text', defaultValue: 'برودة تنعش يومك' },
      { id: 'sizeText', label: 'الحجم أو السعر', type: 'text', defaultValue: '500 مل' },
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
      const drink = escapeXml(fields.drinkName || 'ليمون نعناع مثلج');
      const tagline = escapeXml(fields.tagline || 'برودة تنعش يومك');
      const size = escapeXml(fields.sizeText || '500 مل');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="226" fill="${bg}" data-color-role="background"/>
  <path d="M 207,108 H 294 L 282,217 Q 250,230 219,217 Z" fill="${secondaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 214,150 Q 232,140 252,150 T 288,150 L 282,213 Q 250,224 220,213 Z" fill="${secondaryColor}" fill-opacity="0.45" data-color-role="secondary"/>
  <path d="M 254,172 L 266,80 L 291,67" fill="none" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary"/>
  <rect x="225" y="124" width="22" height="22" rx="5" transform="rotate(-14 236 135)" fill="none" stroke="${primaryColor}" stroke-opacity="0.55" stroke-width="2" data-color-role="primary"/>
  <rect x="257" y="163" width="20" height="20" rx="4" transform="rotate(12 267 173)" fill="none" stroke="${primaryColor}" stroke-opacity="0.55" stroke-width="2" data-color-role="primary"/>
  <path d="M 193,123 A 37,37 0 0,0 193,197 Z" fill="${secondaryColor}" fill-opacity="0.25" stroke="${secondaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="secondary"/>
  <path d="M 187,133 V 187 M 186,160 L 165,148 M 186,160 L 164,173 M 186,160 H 161" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 293,119 C 293,94 316,84 330,89 C 328,113 311,123 293,119 Z M 293,119 C 291,100 277,91 266,97 C 269,114 279,122 293,119 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 282,115 Q 302,116 320,97 M 300,83 L 304,72 M 334,134 L 345,128 M 168,105 L 161,97" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="drinkName" data-max-width="370" x="240" y="286" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${drink}
  </text>
  <text data-field-id="tagline" data-max-width="330" x="240" y="329" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${tagline}
  </text>
  <path d="M 122,369 H 158 M 322,369 H 358" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <text data-field-id="sizeText" data-max-width="146" x="240" y="377" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${size}
  </text>
  <path d="M 167,408 Q 192,398 217,408 T 267,408 T 317,408" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="secondary"/>
</svg>`;
    },
  },
  {
    id: 'cafe_iced_latte_cup',
    name: 'سبانش آيس لاتيه',
    nameEn: 'Iced Latte Cup Seal',
    category: 'cafe',
    shape: 'circle',
    description: 'ختم دائري للقهوة الباردة والسبانش لاتيه بأسلوب الكافيهات المختصة',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#3B2314',
      secondary: '#C68B59',
      background: '#FDF7F0',
    },
    fields: [
      { id: 'cafeTitle', label: 'اسم الكافيه', type: 'text', defaultValue: 'مقهى الفنجان المختص' },
      { id: 'drinkType', label: 'نوع المشروب', type: 'text', defaultValue: 'سبانش آيس لاتيه' },
      {
        id: 'roastNote',
        label: 'ملاحظة المذاق',
        type: 'text',
        defaultValue: 'إسبريسو مزدوج • حليب مكثف',
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
      const cafeTitle = escapeXml(fields.cafeTitle || 'مقهى الفنجان المختص');
      const drinkType = escapeXml(fields.drinkType || 'سبانش آيس لاتيه');
      const roastNote = escapeXml(fields.roastNote || 'إسبريسو مزدوج • حليب مكثف');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="cil-glow" cx="50%" cy="38%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="cil-coffee" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}"/>
    </linearGradient>
  </defs>
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <circle cx="240" cy="240" r="212" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6 5" data-color-role="secondary"/>
  <circle cx="240" cy="240" r="212" fill="url(#cil-glow)"/>
  <text data-field-id="cafeTitle" data-max-width="290" x="240" y="68" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${cafeTitle}
  </text>
  <!-- Dome lid + straw + layered iced cup -->
  <path d="M 248,148 L 265,104 L 286,98" fill="none" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 196,148 A 44,32 0 0,1 284,148 Z" fill="${secondaryColor}" fill-opacity="0.16" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  <path d="M 193,148 H 287 L 274,248 Q 240,260 206,248 Z" fill="url(#cil-coffee)" stroke="${primaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="secondary"/>
  <path d="M 200,180 Q 220,170 240,180 T 280,180" fill="none" stroke="${backgroundColor}" stroke-width="3" stroke-linecap="round"/>
  <rect x="214" y="156" width="18" height="18" rx="4" transform="rotate(-12 223 165)" fill="${backgroundColor}" fill-opacity="0.7"/>
  <rect x="248" y="158" width="16" height="16" rx="4" transform="rotate(14 256 166)" fill="${backgroundColor}" fill-opacity="0.7"/>
  <text data-field-id="drinkType" data-max-width="366" x="240" y="310" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${drinkType}
  </text>
  <rect x="88" y="334" width="304" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="roastNote" data-max-width="274" x="240" y="362" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${roastNote}
  </text>
</svg>`;
    },
  },
  {
    id: 'cafe_dessert_patisserie',
    name: 'حلويات ومعجنات فاخرة',
    nameEn: 'Boutique Patisserie Label',
    category: 'cafe',
    shape: 'rect',
    description: 'بطاقة تغليف أنيقة لعلب الكيك والحلويات والمعجنات المنزلية',
    defaultWidth: 520,
    defaultHeight: 340,
    aspectRatio: 520 / 340,
    defaultMm: { width: 70, height: 46 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 496, height: 316, rx: 18 },
    defaultColors: {
      primary: '#6B2D38',
      secondary: '#C89B6E',
      background: '#FFF9F5',
    },
    fields: [
      { id: 'brand', label: 'اسم المخبز / الحلواني', type: 'text', defaultValue: 'حلويات ليلاس' },
      { id: 'item', label: 'التخصص', type: 'text', defaultValue: 'تارت وكيك فرنسي طازج' },
      {
        id: 'note',
        label: 'تفصيل التغليف',
        type: 'text',
        defaultValue: 'صُنع بالزبدة الطبيعية 100%',
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
      const brand = escapeXml(fields.brand || 'حلويات ليلاس');
      const item = escapeXml(fields.item || 'تارت وكيك فرنسي طازج');
      const note = escapeXml(fields.note || 'صُنع بالزبدة الطبيعية 100%');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">
  <defs>
    <radialGradient id="cdp-aura" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="12" y="12" width="496" height="316" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="12" y="12" width="496" height="316" rx="18" fill="url(#cdp-aura)"/>
  <rect x="24" y="24" width="472" height="292" rx="12" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <!-- Cloche cake dome emblem -->
  <circle cx="260" cy="48" r="7" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 198,108 A 62,54 0 0,1 322,108 Z" fill="${secondaryColor}" fill-opacity="0.24" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  <path d="M 182,110 H 338 M 242,110 L 236,126 H 284 L 278,110" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text data-field-id="brand" data-max-width="420" x="260" y="178" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${brand}
  </text>
  <text data-field-id="item" data-max-width="400" x="260" y="236" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${item}
  </text>
  <rect x="108" y="256" width="304" height="40" rx="20" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="note" data-max-width="274" x="260" y="282" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${backgroundColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: 'cafe_tea_botanical',
    name: 'شاي وأعشاب طبيعية',
    nameEn: 'Artisan Botanical Tea',
    category: 'cafe',
    shape: 'circle',
    description: 'ختم علب الشاي العراقي والأعشاب الطبيعية بتصميم أوراق وإبريق كلاسيكي',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#234232',
      secondary: '#B4884E',
      background: '#F7F4EA',
    },
    fields: [
      { id: 'teaTitle', label: 'اسم الصنف', type: 'text', defaultValue: 'شاي الهيل الفاخر' },
      {
        id: 'origin',
        label: 'المصدر / المزيج',
        type: 'text',
        defaultValue: 'ورق سيلاني فاخر مع هيل طبيعي',
      },
      { id: 'weight', label: 'الوزن الصافي', type: 'text', defaultValue: '250 غرام صافي' },
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
      const teaTitle = escapeXml(fields.teaTitle || 'شاي الهيل الفاخر');
      const origin = escapeXml(fields.origin || 'ورق سيلاني فاخر مع هيل طبيعي');
      const weight = escapeXml(fields.weight || '250 غرام صافي');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <circle cx="240" cy="240" r="210" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <!-- Teapot & botanical leaves -->
  <path d="M 192,166 C 192,130 288,130 288,166 C 288,202 266,220 240,220 C 214,220 192,202 192,166 Z" fill="${secondaryColor}" fill-opacity="0.22" stroke="${primaryColor}" stroke-width="2.8" data-color-role="primary"/>
  <path d="M 222,136 C 222,122 258,122 258,136 M 240,124 V 115" fill="none" stroke="${primaryColor}" stroke-width="2.8" stroke-linecap="round"/>
  <path d="M 192,172 Q 162,164 156,136 M 288,154 C 316,148 318,194 286,194" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 230,180 C 220,164 236,154 240,154 C 244,154 260,164 250,180 C 245,188 235,188 230,180 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="teaTitle" data-max-width="350" x="240" y="286" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${teaTitle}
  </text>
  <text data-field-id="origin" data-max-width="336" x="240" y="330" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${origin}
  </text>
  <path d="M 140,354 H 340" stroke="${secondaryColor}" stroke-width="1.5" stroke-opacity="0.6"/>
  <text data-field-id="weight" data-max-width="240" x="240" y="390" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${weight}
  </text>
</svg>`;
    },
  },
];
