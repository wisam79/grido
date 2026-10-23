import { starPoints, scallopCirclePath } from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const ADDON_TEMPLATES: StickerTemplate[] = [
  {
    id: 'badge_verified_trust',
    name: 'ختم موثوق ومعتمد رسمي',
    nameEn: 'Verified Trust Seal',
    category: 'badges',
    shape: 'circle',
    description: 'شارة توثيق الجودة والأصالة الدائرية مع علامة التحقق المزدوجة',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#347985',
      secondary: '#203F55',
      background: '#F3F8F7',
    },
    fields: [
      { id: 'topText', label: 'النص العلوي', type: 'text', defaultValue: '★ متجر موثوق ومعتمد ★' },
      { id: 'centerText', label: 'الحالة', type: 'text', defaultValue: 'VERIFIED' },
      {
        id: 'subText',
        label: 'الوصف السفلي',
        type: 'text',
        defaultValue: 'ضمان أمان المعاملات 100%',
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
      const top = escapeXml(fields.topText || '');
      const center = escapeXml(fields.centerText || '');
      const sub = escapeXml(fields.subText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-vt-top" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
    <linearGradient id="badge-vt-shield" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${primaryColor}"/><stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <path d="M 43,235 A 208,208 0 0,0 151,433 M 457,235 A 208,208 0 0,1 349,433" fill="none" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round"/>
  <!-- Faceted shield, rather than a seal inside a seal. -->
  <path d="M 250,143 C 268,155 287,159 302,161 V 208 C 302,238 279,260 250,274 C 221,260 198,238 198,208 V 161 C 216,159 233,154 250,143 Z" fill="url(#badge-vt-shield)"/>
  <path d="M 250,154 V 260 C 225,246 210,227 210,206 V 171 C 225,168 239,161 250,154 Z" fill="#FFFFFF" opacity="0.12"/>
  <path d="M 221,204 L 242,225 L 280,186" fill="none" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 218,180 L 225,177 M 239,171 L 245,168" fill="none" stroke="#FFFFFF" stroke-opacity="0.45" stroke-width="3" stroke-linecap="round"/>
  <path d="M 217,396 H 239 M 261,396 H 283" stroke="${primaryColor}" stroke-width="1.5"/>
  <path d="M 250,389 L 257,396 L 250,403 L 243,396 Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="topText" data-max-width="410" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-vt-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="centerText" data-max-width="330" x="250" y="322" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="900" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    ${center}
  </text>
  <text data-field-id="subText" data-max-width="326" x="250" y="363" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'badge_handmade_love',
    name: 'ختم صنع يدوياً بكل حب',
    nameEn: 'Handmade With Love Seal',
    category: 'badges',
    shape: 'circle',
    description: 'ختم حِرفي لطيف ومحبب للمنتجات اليدوية، الإكسسوارات، والحلويات',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#BD6E72',
      secondary: '#844B55',
      background: '#FCF3EB',
    },
    fields: [
      { id: 'topText', label: 'النص المقوس', type: 'text', defaultValue: 'HANDMADE WITH LOVE' },
      { id: 'centerText', label: 'النص الأوسط', type: 'text', defaultValue: 'صُنع يدوياً' },
      { id: 'subText', label: 'النص السفلي', type: 'text', defaultValue: 'بكل حب وعناية ♡' },
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
      const top = escapeXml(fields.topText || '');
      const center = escapeXml(fields.centerText || '');
      const sub = escapeXml(fields.subText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-hm-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
    <linearGradient id="badge-hm-fabric" x1="0" y1="0" x2="0.8" y2="1">
      <stop stop-color="${primaryColor}"/><stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="223" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <path d="M 83,369 A 205,205 0 0,0 417,369" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="3 8" stroke-linecap="round"/>
  <!-- A padded, hand-stitched heart with its working thread and needle. -->
  <path d="M 250,176 C 221,137 173,154 177,192 C 180,225 215,249 250,273 C 285,249 320,225 323,192 C 327,154 279,137 250,176 Z" fill="url(#badge-hm-fabric)"/>
  <path d="M 250,189 C 224,151 186,165 189,193 C 192,218 222,242 250,260 C 278,241 308,218 311,193 C 314,164 276,151 250,189 Z" fill="none" stroke="#FFF5EB" stroke-width="2" stroke-dasharray="4 5" stroke-linecap="round"/>
  <path d="M 198,180 C 202,169 218,167 230,177" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.25"/>
  <path d="M 302,226 C 338,236 336,280 369,263 C 393,249 366,230 355,247 C 344,266 367,288 383,279" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <path d="M 358,242 L 382,205 Q 387,198 390,201 Q 393,204 388,210 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M 386,205 L 382,211" stroke="${secondaryColor}" stroke-width="1.4"/>
  <path d="M 106,253 C 125,247 134,257 145,272 M 120,247 L 122,262 M 137,257 L 136,272" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="topText" data-max-width="410" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-hm-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="centerText" data-max-width="320" x="250" y="329" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${center}
  </text>
  <text data-field-id="subText" data-max-width="304" x="250" y="371" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'badge_eco_friendly',
    name: 'ختم صديق للبيئة وعضوي',
    nameEn: 'Eco Friendly Green Stamp',
    category: 'badges',
    shape: 'circle',
    description: 'ختم بيئي طبيعي للمنتجات العضوية والقابلة للتدوير ومستحضرات الطبيعة',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#6D8954',
      secondary: '#304B3C',
      background: '#F5F4E8',
    },
    fields: [
      { id: 'topText', label: 'النص العلوي', type: 'text', defaultValue: '100% ECO FRIENDLY' },
      { id: 'mainText', label: 'النص الرئيسي', type: 'text', defaultValue: 'صديق للبيئة' },
      {
        id: 'subText',
        label: 'النص الفرعي',
        type: 'text',
        defaultValue: 'عضوي • طبيعي • قابل لإعادة التدوير',
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
      const top = escapeXml(fields.topText || '');
      const main = escapeXml(fields.mainText || '');
      const sub = escapeXml(fields.subText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-eco-arc" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
    <linearGradient id="badge-eco-leaf" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${primaryColor}"/><stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <path d="M 250,25 C 377,25 475,119 475,247 C 475,376 370,475 246,475 C 116,475 25,371 25,247 C 25,121 122,25 250,25 Z" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 82,330 C 105,395 175,436 241,438" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 358,416 C 364,392 379,385 398,389 C 396,406 380,419 358,416 Z" fill="${primaryColor}" data-color-role="primary"/>
  <!-- Asymmetric botanical growth, with visible midribs and secondary veins. -->
  <path d="M 249,267 C 246,230 266,186 289,161" fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-linecap="round"/>
  <path d="M 263,216 C 246,159 275,136 320,138 C 324,177 300,211 263,216 Z" fill="url(#badge-eco-leaf)"/>
  <path d="M 250,239 C 211,240 178,212 178,179 C 220,174 253,199 250,239 Z" fill="${primaryColor}"/>
  <path d="M 269,204 L 309,151 M 281,188 L 279,164 M 294,172 L 310,170 M 245,232 L 190,190 M 224,216 L 224,195 M 211,205 L 193,208" fill="none" stroke="#F3F7DC" stroke-width="2" stroke-linecap="round" opacity="0.75"/>
  <path d="M 223,272 Q 250,280 277,272 M 234,283 H 266" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>
  <text data-field-id="topText" data-max-width="420" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-eco-arc" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" data-max-width="350" x="250" y="336" font-family="${fontFamily}, sans-serif" font-size="${Math.round(39 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="344" x="250" y="375" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'badge_best_seller',
    name: 'ختم الأكثر مبيعاً الأفضل',
    nameEn: 'Best Seller Trophy Badge',
    category: 'badges',
    shape: 'circle',
    description: 'شارة مبيعات كبرى للمنتجات المتصدرة والسلع الأعلى تقييماً',
    defaultWidth: 500,
    defaultHeight: 520,
    aspectRatio: 500 / 520,
    defaultColors: {
      primary: '#B47C37',
      secondary: '#5B402B',
      background: '#FFF6E5',
    },
    fields: [
      { id: 'rankText', label: 'الترتيب', type: 'text', defaultValue: '#1' },
      { id: 'titleText', label: 'العنوان الرئيسي', type: 'text', defaultValue: 'الأكثر مبيعاً' },
      { id: 'ribbonText', label: 'نص الوشاح', type: 'text', defaultValue: 'BEST SELLER' },
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
      const rank = escapeXml(fields.rankText || '#1');
      const title = escapeXml(fields.titleText || '');
      const ribbon = escapeXml(fields.ribbonText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const star = starPoints(250, 244, 16, 220, 211);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 520" width="500" height="520">
  <defs>
    <linearGradient id="badge-best-cup" x1="0" y1="0" x2="1" y2="0.8">
      <stop stop-color="#F8D895"/><stop offset="0.45" stop-color="${primaryColor}"/><stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <polygon points="${star}" fill="${bg}" stroke="${primaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="background"/>
  <path d="M 104,279 A 150,150 0 0,1 177,113 M 396,279 A 150,150 0 0,0 323,113" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
  <!-- Metallic cup with open handles, a raised rim and a small plinth. -->
  <path d="M 214,126 H 191 V 145 C 191,164 205,174 221,172 M 286,126 H 309 V 145 C 309,164 295,174 279,172" fill="none" stroke="${primaryColor}" stroke-width="7" stroke-linejoin="round"/>
  <path d="M 211,116 H 289 L 281,166 C 278,189 263,200 250,200 C 237,200 222,189 219,166 Z" fill="url(#badge-best-cup)"/>
  <path d="M 223,129 L 228,164 C 230,177 236,184 241,187" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.5" stroke-linecap="round"/>
  <path d="M 210,116 H 290" stroke="${primaryColor}" stroke-width="6" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 250,199 V 219 M 229,220 H 271" stroke="${secondaryColor}" stroke-width="6" stroke-linecap="round"/>
  <text data-field-id="rankText" data-max-width="230" x="250" y="278" font-family="${fontFamily}, sans-serif" font-size="${Math.round(43 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${rank}
  </text>
  <text data-field-id="titleText" data-max-width="326" x="250" y="326" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${title}
  </text>
  <!-- Folded grosgrain ribbon: tails sit behind the raised front panel. -->
  <path d="M 92,374 H 32 L 53,409 L 32,442 H 114 V 412 H 386 V 442 H 468 L 447,409 L 468,374 H 408 Z" fill="${secondaryColor}"/>
  <path d="M 92,366 H 408 V 417 H 92 Z" fill="${primaryColor}"/>
  <path d="M 92,417 L 114,442 V 417 M 408,417 L 386,442 V 417" fill="#000000" opacity="0.2"/>
  <path d="M 106,373 H 394 M 106,410 H 394" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="1.5"/>
  <text data-field-id="ribbonText" data-max-width="286" x="250" y="400" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="800" letter-spacing="2" fill="#FFFFFF" text-anchor="middle">
    ${ribbon}
  </text>
</svg>`;
    },
  },
  {
    id: 'retail_buy1_get1',
    name: 'ملصق اشتري 1 واحصل على 1 مجاناً',
    nameEn: 'Buy 1 Get 1 Free Promo',
    category: 'retail',
    shape: 'rect',
    description: 'ملصق ترويجي جاذب لعروض BOGO الترويجية للمتاجر والمولات',
    defaultWidth: 500,
    defaultHeight: 300,
    aspectRatio: 500 / 300,
    defaultMm: { width: 100, height: 60 },
    defaultColors: {
      primary: '#B83432',
      secondary: '#F1CF8C',
      background: '#702C32',
    },
    fields: [
      { id: 'badge', label: 'شارة العرض', type: 'text', defaultValue: 'عرض خاص ومحدود' },
      { id: 'mainText', label: 'العرض الرئيسي', type: 'text', defaultValue: 'اشترِ 1 واحصل على 1' },
      { id: 'highlight', label: 'الكلمة البارزة', type: 'text', defaultValue: 'مـجـانـاً !' },
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
      const badge = escapeXml(fields.badge || '');
      const main = escapeXml(fields.mainText || '');
      const hl = escapeXml(fields.highlight || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300">
  <!-- Die-cut coupon with an inset offer and a pair of linked price tags. -->
  <path d="M 32,16 H 468 Q 484,16 484,32 V 133 A 17,17 0 0,0 484,167 V 268 Q 484,284 468,284 H 32 Q 16,284 16,268 V 167 A 17,17 0 0,0 16,133 V 32 Q 16,16 32,16 Z" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 35,37 H 104 M 396,37 H 465 M 35,263 H 465" fill="none" stroke="${secondaryColor}" stroke-width="2" opacity="0.65"/>
  <path d="M 36,151 H 464" stroke="${secondaryColor}" stroke-width="1" stroke-dasharray="3 7" opacity="0.5"/>
  <text data-field-id="badge" data-max-width="278" x="250" y="62" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${badge}
  </text>
  <text data-field-id="mainText" data-max-width="412" x="250" y="120" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="900" fill="${isTransparent ? primaryColor : '#FFFFFF'}" text-anchor="middle">
    ${main}
  </text>
  <g transform="translate(90, 207) rotate(-12)">
    <path d="M -26,-22 L -10,-35 H 19 V 25 H -26 Z" fill="${primaryColor}" data-color-role="primary"/>
    <path d="M -9,-15 L 8,-29 H 35 V 34 H -9 Z" fill="${secondaryColor}"/>
    <circle cx="10" cy="-15" r="4" fill="none" stroke="${backgroundColor}" stroke-width="2"/>
    <path d="M 10,-15 C -27,-24 -21,-48 -7,-43 C 4,-39 1,-27 10,-15" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
    <path d="M 0,7 H 26 M 13,-6 V 20" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round"/>
  </g>
  <path d="M 161,178 H 441 V 243 H 161 Z" fill="${secondaryColor}"/>
  <path d="M 441,178 L 429,190 H 441 Z" fill="#FFFFFF" opacity="0.35"/>
  <text data-field-id="highlight" data-max-width="256" x="301" y="223" font-family="${fontFamily}, sans-serif" font-size="${Math.round(39 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${hl}
  </text>
</svg>`;
    },
  },
  {
    id: 'retail_mega_clearance',
    name: 'ملصق تصفية كبرى وأسعار محطمة',
    nameEn: 'Mega Clearance Sale Tag',
    category: 'retail',
    shape: 'rect',
    description: 'ملصق تنزيلات وتصفية مواسم لافت للأنظار وموجه للمتاجر والمستودعات',
    defaultWidth: 500,
    defaultHeight: 320,
    aspectRatio: 500 / 320,
    defaultMm: { width: 100, height: 64 },
    defaultColors: {
      primary: '#C3472D',
      secondary: '#27383B',
      background: '#FFF1DB',
    },
    fields: [
      { id: 'topAlert', label: 'تنبيه التصفية', type: 'text', defaultValue: '💥 تحطيم أسعار 💥' },
      { id: 'bigText', label: 'النص العريض', type: 'text', defaultValue: 'تصفية كبرى' },
      { id: 'discount', label: 'نسبة الخصم', type: 'text', defaultValue: 'خصم يصل إلى 70%' },
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
      const alert = escapeXml(fields.topAlert || '');
      const big = escapeXml(fields.bigText || '');
      const disc = escapeXml(fields.discount || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <path d="M 75,18 H 469 Q 483,18 483,32 V 288 Q 483,302 469,302 H 31 Q 17,302 17,288 V 76 Z" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.5" stroke-linejoin="round" data-color-role="background"/>
  <path d="M 17,222 H 483 V 288 Q 483,302 469,302 H 31 Q 17,302 17,288 Z" fill="${primaryColor}" data-color-role="primary"/>
  <!-- Punched tag corner and a short cord replace the hazard-strip styling. -->
  <circle cx="67" cy="67" r="10" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <path d="M 67,67 C 20,62 20,15 42,12 C 61,10 66,32 48,45" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 122,93 H 429" stroke="${primaryColor}" stroke-width="1.5"/>
  <path d="M 49,185 L 60,174 M 65,185 L 76,174 M 424,119 L 435,108 M 440,119 L 451,108" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round"/>
  <text data-field-id="topAlert" data-max-width="324" x="277" y="70" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${alert}
  </text>
  <text data-field-id="bigText" data-max-width="396" x="250" y="177" font-family="${fontFamily}, sans-serif" font-size="${Math.round(57 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${big}
  </text>
  <text data-field-id="discount" data-max-width="412" x="250" y="270" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
    ${disc}
  </text>
</svg>`;
    },
  },
  {
    id: 'packaging_fragile_arabic',
    name: 'ملصق قابل للكسر مع كود الشحن',
    nameEn: 'Fragile Handle With Care',
    category: 'packaging',
    shape: 'rect',
    description: 'ملصق شحن احترافي مع رمز الكأس والأسهم التوجيهية للطرود الحساسة',
    defaultWidth: 500,
    defaultHeight: 350,
    aspectRatio: 500 / 350,
    defaultMm: { width: 100, height: 70 },
    defaultColors: {
      primary: '#B83F38',
      secondary: '#303C44',
      background: '#FAF8F2',
    },
    fields: [
      { id: 'mainText', label: 'التحذير الرئيسي', type: 'text', defaultValue: 'قابل للكسر' },
      {
        id: 'enText',
        label: 'النص بالإنجليزية',
        type: 'text',
        defaultValue: 'FRAGILE • HANDLE WITH CARE',
      },
      {
        id: 'instruction',
        label: 'تعليمات المناولة',
        type: 'text',
        defaultValue: 'يرجى عدم الضغط أو الرمي — هذا الجانب لأعلى',
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
      const main = escapeXml(fields.mainText || '');
      const en = escapeXml(fields.enText || '');
      const inst = escapeXml(fields.instruction || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350">
  <rect x="14" y="14" width="472" height="322" rx="10" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="31" y="34" width="112" height="188" rx="6" fill="${primaryColor}" fill-opacity="0.07"/>
  <path d="M 161,43 V 215" stroke="${secondaryColor}" stroke-opacity="0.2" stroke-width="1.5"/>
  <!-- Shipping pictograms have their own column, clear of both languages. -->
  <path d="M 64,56 H 110 L 106,94 C 104,110 96,120 87,120 C 78,120 70,110 68,94 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 87,120 V 140 M 71,141 H 103" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round"/>
  <path d="M 90,56 L 80,77 L 93,90 L 83,109" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 70,199 V 170 L 60,180 M 70,170 L 80,180 M 104,199 V 170 L 94,180 M 104,170 L 114,180 M 59,207 H 115" fill="none" stroke="${secondaryColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text data-field-id="mainText" data-max-width="282" x="318" y="119" font-family="${fontFamily}, sans-serif" font-size="${Math.round(43 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="enText" data-max-width="274" x="318" y="162" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" letter-spacing="0.4" fill="${secondaryColor}" text-anchor="middle">
    ${en}
  </text>
  <path d="M 278,192 H 358" stroke="${primaryColor}" stroke-width="3"/>
  <rect x="31" y="242" width="438" height="72" rx="5" fill="${primaryColor}"/>
  <text data-field-id="instruction" data-max-width="408" x="250" y="285" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    ${inst}
  </text>
</svg>`;
    },
  },
  {
    id: 'greeting_grad_cap',
    name: 'ملصق تهنئة تخرج ونجاح',
    nameEn: 'Graduation Excellence Seal',
    category: 'greeting',
    shape: 'circle',
    description: 'ملصق مباركة التخرج المبهج مع قبعة التخرج وشهادة التقدير',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#2F405F',
      secondary: '#92703A',
      background: '#FAF7F0',
    },
    fields: [
      {
        id: 'topText',
        label: 'العبارة العلوية',
        type: 'text',
        defaultValue: '★ دفعة المتفوقين 2026 ★',
      },
      { id: 'mainText', label: 'التهنئة الرئيسية', type: 'text', defaultValue: 'مبارك التخرج' },
      {
        id: 'nameText',
        label: 'اسم الخريج / التخصص',
        type: 'text',
        defaultValue: 'مع تمنياتنا بدوام التميز والنجاح',
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
      const top = escapeXml(fields.topText || '');
      const main = escapeXml(fields.mainText || '');
      const name = escapeXml(fields.nameText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-grad-arc" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
  </defs>
  <circle cx="250" cy="250" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- Academic laurel sits below the text, not behind it. -->
  <g fill="${secondaryColor}">
    <path d="M 143,384 Q 183,424 245,429 Q 186,433 143,384 Z M 161,404 Q 139,403 139,384 Q 159,385 161,404 Z M 180,418 Q 157,421 153,405 Q 175,402 180,418 Z M 203,427 Q 183,438 173,422 Q 196,415 203,427 Z"/>
    <path d="M 357,384 Q 317,424 255,429 Q 314,433 357,384 Z M 339,404 Q 361,403 361,384 Q 341,385 339,404 Z M 320,418 Q 343,421 347,405 Q 325,402 320,418 Z M 297,427 Q 317,438 327,422 Q 304,415 297,427 Z"/>
  </g>
  <path d="M 199,181 V 215 Q 248,245 297,215 V 181 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 248,202 V 233 Q 281,230 297,215 V 181 Z" fill="#000000" opacity="0.16"/>
  <path d="M 160,174 L 248,138 L 340,171 L 248,208 Z" fill="${primaryColor}"/>
  <path d="M 160,174 L 248,208 L 340,171 V 179 L 248,216 L 160,182 Z" fill="${primaryColor}"/>
  <path d="M 179,173 L 248,147 L 316,171" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.25"/>
  <path d="M 248,174 L 313,185 V 235" fill="none" stroke="${secondaryColor}" stroke-width="3"/>
  <circle cx="248" cy="174" r="4" fill="${secondaryColor}"/>
  <path d="M 313,227 L 305,250 Q 313,254 321,250 Z" fill="${secondaryColor}"/>
  <!-- Rolled diploma and ribbon. -->
  <g transform="translate(249, 256) rotate(-8)">
    <rect x="-43" y="-10" width="86" height="22" rx="9" fill="#F4E6C9" stroke="${secondaryColor}" stroke-width="1.5"/>
    <ellipse cx="-35" cy="1" rx="6" ry="8" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
    <path d="M -1,-10 V 12 M -1,8 L -8,23 L 1,19 L 8,23 L 4,8" fill="${secondaryColor}" stroke="${secondaryColor}" stroke-width="4"/>
  </g>
  <text data-field-id="topText" data-max-width="420" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    <textPath href="#badge-grad-arc" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" data-max-width="350" x="250" y="331" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="nameText" data-max-width="344" x="250" y="374" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${name}
  </text>
</svg>`;
    },
  },
  {
    id: 'cafe_specialty_beans',
    name: 'ملصق حبوب بن مختصة ومحمصة',
    nameEn: 'Specialty Roasted Coffee',
    category: 'cafe',
    shape: 'rect',
    description: 'ملصق أكياس القهوة المختصة مع بيانات المعالجة والإيحاءات وتاريخ التحميص',
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: '#4B342A',
      secondary: '#9A603B',
      background: '#F5EFE3',
    },
    fields: [
      {
        id: 'roastery',
        label: 'اسم المحمصة',
        type: 'text',
        defaultValue: 'محمصة الأصالة • ROASTERY',
      },
      {
        id: 'origin',
        label: 'المصدر / السلالة',
        type: 'text',
        defaultValue: 'إثيوبيا - يرغاتشيفي',
      },
      {
        id: 'process',
        label: 'المعالجة والارتفاع',
        type: 'text',
        defaultValue: 'مجففة لا هوائية • 2,100م',
      },
      {
        id: 'notes',
        label: 'الإيحاءات',
        type: 'text',
        defaultValue: 'زهور • خوخ • شوكولاتة داكنة',
      },
      { id: 'weight', label: 'الوزن الصافي', type: 'text', defaultValue: '250g NET WEIGHT' },
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
      const roastery = escapeXml(fields.roastery || '');
      const origin = escapeXml(fields.origin || '');
      const process = escapeXml(fields.process || '');
      const notes = escapeXml(fields.notes || '');
      const weight = escapeXml(fields.weight || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <defs>
    <linearGradient id="coffee-addon-roast" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${secondaryColor}"/><stop offset="0.65" stop-color="${primaryColor}"/><stop offset="1" stop-color="#2D211C"/>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="464" height="614" rx="5" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 18,18 H 482 V 30 H 18 Z M 18,620 H 482 V 632 H 18 Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="roastery" data-max-width="396" x="250" y="79" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" letter-spacing="1" fill="${primaryColor}" text-anchor="middle">
    ${roastery}
  </text>
  <path d="M 60,103 H 440" stroke="${secondaryColor}" stroke-width="1"/>
  <!-- Botanical coffee branch and roasted beans, drawn as a specimen. -->
  <path d="M 159,285 C 171,225 251,187 328,141" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round"/>
  <path d="M 214,215 C 167,222 139,197 142,162 C 185,158 218,177 214,215 Z M 260,185 C 238,149 252,125 282,120 C 299,149 291,173 260,185 Z M 282,173 C 319,140 349,158 359,182 C 328,208 297,200 282,173 Z" fill="${primaryColor}" fill-opacity="0.13" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 151,171 L 211,209 M 275,130 L 263,179 M 291,176 L 347,180 M 176,184 L 171,169 M 194,195 L 176,201" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <g fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="1.5">
    <circle cx="313" cy="218" r="12"/><circle cx="335" cy="209" r="11"/><circle cx="334" cy="233" r="11"/>
  </g>
  <path d="M 310,211 L 314,209 M 332,202 L 336,201 M 331,226 L 335,225" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.5"/>
  <ellipse cx="226" cy="304" rx="82" ry="9" fill="${primaryColor}" opacity="0.08"/>
  <g transform="translate(207, 259) rotate(-29)">
    <ellipse rx="35" ry="51" fill="url(#coffee-addon-roast)"/>
    <path d="M 1,-43 C -19,-16 20,12 -2,43" fill="none" stroke="#E7C69C" stroke-width="4" stroke-linecap="round"/>
    <path d="M -20,-24 Q -29,-4 -20,16" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.16" stroke-linecap="round"/>
  </g>
  <g transform="translate(275, 268) rotate(27)">
    <ellipse rx="29" ry="43" fill="url(#coffee-addon-roast)"/>
    <path d="M 1,-35 C -14,-13 15,12 -1,35" fill="none" stroke="#E7C69C" stroke-width="3" stroke-linecap="round"/>
  </g>
  <text data-field-id="origin" data-max-width="402" x="250" y="374" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${origin}
  </text>
  <text data-field-id="process" data-max-width="398" x="250" y="416" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${process}
  </text>
  <path d="M 60,453 H 440 M 60,540 H 440" stroke="${secondaryColor}" stroke-width="1"/>
  <text data-max-width="374" x="250" y="480" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" letter-spacing="1" fill="${secondaryColor}" text-anchor="middle">
    TASTING NOTES // الإيحاءات
  </text>
  <text data-field-id="notes" data-max-width="380" x="250" y="516" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${notes}
  </text>
  <text data-field-id="weight" data-max-width="386" x="250" y="587" font-family="${fontFamily}, monospace" font-size="${Math.round(15 * fs)}" font-weight="700" letter-spacing="2" fill="${primaryColor}" text-anchor="middle">
    ${weight}
  </text>
</svg>`;
    },
  },
  {
    id: 'greeting_order_appreciation',
    name: 'ملصق شكر وتقدير عملاء المتجر',
    nameEn: 'Customer Appreciation Sticker',
    category: 'greeting',
    shape: 'circle',
    description: 'ملصق شكر أنيق يوضع مع طرود المتاجر الإلكترونية والهدايا لإسعاد العميل',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#47877B',
      secondary: '#2D514B',
      background: '#F4F7EE',
    },
    fields: [
      {
        id: 'topText',
        label: 'العبارة المقوسة',
        type: 'text',
        defaultValue: 'THANK YOU FOR YOUR ORDER',
      },
      { id: 'mainText', label: 'الشكر الرئيسي', type: 'text', defaultValue: 'شكراً لطلبك !' },
      {
        id: 'subText',
        label: 'رسالة اللطف',
        type: 'text',
        defaultValue: 'صُنع وجُهّز خصيصاً لأجلك ♡',
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
      const top = escapeXml(fields.topText || '');
      const main = escapeXml(fields.mainText || '');
      const sub = escapeXml(fields.subText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-thx-arc" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
  </defs>
  <circle cx="250" cy="250" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 88,389 Q 174,419 226,475 A 226,226 0 0,1 88,389 M 412,389 Q 326,419 274,475 A 226,226 0 0,0 412,389" fill="${primaryColor}" opacity="0.1"/>
  <!-- A handwritten note tucked into a folded, ribbon-tied envelope. -->
  <path d="M 177,202 L 250,147 L 323,202 V 266 H 177 Z" fill="${secondaryColor}"/>
  <g transform="rotate(-7 250 205)">
    <rect x="201" y="153" width="105" height="99" rx="4" fill="#FFF9EB" stroke="${primaryColor}" stroke-width="1.5"/>
    <path d="M 253,180 C 243,166 225,179 253,198 C 281,179 263,166 253,180 Z" fill="${primaryColor}"/>
    <path d="M 224,211 H 281 M 233,221 H 272" stroke="${primaryColor}" stroke-width="2" opacity="0.4" stroke-linecap="round"/>
  </g>
  <path d="M 177,202 L 250,241 L 323,202 V 266 H 177 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 177,266 L 230,226 Q 250,212 270,226 L 323,266" fill="${primaryColor}" stroke="#FFFFFF" stroke-opacity="0.25" stroke-width="1.5"/>
  <path d="M 177,250 H 323" stroke="#F4D5A1" stroke-width="3"/>
  <path d="M 250,250 C 218,230 224,269 250,250 C 277,230 284,270 250,250 M 250,250 L 239,275 M 250,250 L 263,275" fill="none" stroke="#F4D5A1" stroke-width="3" stroke-linecap="round"/>
  <path d="M 139,241 C 133,213 141,194 156,179 M 144,201 Q 121,196 128,180 Q 146,182 144,201 M 148,190 Q 146,169 163,165 Q 173,182 148,190" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round"/>
  <text data-field-id="topText" data-max-width="440" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" letter-spacing="1.5" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-thx-arc" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" data-max-width="350" x="250" y="334" font-family="${fontFamily}, sans-serif" font-size="${Math.round(43 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="330" x="250" y="377" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'food_hot_pizza',
    name: 'ملصق بيتزا ساخنة طازجة',
    nameEn: 'Hot & Fresh Pizza Seal',
    category: 'cafe',
    shape: 'circle',
    description: 'ملصق تغليف دائري لمحلات البيتزا والوجبات السريعة مع شريحة بيتزا ساخنة',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#BE4934',
      secondary: '#683F2D',
      background: '#FFF7E9',
    },
    fields: [
      {
        id: 'topText',
        label: 'العبارة العلوية',
        type: 'text',
        defaultValue: '★ HOT & FRESH PIZZA ★',
      },
      { id: 'mainText', label: 'اسم المنتج', type: 'text', defaultValue: 'بيتزا طازجة' },
      {
        id: 'subText',
        label: 'العبارة السفلية',
        type: 'text',
        defaultValue: 'ساخنة من الفرن مباشرة',
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
      const top = escapeXml(fields.topText || '');
      const main = escapeXml(fields.mainText || '');
      const sub = escapeXml(fields.subText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-pizza-top" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
    <linearGradient id="badge-pizza-cheese" x1="0" y1="0" x2="0.6" y2="1">
      <stop stop-color="#FFE6A2"/><stop offset="1" stop-color="#F3B94F"/>
    </linearGradient>
    <linearGradient id="badge-pizza-crust" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#EDB967"/><stop offset="1" stop-color="#B9682E"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <!-- Baked slice: golden crust, tomato edge, bubbling cheese and basil. -->
  <ellipse cx="257" cy="280" rx="67" ry="8" fill="${secondaryColor}" opacity="0.09"/>
  <path d="M 177,169 Q 242,133 323,166 L 264,276 Q 260,284 253,275 Z" fill="#BE6734"/>
  <path d="M 182,165 Q 244,137 317,165 L 260,273 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 191,168 Q 244,145 307,168 L 273,237 Q 267,236 267,248 Q 263,260 257,250 L 256,242 Z" fill="url(#badge-pizza-cheese)"/>
  <path d="M 177,168 Q 244,129 323,164" fill="none" stroke="url(#badge-pizza-crust)" stroke-width="20" stroke-linecap="round"/>
  <path d="M 180,162 Q 246,132 319,158" fill="none" stroke="#FFE3A3" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  <path d="M 203,156 L 207,154 M 243,145 L 247,145 M 287,152 L 291,153" stroke="#9E5128" stroke-width="4" stroke-linecap="round"/>
  <g fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="1.3">
    <circle cx="223" cy="181" r="12"/><circle cx="279" cy="180" r="11"/><circle cx="251" cy="215" r="12"/>
  </g>
  <path d="M 218,177 L 221,176 M 226,185 L 229,183 M 276,176 L 279,175 M 248,210 L 251,210 M 254,219 L 257,217" stroke="#F4AA7C" stroke-width="2" stroke-linecap="round"/>
  <path d="M 237,197 C 225,185 236,175 249,178 C 249,190 244,196 237,197 M 275,222 C 266,212 273,202 285,201 C 288,212 282,219 275,222" fill="#527442"/>
  <path d="M 238,192 L 245,183 M 276,216 L 282,207" stroke="#DDE4A6" stroke-width="1.5"/>
  <g fill="none" stroke="#4A4935" stroke-width="3"><ellipse cx="257" cy="173" rx="4" ry="3"/><ellipse cx="269" cy="201" rx="4" ry="3"/></g>
  <text data-field-id="topText" data-max-width="418" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" letter-spacing="1" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-pizza-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" data-max-width="352" x="250" y="335" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="322" x="250" y="376" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <path d="M 196,404 H 214 V 413 H 232 V 404 H 250 V 413 H 268 V 404 H 286 V 413 H 304 V 422 H 286 V 413 H 268 V 422 H 250 V 413 H 232 V 422 H 214 V 413 H 196 Z" fill="${primaryColor}"/>
</svg>`;
    },
  },
  {
    id: 'food_shawarma_grill',
    name: 'ملصق شاورما ومشويات الفحم',
    nameEn: 'Charcoal Shawarma & Grill',
    category: 'cafe',
    shape: 'rect',
    description: 'لاصق مطاعم الشاورما والمشويات العراقية والشامية على الفحم',
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: '#BC512E',
      secondary: '#513B2C',
      background: '#FBF1DF',
    },
    fields: [
      {
        id: 'restaurant',
        label: 'اسم المطعم',
        type: 'text',
        defaultValue: 'مطعم ومشويات بغداد الأصيل',
      },
      { id: 'dish', label: 'اسم الوجبة', type: 'text', defaultValue: 'شاورما دجاج ع الفحم' },
      {
        id: 'slogan',
        label: 'الشعار',
        type: 'text',
        defaultValue: 'الطعم الأصلي بتتبيلة عراقية مميزة',
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
      const rest = escapeXml(fields.restaurant || '');
      const dish = escapeXml(fields.dish || '');
      const slog = escapeXml(fields.slogan || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <defs>
    <linearGradient id="shawarma-addon-bread" x1="0" y1="0" x2="1" y2="0.8">
      <stop stop-color="#F8E3B5"/><stop offset="0.6" stop-color="#E8C17E"/><stop offset="1" stop-color="#BD824A"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="568" height="368" rx="22" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 44,98 H 556 M 279,314 H 544" stroke="${primaryColor}" stroke-width="1.5"/>
  <text data-field-id="restaurant" data-max-width="508" x="300" y="69" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${rest}
  </text>
  <!-- Open shawarma wrap: grilled chicken, parsley, tomato and garlic sauce. -->
  <ellipse cx="156" cy="343" rx="84" ry="10" fill="${secondaryColor}" opacity="0.09"/>
  <g transform="translate(153, 233) rotate(-12)">
    <path d="M -61,-73 Q -1,-105 62,-73 L 40,97 Q -5,123 -39,91 Z" fill="url(#shawarma-addon-bread)" stroke="#AD7744" stroke-width="2"/>
    <ellipse cy="-72" rx="61" ry="29" fill="#805333"/>
    <path d="M -57,-70 Q -63,-96 -43,-93 Q -37,-111 -21,-93 Q -6,-114 8,-94 Q 27,-111 37,-91 Q 59,-99 57,-72 Q 30,-51 -3,-53 Z" fill="#648647"/>
    <path d="M -43,-76 L -29,-88 L -2,-70 L -14,-61 Z M -6,-89 L 9,-100 L 39,-78 L 27,-65 Z M 14,-61 L 31,-76 L 48,-62 L 30,-52 Z" fill="#D8A267" stroke="#8E532E" stroke-width="2" stroke-linejoin="round"/>
    <path d="M -35,-80 L -16,-67 M 5,-89 L 27,-74 M 25,-61 L 34,-67" stroke="#F4C78B" stroke-width="3" stroke-linecap="round"/>
    <path d="M -52,-70 Q -38,-84 -28,-66 L -43,-57 Z M 33,-89 Q 50,-90 53,-75 L 40,-72 Z" fill="${primaryColor}" data-color-role="primary"/>
    <path d="M -43,-66 Q -16,-50 8,-69 Q 28,-85 48,-63" fill="none" stroke="#FFF2D9" stroke-width="5" stroke-linecap="round"/>
    <path d="M -57,-58 Q -3,-38 59,-57 L 35,57 L -37,75 Z" fill="url(#shawarma-addon-bread)"/>
    <path d="M -32,-18 L -7,-30 M -26,6 L 1,-7 M -18,29 L 7,17 M 19,-28 L 35,-35 M 17,-1 L 33,-9" stroke="#9D653A" stroke-width="5" stroke-linecap="round" opacity="0.75"/>
    <path d="M -46,39 L 48,20 L 39,95 Q -1,115 -39,91 Z" fill="#FFF8E9"/>
    <path d="M -46,39 L -5,59 L 48,20 M -5,59 L 5,108" fill="none" stroke="#DACCB0" stroke-width="1.5"/>
    <path d="M -43,61 L 44,42 L 42,60 L -42,79 Z" fill="${primaryColor}"/>
  </g>
  <text data-field-id="dish" data-max-width="278" x="410" y="211" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${dish}
  </text>
  <text data-field-id="slogan" data-max-width="270" x="410" y="257" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${slog}
  </text>
  <path d="M 378,150 H 442" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round"/>
</svg>`;
    },
  },
  {
    id: 'food_oriental_sweets',
    name: 'ملصق حلويات شرقية فاخرة',
    nameEn: 'Luxury Oriental Sweets',
    category: 'cafe',
    shape: 'circle',
    description: 'شارة مذهبة راقية لعلب البقلاوة والحلويات الشرقية والمناسبات',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#A87832',
      secondary: '#5D472D',
      background: '#FBF5E6',
    },
    fields: [
      {
        id: 'brand',
        label: 'اسم المتجر / المعمل',
        type: 'text',
        defaultValue: 'حلويات الرافدين الملكية',
      },
      { id: 'quality', label: 'نوع الحلويات', type: 'text', defaultValue: 'بقلاوة وحلويات شرقية' },
      {
        id: 'city',
        label: 'العبارة السفلية',
        type: 'text',
        defaultValue: 'طازج يومياً بالسمن الحر 100%',
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
      const brand = escapeXml(fields.brand || '');
      const qual = escapeXml(fields.quality || '');
      const city = escapeXml(fields.city || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-sweets-top" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
    <linearGradient id="badge-sweets-syrup" x1="0" y1="0" x2="0.7" y2="1">
      <stop stop-color="#F9D68B"/><stop offset="0.55" stop-color="#E6AD54"/><stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 60,249 L 72,235 L 84,249 L 72,263 Z M 416,249 L 428,235 L 440,249 L 428,263 Z M 232,415 L 250,397 L 268,415 L 250,433 Z" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
  <path d="M 148,403 Q 180,423 211,425 M 289,425 Q 320,423 352,403" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
  <!-- Two syrup-glazed baklava diamonds with crisp phyllo and pistachio filling. -->
  <ellipse cx="250" cy="260" rx="112" ry="18" fill="${primaryColor}" opacity="0.1"/>
  <path d="M 158,205 L 216,170 L 274,204 V 233 L 216,266 L 158,233 Z" fill="#B97C35"/>
  <path d="M 216,237 L 274,204 V 233 L 216,266 Z" fill="#946432"/>
  <path d="M 160,215 L 216,247 L 272,215 M 160,225 L 216,257 L 272,225" fill="none" stroke="#F8D68D" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 160,220 L 216,252 L 272,220" fill="none" stroke="#657444" stroke-width="3"/>
  <path d="M 158,205 L 216,170 L 274,204 L 216,237 Z" fill="url(#badge-sweets-syrup)" stroke="#BA803C" stroke-width="1.5"/>
  <path d="M 236,189 L 294,154 L 352,188 V 219 L 294,252 L 236,219 Z" fill="#B97C35"/>
  <path d="M 294,222 L 352,188 V 219 L 294,252 Z" fill="#946432"/>
  <path d="M 238,199 L 294,232 L 350,199 M 238,211 L 294,244 L 350,211" fill="none" stroke="#F8D68D" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 238,205 L 294,238 L 350,205" fill="none" stroke="#657444" stroke-width="4"/>
  <path d="M 236,189 L 294,154 L 352,188 L 294,222 Z" fill="url(#badge-sweets-syrup)" stroke="#BA803C" stroke-width="1.5"/>
  <path d="M 172,204 L 216,179 L 258,204 M 250,188 L 294,163 L 336,187" fill="none" stroke="#FFF0BC" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M 204,203 L 213,197 L 217,205 L 210,210 Z M 217,194 L 224,196 L 222,203 Z M 288,184 L 297,178 L 302,185 L 295,191 Z M 280,187 L 287,187 L 285,196 Z M 298,193 L 306,190 L 308,196 L 302,200 Z" fill="#647744"/>
  <path d="M 214,209 L 222,205 M 293,184 L 298,181" stroke="#C4CF84" stroke-width="2"/>
  <text data-field-id="brand" data-max-width="416" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-sweets-top" startOffset="50%">${brand}</textPath>
  </text>
  <text data-field-id="quality" data-max-width="360" x="250" y="331" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${qual}
  </text>
  <text data-field-id="city" data-max-width="326" x="250" y="372" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${city}
  </text>
</svg>`;
    },
  },
  {
    id: 'food_natural_honey',
    name: 'ملصق عسل سدر بري طبيعي',
    nameEn: '100% Pure Natural Honey',
    category: 'packaging',
    shape: 'rect',
    description: 'ملصق برطمانات العسل الطبيعي مع خلايا النحل وتأكيد النقاوة 100%',
    defaultWidth: 600,
    defaultHeight: 450,
    aspectRatio: 600 / 450,
    defaultColors: {
      primary: '#BC841F',
      secondary: '#624524',
      background: '#FFF7E3',
    },
    fields: [
      { id: 'title', label: 'عنوان المنتج', type: 'text', defaultValue: 'عسل سدر جبلي طبيعي' },
      { id: 'badge', label: 'شارة النقاوة', type: 'text', defaultValue: '100% PURE NATURAL HONEY' },
      {
        id: 'weight',
        label: 'الوزن الصافي',
        type: 'text',
        defaultValue: 'الوزن الصافي: 1000 غرام',
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
      const title = escapeXml(fields.title || '');
      const badge = escapeXml(fields.badge || '');
      const wt = escapeXml(fields.weight || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <defs>
    <linearGradient id="honey-addon-amber" x1="0" y1="0" x2="0.8" y2="1">
      <stop stop-color="#F7D174"/><stop offset="0.45" stop-color="${primaryColor}"/><stop offset="1" stop-color="#A76722"/>
    </linearGradient>
  </defs>
  <rect x="18" y="18" width="564" height="414" rx="28" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 49,112 H 551 M 49,379 H 551" stroke="${primaryColor}" stroke-width="1" opacity="0.55"/>
  <text data-field-id="badge" data-max-width="492" x="300" y="80" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    ${badge}
  </text>
  <!-- Glass jar, translucent amber honey and a dripping wooden dipper. -->
  <ellipse cx="445" cy="346" rx="81" ry="10" fill="${secondaryColor}" opacity="0.08"/>
  <path d="M 399,195 H 491 V 211 Q 506,220 506,237 V 322 Q 506,337 491,337 H 399 Q 384,337 384,322 V 237 Q 384,220 399,211 Z" fill="#FFF0C0" fill-opacity="0.45" stroke="${primaryColor}" stroke-width="2"/>
  <path d="M 389,246 Q 445,252 501,246 V 319 Q 501,331 488,331 H 402 Q 389,331 389,319 Z" fill="url(#honey-addon-amber)"/>
  <ellipse cx="445" cy="246" rx="56" ry="9" fill="#F3C465"/>
  <ellipse cx="445" cy="196" rx="46" ry="10" fill="#D6A150" stroke="${secondaryColor}" stroke-width="1.5"/>
  <ellipse cx="445" cy="195" rx="36" ry="5" fill="#A47232"/>
  <path d="M 398,238 V 308 Q 398,320 408,320" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" opacity="0.55"/>
  <path d="M 494,263 V 312" stroke="#8F571E" stroke-width="3" stroke-linecap="round" opacity="0.2"/>
  <path d="M 438,164 C 438,190 431,207 438,217 C 444,225 451,214 447,207 C 439,189 448,176 448,166" fill="url(#honey-addon-amber)"/>
  <g transform="translate(450, 155) rotate(28)">
    <path d="M 0,-67 V -9" stroke="#A6753F" stroke-width="10" stroke-linecap="round"/>
    <path d="M -2,-65 V -16" stroke="#E4BE7C" stroke-width="3" stroke-linecap="round"/>
    <rect x="-22" y="-16" width="44" height="38" rx="13" fill="#C5934E"/>
    <path d="M -18,-9 H 18 M -21,0 H 21 M -21,9 H 21 M -16,18 H 16" stroke="#875C2B" stroke-width="3" stroke-linecap="round"/>
    <path d="M -15,-12 H 13 M -17,5 H 15" stroke="#F2CE8A" stroke-width="2" stroke-linecap="round"/>
  </g>
  <path d="M 352,319 L 370,309 L 388,319 V 340 L 370,350 L 352,340 Z M 389,340 L 407,330 L 425,340 V 360 L 407,370 L 389,360 Z" fill="#F4CF75" stroke="${primaryColor}" stroke-width="2"/>
  <path d="M 360,324 L 370,318 L 380,324 V 335 L 370,341 L 360,335 Z M 397,345 L 407,339 L 417,345 V 355 L 407,361 L 397,355 Z" fill="${primaryColor}" fill-opacity="0.4"/>
  <path d="M 162,164 H 218" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="title" data-max-width="298" x="202" y="230" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="weight" data-max-width="288" x="202" y="285" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${wt}
  </text>
</svg>`;
    },
  },
  {
    id: 'greeting_eid_mubarak',
    name: 'ملصق عيدكم مبارك وسعيد',
    nameEn: 'Eid Mubarak Celebration',
    category: 'seasonal',
    shape: 'circle',
    description: 'ختم احتفالي مذهب لعيدي الفطر والأضحى المبارك مع هلال وأضواء',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#285D50',
      secondary: '#876535',
      background: '#F8F4E8',
    },
    fields: [
      {
        id: 'topText',
        label: 'العبارة العلوية',
        type: 'text',
        defaultValue: '★ تقبل الله منا ومنكم صالح الأعمال ★',
      },
      { id: 'mainText', label: 'التهنئة الرئيسية', type: 'text', defaultValue: 'عيدكم مبارك' },
      { id: 'subText', label: 'الدعاء', type: 'text', defaultValue: 'كل عام وأنتم بألف خير' },
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
      const top = escapeXml(fields.topText || '');
      const main = escapeXml(fields.mainText || '');
      const sub = escapeXml(fields.subText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-eid-top" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
    <linearGradient id="badge-eid-gold" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#F1D798"/><stop offset="0.5" stop-color="${secondaryColor}"/><stop offset="1" stop-color="#9B7132"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 51,258 Q 62,362 143,415 M 449,258 Q 438,362 357,415" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <!-- Open crescent geometry keeps its cutout transparent on every background. -->
  <path d="M 245,139 C 172,127 148,214 200,257 C 231,282 270,271 291,244 C 253,261 215,238 207,207 C 200,179 214,150 245,139 Z" fill="url(#badge-eid-gold)"/>
  <path d="M 216,151 C 178,166 168,217 197,244" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.4"/>
  <!-- Brass lantern with pierced panels and a warm glass core. -->
  <path d="M 308,131 V 168" stroke="${secondaryColor}" stroke-width="2"/>
  <path d="M 308,159 C 296,159 296,174 308,174 C 320,174 320,159 308,159 Z" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
  <path d="M 286,192 L 297,176 H 319 L 330,192 L 322,236 H 294 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 297,195 H 319 L 315,227 H 301 Z" fill="#F3D795"/>
  <path d="M 308,196 V 226 M 295,210 H 321 M 286,192 H 330 M 294,237 H 322 M 300,244 H 316" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round"/>
  <path d="M 308,248 V 257" stroke="${secondaryColor}" stroke-width="2"/>
  <path d="M 250,408 C 243,394 226,403 236,414 L 250,428 L 264,414 C 274,403 257,394 250,408 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <text data-field-id="topText" data-max-width="438" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    <textPath href="#badge-eid-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" data-max-width="344" x="250" y="326" font-family="${fontFamily}, sans-serif" font-size="${Math.round(43 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="322" x="250" y="380" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'greeting_wedding_congrats',
    name: 'ملصق عقد قران وزفاف مبارك',
    nameEn: 'Wedding & Marriage Congrats',
    category: 'greeting',
    shape: 'circle',
    description: 'ملصق فاخر لكروت وتوزيعات الأعراس وعقد القران مع دبلتين ذهبيتين',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#895E6E',
      secondary: '#7D694C',
      background: '#FCF6F0',
    },
    fields: [
      {
        id: 'dua',
        label: 'الدعاء النبوي',
        type: 'text',
        defaultValue: 'بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا',
      },
      { id: 'names', label: 'عنوان المناسبة', type: 'text', defaultValue: 'ألف مبروك الزواج' },
      {
        id: 'sub',
        label: 'العبارة السفلية',
        type: 'text',
        defaultValue: 'وجمع بينكما في خير وسعادة ♡',
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
      const dua = escapeXml(fields.dua || '');
      const names = escapeXml(fields.names || '');
      const sub = escapeXml(fields.sub || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-wed-top" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
    <linearGradient id="badge-wed-gold" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#F2DDA8"/><stop offset="0.4" stop-color="#C49A54"/><stop offset="0.7" stop-color="#E3C584"/><stop offset="1" stop-color="#A37B3F"/>
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="226" fill="${bg}" data-color-role="background"/>
  <path d="M 53,203 A 203,203 0 0,1 447,203 M 147,425 A 203,203 0 0,0 353,425" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <!-- Airy botanical sides leave the names and blessing unobstructed. -->
  <g fill="${primaryColor}" fill-opacity="0.16" stroke="${primaryColor}" stroke-width="1.5">
    <path d="M 72,233 Q 67,312 122,366 M 78,282 Q 52,274 55,254 Q 79,257 78,282 M 86,304 Q 93,277 108,279 Q 114,300 86,304 M 102,336 Q 73,336 73,317 Q 92,314 102,336"/>
    <path d="M 428,233 Q 433,312 378,366 M 422,282 Q 448,274 445,254 Q 421,257 422,282 M 414,304 Q 407,277 392,279 Q 386,300 414,304 M 398,336 Q 427,336 427,317 Q 408,314 398,336"/>
  </g>
  <!-- Interlocking polished bands and a faceted diamond. -->
  <circle cx="227" cy="219" r="39" fill="none" stroke="url(#badge-wed-gold)" stroke-width="10"/>
  <circle cx="279" cy="219" r="39" fill="none" stroke="url(#badge-wed-gold)" stroke-width="10"/>
  <path d="M 248,186 A 39,39 0 0,1 266,218" fill="none" stroke="url(#badge-wed-gold)" stroke-width="10"/>
  <path d="M 195,222 A 32,32 0 0,1 218,188 M 276,251 A 32,32 0 0,0 311,221" fill="none" stroke="#FFF7DC" stroke-width="2" stroke-linecap="round" opacity="0.8"/>
  <path d="M 211,172 L 220,160 H 236 L 245,172 L 228,189 Z" fill="#F5F3EB" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 211,172 H 245 M 220,160 L 228,189 L 236,160 M 220,160 L 215,172 M 236,160 L 241,172" fill="none" stroke="${secondaryColor}" stroke-width="1" opacity="0.6"/>
  <text data-field-id="dua" data-max-width="434" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-wed-top" startOffset="50%">${dua}</textPath>
  </text>
  <text data-field-id="names" data-max-width="278" x="250" y="331" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${names}
  </text>
  <text data-field-id="sub" data-max-width="306" x="250" y="391" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'greeting_baby_welcome',
    name: 'ملصق استقبال المولود الجديد',
    nameEn: 'Welcome New Baby Celebration',
    category: 'greeting',
    shape: 'circle',
    description: 'شارة لطيفة لتوزيعات المواليد الجدد وحفلات السبوع والاستقبال',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#5B8393',
      secondary: '#3F626E',
      background: '#F8F5ED',
    },
    fields: [
      {
        id: 'welcome',
        label: 'عبارة الترحيب',
        type: 'text',
        defaultValue: 'أهلاً بقدومك يا صغيري',
      },
      {
        id: 'blessing',
        label: 'اسم المولود / التهنئة',
        type: 'text',
        defaultValue: 'نورت الدنيا يا حبيبنا',
      },
      { id: 'note', label: 'الدعاء', type: 'text', defaultValue: 'جعله الله من الصالحين والبارين' },
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
      const welc = escapeXml(fields.welcome || '');
      const bless = escapeXml(fields.blessing || '');
      const note = escapeXml(fields.note || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const scallopD = scallopCirclePath(250, 250, 227, 12, 1.065);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-baby-top" d="M 78,250 A 172,172 0 0,1 422,250" fill="none"/>
    <linearGradient id="badge-baby-toy" x1="0" y1="0" x2="0.8" y2="1">
      <stop stop-color="#BFD9D9"/><stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
  </defs>
  <path d="${scallopD}" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- A friendly bear rattle, with a wooden handle and a softly shaded face. -->
  <g transform="translate(250, 209) rotate(-17)">
    <path d="M 0,21 V 47" stroke="#C49A68" stroke-width="17" stroke-linecap="round"/>
    <circle cy="63" r="21" fill="none" stroke="#D7B68A" stroke-width="12"/>
    <path d="M -14,60 A 15,15 0 0,1 0,48" fill="none" stroke="#F2D7AE" stroke-width="3" stroke-linecap="round"/>
    <circle cx="-34" cy="-42" r="20" fill="${primaryColor}"/>
    <circle cx="34" cy="-42" r="20" fill="${primaryColor}"/>
    <circle cx="-34" cy="-42" r="11" fill="#E9D2BA"/>
    <circle cx="34" cy="-42" r="11" fill="#E9D2BA"/>
    <path d="M -49,-20 C -49,-73 49,-73 49,-20 C 49,18 26,37 0,37 C -26,37 -49,18 -49,-20 Z" fill="url(#badge-baby-toy)"/>
    <path d="M -33,-33 Q -29,-48 -13,-49" fill="none" stroke="#FFFFFF" stroke-width="5" opacity="0.45" stroke-linecap="round"/>
    <ellipse cy="8" rx="23" ry="18" fill="#F5E9D8"/>
    <path d="M -21,-10 Q -16,-15 -11,-10 M 11,-10 Q 16,-15 21,-10" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M -5,3 Q 0,-1 5,3 Q 0,11 -5,3 M 0,8 V 13 M 0,13 Q -5,18 -9,13 M 0,13 Q 5,18 9,13" fill="${secondaryColor}" stroke="${secondaryColor}" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="-29" cy="5" rx="7" ry="4" fill="#DFABA0" opacity="0.8"/>
    <ellipse cx="29" cy="5" rx="7" ry="4" fill="#DFABA0" opacity="0.8"/>
  </g>
  <text data-field-id="welcome" data-max-width="410" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-baby-top" startOffset="50%">${welc}</textPath>
  </text>
  <text data-field-id="blessing" data-max-width="356" x="250" y="344" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${bless}
  </text>
  <text data-field-id="note" data-max-width="326" x="250" y="386" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
  <path d="M 221,418 Q 250,428 279,418" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>
</svg>`;
    },
  },
  {
    id: 'greeting_jummah_blessed',
    name: 'ملصق جمعة مباركة وطيبة',
    nameEn: 'Blessed Friday Floral Stamp',
    category: 'greeting',
    shape: 'square',
    description: 'ملصق بطاقات ورسائل الجمعة المباركة مع زخارف إسلامية محرابية',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#515872',
      secondary: '#8C6B45',
      background: '#F7F3ED',
    },
    fields: [
      { id: 'main', label: 'التهنئة الرئيسية', type: 'text', defaultValue: 'جمعة مباركة' },
      { id: 'dua', label: 'الدعاء', type: 'text', defaultValue: 'نورٌ بين الجمعتين ورزقٌ وفير' },
      {
        id: 'salawat',
        label: 'الصلاة على النبي',
        type: 'text',
        defaultValue: 'اللهم صلِّ على محمد وآل محمد',
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
      const main = escapeXml(fields.main || '');
      const dua = escapeXml(fields.dua || '');
      const sal = escapeXml(fields.salawat || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect x="20" y="20" width="460" height="460" rx="12" fill="${bg}" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="background"/>
  <!-- The mihrab is the composition, not a small icon above a generic frame. -->
  <path d="M 75,444 V 223 C 75,141 175,110 250,54 C 325,110 425,141 425,223 V 444 Z" fill="${primaryColor}" fill-opacity="0.04" stroke="${primaryColor}" stroke-width="2.5"/>
  <path d="M 87,430 V 226 C 87,148 183,122 250,68 C 317,122 413,148 413,226 V 430" fill="none" stroke="${secondaryColor}" stroke-width="1"/>
  <path d="M 250,90 V 110 M 250,170 V 187" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 250,112 C 242,127 222,127 230,142 C 220,157 241,155 250,171 C 259,155 280,157 270,142 C 278,127 258,127 250,112 Z" fill="${secondaryColor}" fill-opacity="0.18" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 250,125 L 261,141 L 250,157 L 239,141 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 44,98 V 58 H 94 M 406,58 H 456 V 98 M 44,402 V 442 H 58 M 442,442 H 456 V 402" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <path d="M 46,125 Q 59,138 46,151 Q 33,138 46,125 M 454,125 Q 467,138 454,151 Q 441,138 454,125" fill="${primaryColor}" fill-opacity="0.18"/>
  <text data-field-id="main" data-max-width="322" x="250" y="266" font-family="${fontFamily}, sans-serif" font-size="${Math.round(46 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${main}
  </text>
  <text data-field-id="dua" data-max-width="310" x="250" y="321" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${dua}
  </text>
  <path d="M 146,354 H 234 M 266,354 H 354 M 250,349 L 255,354 L 250,359 L 245,354 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <text data-field-id="salawat" data-max-width="308" x="250" y="399" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${sal}
  </text>
</svg>`;
    },
  },
  {
    id: 'school_notebook_label',
    name: 'ملصق تسمية الدفاتر والكتب المدرسية',
    nameEn: 'Student School Notebook Label',
    category: 'kids',
    shape: 'rect',
    description: 'ملصق مستطيل لدفاتر الطلاب المدرسية لكتابة الاسم والصف والمادة والمدرسة',
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: '#3E7595',
      secondary: '#294B63',
      background: '#F5F7F2',
    },
    fields: [
      {
        id: 'studentName',
        label: 'الاسم',
        type: 'text',
        defaultValue: 'الاسم: .......................................',
      },
      {
        id: 'grade',
        label: 'الصف والشعبة',
        type: 'text',
        defaultValue: 'الصف: .......................................',
      },
      {
        id: 'subject',
        label: 'المادة الدراسية',
        type: 'text',
        defaultValue: 'المادة: ......................................',
      },
      {
        id: 'school',
        label: 'اسم المدرسة',
        type: 'text',
        defaultValue: 'المدرسة: ....................................',
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
      const name = escapeXml(fields.studentName || '');
      const gr = escapeXml(fields.grade || '');
      const sub = escapeXml(fields.subject || '');
      const sch = escapeXml(fields.school || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="16" y="16" width="568" height="368" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 32,16 H 568 Q 584,16 584,32 V 95 H 16 V 32 Q 16,16 32,16 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 16,90 H 584" stroke="#FFFFFF" stroke-width="2" opacity="0.3"/>
  <path d="M 165,170 H 550 M 165,226 H 550 M 165,282 H 550 M 165,338 H 550" stroke="${primaryColor}" stroke-width="1" opacity="0.22"/>
  <path d="M 153,115 V 354" stroke="${primaryColor}" stroke-width="1.5" opacity="0.4"/>
  <text data-max-width="434" x="329" y="66" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
    دفتر الواجبات المدرسية
  </text>
  <!-- Book, sharpened pencil and paperclip occupy a dedicated stationery margin. -->
  <g transform="translate(80, 218) rotate(-9)">
    <rect x="-36" y="-58" width="73" height="112" rx="7" fill="${secondaryColor}"/>
    <path d="M -27,45 H 37 V 56 H -27 Q -37,51 -27,45 Z" fill="#E9E6D9" stroke="${secondaryColor}" stroke-width="1.5"/>
    <rect x="-29" y="-58" width="66" height="103" rx="5" fill="${primaryColor}"/>
    <path d="M -18,-57 V 43" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2"/>
    <rect x="-8" y="-31" width="35" height="26" rx="2" fill="#F6F2E3"/>
    <path d="M -2,-22 H 21 M -2,-14 H 14" stroke="${primaryColor}" stroke-width="1.5"/>
    <path d="M 5,34 V 58 L 12,52 L 19,58 V 34" fill="#D6A16A"/>
  </g>
  <g transform="translate(115, 182) rotate(17)">
    <path d="M -8,-48 H 8 V 45 L 0,66 L -8,45 Z" fill="#E2B565" stroke="#AC8046" stroke-width="1.5"/>
    <path d="M 0,-48 H 8 V 45 H 0 Z" fill="#F3CE88"/>
    <path d="M -8,45 H 8 L 0,66 Z" fill="#F0D5AE"/>
    <path d="M -3,58 H 3 L 0,66 Z" fill="${secondaryColor}"/>
    <rect x="-8" y="-61" width="16" height="15" rx="4" fill="#C88E84"/>
    <path d="M -8,-46 H 8" stroke="#E4DFD1" stroke-width="6"/>
  </g>
  <path d="M 83,313 L 65,338 C 53,354 74,367 85,351 L 103,326 C 110,316 97,308 90,317 L 73,341" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round"/>
  <g direction="rtl">
    <text data-field-id="studentName" data-max-width="374" x="548" y="151" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl">${name}</text>
    <text data-field-id="grade" data-max-width="374" x="548" y="207" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl">${gr}</text>
    <text data-field-id="subject" data-max-width="374" x="548" y="263" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl">${sub}</text>
    <text data-field-id="school" data-max-width="374" x="548" y="319" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl">${sch}</text>
  </g>
</svg>`;
    },
  },
  {
    id: 'school_star_student',
    name: 'وسام الطالب المتميز والمتفوق',
    nameEn: 'Star Student Honor Badge',
    category: 'kids',
    shape: 'circle',
    description: 'شارة تشجيعية وتكريمية مدرسية للطلاب المتفوقين مع نجمة ذهبية وشريط شرف',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#CC9238',
      secondary: '#70513A',
      background: '#FFF8E6',
    },
    fields: [
      { id: 'header', label: 'عنوان الوسام', type: 'text', defaultValue: 'وسام التفوق والاجتهاد' },
      { id: 'starTitle', label: 'اللقب', type: 'text', defaultValue: 'طالب متميز ★' },
      {
        id: 'cheer',
        label: 'عبارة التحفيز',
        type: 'text',
        defaultValue: 'فخورون بنجاحك وإبداعك !',
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
      const head = escapeXml(fields.header || '');
      const st = escapeXml(fields.starTitle || '');
      const ch = escapeXml(fields.cheer || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const starPoly = starPoints(250, 242, 12, 219, 210);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-star-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
    <linearGradient id="badge-student-star" x1="0" y1="0" x2="0.7" y2="1">
      <stop stop-color="#FFE8A7"/><stop offset="0.5" stop-color="#F5C65B"/><stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
  </defs>
  <path d="M 160,405 L 144,477 L 182,460 L 208,485 L 224,416 M 276,416 L 292,485 L 318,460 L 356,477 L 340,405" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 174,431 L 166,458 M 326,431 L 334,458" stroke="#FFFFFF" stroke-width="3" opacity="0.4"/>
  <polygon points="${starPoly}" fill="${bg}" stroke="${primaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="background"/>
  <!-- Rounded five-point star with shallow facets and an encouraging face. -->
  <path d="M 244,148 Q 250,137 256,148 L 274,184 L 314,190 Q 327,192 317,202 L 288,230 L 295,270 Q 297,283 285,277 L 250,258 L 215,277 Q 203,283 205,270 L 212,230 L 183,202 Q 173,192 186,190 L 226,184 Z" fill="url(#badge-student-star)" stroke="#D8A04A" stroke-width="2" stroke-linejoin="round"/>
  <path d="M 250,149 L 250,220 L 184,195 L 229,190 Z" fill="#FFFFFF" opacity="0.23"/>
  <path d="M 250,220 L 289,272 L 282,228 L 316,196 Z" fill="#B9772D" opacity="0.13"/>
  <path d="M 216,201 L 231,197 L 241,176" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
  <ellipse cx="234" cy="221" rx="3.5" ry="5" fill="${secondaryColor}"/>
  <ellipse cx="266" cy="221" rx="3.5" ry="5" fill="${secondaryColor}"/>
  <path d="M 240,238 Q 250,248 260,238" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="222" cy="234" rx="7" ry="4" fill="#D98B69" opacity="0.55"/>
  <ellipse cx="278" cy="234" rx="7" ry="4" fill="#D98B69" opacity="0.55"/>
  <text data-field-id="header" data-max-width="404" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-star-top" startOffset="50%">${head}</textPath>
  </text>
  <text data-field-id="starTitle" data-max-width="332" x="250" y="337" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${st}
  </text>
  <text data-field-id="cheer" data-max-width="308" x="250" y="379" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${ch}
  </text>
</svg>`;
    },
  },
  {
    id: 'medical_rx_pharmacy',
    name: 'ملصق صيدلية وتعليمات الوصفة الطبية (Rx)',
    nameEn: 'Pharmacy Prescription Rx Label',
    category: 'safety',
    shape: 'rect',
    description: 'ملصق صيدلية رسمي لتعليمات تعاطي الأدوية وجدول الجرعات اليومية',
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: '#28786D',
      secondary: '#244E49',
      background: '#F4F8F5',
    },
    fields: [
      {
        id: 'pharmacyName',
        label: 'اسم الصيدلية',
        type: 'text',
        defaultValue: 'صيدلية الشفاء المركزية',
      },
      {
        id: 'patient',
        label: 'اسم المريض',
        type: 'text',
        defaultValue: 'المريض: ................................',
      },
      {
        id: 'instructions',
        label: 'إرشادات الجرعة',
        type: 'text',
        defaultValue: 'الجرعة: ملعقة واحدة بعد الأكل مرتين يومياً',
      },
      {
        id: 'warning',
        label: 'تنبيه الحفظ',
        type: 'text',
        defaultValue: 'يُحفظ بعيداً عن متناول الأطفال وأشعة الشمس',
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
      const ph = escapeXml(fields.pharmacyName || '');
      const pat = escapeXml(fields.patient || '');
      const ins = escapeXml(fields.instructions || '');
      const warn = escapeXml(fields.warning || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="16" y="16" width="568" height="368" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M 34,104 H 566" stroke="${primaryColor}" stroke-width="2"/>
  <!-- Quiet clinical hierarchy with distinct identity, patient and dose areas. -->
  <rect x="39" y="37" width="57" height="49" rx="10" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 60,47 H 75 V 54 H 83 V 69 H 75 V 77 H 60 V 69 H 52 V 54 H 60 Z" fill="#FFFFFF"/>
  <text data-field-id="pharmacyName" data-max-width="424" x="336" y="72" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${ph}
  </text>
  <text data-field-id="patient" data-max-width="492" x="548" y="158" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl">
    ${pat}
  </text>
  <path d="M 52,177 H 548" stroke="${secondaryColor}" stroke-opacity="0.2" stroke-width="1"/>
  <rect x="38" y="201" width="524" height="81" rx="6" fill="${primaryColor}" fill-opacity="0.06" stroke="${primaryColor}" stroke-width="1.5"/>
  <path d="M 112,216 V 267" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="1"/>
  <g transform="translate(76, 241) rotate(35)">
    <rect x="-12" y="-23" width="24" height="46" rx="12" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
    <path d="M -11,0 H 11 V 10 A 11,11 0 0,1 -11,10 Z" fill="${primaryColor}" fill-opacity="0.22"/>
    <path d="M -12,0 H 12 M -5,-13 V -7" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round"/>
  </g>
  <text data-field-id="instructions" data-max-width="414" x="337" y="248" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${ins}
  </text>
  <path d="M 38,312 H 562" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.2"/>
  <text data-field-id="warning" data-max-width="498" x="300" y="349" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ⚠ ${warn}
  </text>
</svg>`;
    },
  },
  {
    id: 'medical_keep_cold',
    name: 'ملصق تنبيه: يُحفظ مبرداً (2°-8°C)',
    nameEn: 'Medical Keep Refrigerated (2-8C)',
    category: 'safety',
    shape: 'rect',
    description: 'ملصق تحذيري للأدوية واللقاحات والمستحضرات الحيوية التي تتطلب تبريداً مستمراً',
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: '#357C9C',
      secondary: '#264F66',
      background: '#F2F8F9',
    },
    fields: [
      {
        id: 'alertHeader',
        label: 'عنوان التنبيه',
        type: 'text',
        defaultValue: 'تنبيه طبي: مستحضر حيوي مبرد',
      },
      {
        id: 'tempRange',
        label: 'درجة الحرارة المطلوبة',
        type: 'text',
        defaultValue: 'يُحفظ مبرداً بين 2° إلى 8°C',
      },
      {
        id: 'warningText',
        label: 'التحذير الإضافي',
        type: 'text',
        defaultValue: 'ممنوع التجميد نهائياً - DO NOT FREEZE',
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
      const al = escapeXml(fields.alertHeader || '');
      const tmp = escapeXml(fields.tempRange || '');
      const wrn = escapeXml(fields.warningText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="16" y="16" width="568" height="368" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <path d="M 32,16 H 43 V 384 H 32 Q 16,384 16,368 V 32 Q 16,16 32,16 Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="alertHeader" data-max-width="494" x="313" y="74" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${al}
  </text>
  <path d="M 69,104 H 557 M 214,132 V 263" stroke="${primaryColor}" stroke-width="1.5" opacity="0.3"/>
  <!-- Thermometer and complete six-arm cold symbol, with print-safe line weights. -->
  <path d="M 113,224 V 146 A 13,13 0 0,1 139,146 V 224 A 25,25 0 1,1 113,224 Z" fill="${primaryColor}" fill-opacity="0.08" stroke="${primaryColor}" stroke-width="3"/>
  <path d="M 126,176 V 242" stroke="${primaryColor}" stroke-width="8" stroke-linecap="round"/>
  <circle cx="126" cy="244" r="14" fill="${primaryColor}"/>
  <path d="M 144,156 H 152 M 144,174 H 149 M 144,192 H 152 M 144,210 H 149" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round"/>
  <g transform="translate(177, 149)" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 0,-20 V 20 M -17,-10 L 17,10 M -17,10 L 17,-10 M -5,-16 L 0,-11 L 5,-16 M -5,16 L 0,11 L 5,16 M -16,-4 L -10,-6 L -11,-12 M 16,4 L 10,6 L 11,12 M -16,4 L -10,6 L -11,12 M 16,-4 L 10,-6 L 11,-12"/>
  </g>
  <path d="M 245,148 H 550 V 249 H 245" fill="${primaryColor}" fill-opacity="0.06"/>
  <text data-field-id="tempRange" data-max-width="298" x="399" y="209" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${tmp}
  </text>
  <rect x="69" y="299" width="486" height="54" rx="5" fill="#A63B3B"/>
  <text data-field-id="warningText" data-max-width="458" x="312" y="332" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    ⛔ ${wrn}
  </text>
</svg>`;
    },
  },
];
