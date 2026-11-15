import { cornerBracketsMarkup, speechBubblePath, sunRaysPath } from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const GREETING_TEMPLATES: StickerTemplate[] = [
  {
    id: 'greeting_thanks_bubble',
    name: 'بطاقة شكر بفقاعة كلام',
    nameEn: 'Thank You Speech Bubble',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة شكر عصرية بفقاعة كلام مكتوبة بخط اليد ومنحنيات ناعمة',
    defaultWidth: 520,
    defaultHeight: 360,
    aspectRatio: 520 / 360,
    defaultMm: { width: 60, height: 42 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 492, height: 332, rx: 20 },
    defaultColors: {
      primary: '#51406F',
      secondary: '#D98F91',
      background: '#FAF3EE',
    },
    fields: [
      { id: 'mainText', label: 'عبارة الشكر', type: 'text', defaultValue: 'شكراً جزيلاً!' },
      {
        id: 'subText',
        label: 'الرسالة الثانوية',
        type: 'text',
        defaultValue: 'طلبك يعني لنا الكثير',
      },
      { id: 'handle', label: 'الحساب أو المتجر', type: 'text', defaultValue: '@YourStore.iq' },
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
      const main = escapeXml(fields.mainText || 'شكراً جزيلاً!');
      const sub = escapeXml(fields.subText || 'طلبك يعني لنا الكثير');
      const handle = escapeXml(fields.handle || '@YourStore.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const bubble = speechBubblePath(52, 42, 408, 192, 32, 34, 46);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360" width="520" height="360">
  <rect x="14" y="14" width="492" height="332" rx="20" fill="${bg}" data-color-role="background"/>
  <path d="${bubble}" transform="translate(8 8)" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="${bubble}" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="mainText" data-max-width="344" x="256" y="133" font-family="${fontFamily}, sans-serif" font-size="${Math.round(45 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${main}
  </text>
  <path d="M 218,153 Q 256,160 294,153" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="subText" data-max-width="344" x="256" y="198" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${backgroundColor}" text-anchor="middle">
    ${sub}
  </text>
  <text data-field-id="handle" data-max-width="274" x="275" y="302" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${handle}
  </text>
  <path d="M 433,299 C 412,287 416,271 427,273 Q 434,274 437,281 Q 443,272 450,278 C 461,290 445,298 433,306 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 184,315 Q 272,320 361,315" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-linecap="round" data-color-role="secondary"/>
</svg>`;
    },
  },
  {
    id: 'greeting_sunburst_seal',
    name: 'ختم شمس الاحتفال',
    nameEn: 'Sunburst Celebration Seal',
    category: 'greeting',
    shape: 'circle',
    description: 'ختم دائري بأشعة شمس متوهجة للتهاني والإنجازات والمناسبات السعيدة',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 250, cy: 250, r: 237 },
    defaultColors: {
      primary: '#BF7234',
      secondary: '#623E2F',
      background: '#FFF4DC',
    },
    fields: [
      { id: 'topText', label: 'النص العلوي', type: 'text', defaultValue: 'ألف مبروك' },
      { id: 'centerText', label: 'الكلمة المركزية', type: 'text', defaultValue: 'النجاح' },
      { id: 'bottomText', label: 'النص السفلي', type: 'text', defaultValue: 'تستحق كل التهنئة' },
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
      const top = escapeXml(fields.topText || 'ألف مبروك');
      const center = escapeXml(fields.centerText || 'النجاح');
      const bottom = escapeXml(fields.bottomText || 'تستحق كل التهنئة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const rays = sunRaysPath(250, 250, 194, 237, 24, 0.34);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <circle cx="250" cy="250" r="190" fill="${bg}" data-color-role="background"/>
  <path d="${rays}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="182" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <path d="M 223,118 Q 250,102 277,118 M 236,101 L 232,92 M 250,97 V 86 M 264,101 L 268,92" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="topText" data-max-width="258" x="250" y="177" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${top}
  </text>
  <text data-field-id="centerText" data-max-width="308" x="250" y="259" font-family="${fontFamily}, sans-serif" font-size="${Math.round(60 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${center}
  </text>
  <path d="M 213,282 Q 250,289 287,282" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="bottomText" data-max-width="280" x="250" y="325" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
    ${bottom}
  </text>
  <path d="M 197,358 Q 211,381 246,383 M 303,358 Q 289,381 254,383" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 206,369 Q 188,370 188,354 Q 200,352 206,369 Z M 223,379 Q 205,389 199,375 Q 211,369 223,379 Z M 238,383 Q 229,395 219,388 Q 225,378 238,383 Z M 294,369 Q 312,370 312,354 Q 300,352 294,369 Z M 277,379 Q 295,389 301,375 Q 289,369 277,379 Z M 262,383 Q 271,395 281,388 Q 275,378 262,383 Z" fill="${primaryColor}" data-color-role="primary"/>
</svg>`;
    },
  },
  {
    id: 'greeting_stitched_badge',
    name: 'شارة شكر بخياطة يدوية',
    nameEn: 'Hand-Stitched Thanks Badge',
    category: 'greeting',
    shape: 'circle',
    description: 'شارة بأسلوب الخياطة اليدوية والنسيج لهدايا المتاجر الحرفية والباقات',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'circle', cx: 250, cy: 250, r: 225 },
    defaultColors: {
      primary: '#475C54',
      secondary: '#C3836F',
      background: '#F6F0E6',
    },
    fields: [
      { id: 'mainText', label: 'النص الرئيسي', type: 'text', defaultValue: 'مصنوع بحب' },
      { id: 'subText', label: 'النص الفرعي', type: 'text', defaultValue: 'مع كل خيط وخياطة' },
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
      const main = escapeXml(fields.mainText || 'مصنوع بحب');
      const sub = escapeXml(fields.subText || 'مع كل خيط وخياطة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <circle cx="250" cy="250" r="225" fill="${bg}" data-color-role="background"/>
  <circle cx="250" cy="250" r="208" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="7 9" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 247,203 C 223,183 195,163 199,139 C 203,113 233,112 247,134 C 263,108 295,116 297,142 C 299,165 274,187 247,203 Z" fill="${secondaryColor}" fill-opacity="0.16" stroke="${secondaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="secondary"/>
  <path d="M 247,188 C 227,172 208,155 211,140 C 214,124 237,130 247,148 C 258,128 280,124 285,140 C 290,156 267,179 247,188 Z" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="4 5" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 247,203 C 270,222 318,205 313,180 C 308,157 291,173 307,185 C 325,198 343,165 322,121" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 306,152 L 335,91 Q 339,85 342,88 Q 345,91 341,98 Z M 336,99 L 340,91" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary"/>
  <text data-field-id="mainText" data-max-width="342" x="250" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(46 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="318" x="250" y="333" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <path d="M 220,372 L 228,380 M 228,372 L 220,380 M 246,372 L 254,380 M 254,372 L 246,380 M 272,372 L 280,380 M 280,372 L 272,380" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
</svg>`;
    },
  },
  {
    id: 'greeting_luxury_gift_tag',
    name: 'بطاقة إهداء بشريط فاخر',
    nameEn: 'Luxury Ribbon Gift Tag',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة إهداء فاخرة بشريط مزخرف لهدايا المناسبات والطلبات الخاصة',
    defaultWidth: 520,
    defaultHeight: 340,
    aspectRatio: 520 / 340,
    defaultMm: { width: 75, height: 48 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 492, height: 312, rx: 18 },
    defaultColors: {
      primary: '#581C3C',
      secondary: '#C59B5F',
      background: '#FFFBF5',
    },
    fields: [
      { id: 'headline', label: 'عبارة الإهداء', type: 'text', defaultValue: 'هدية خاصة بكل حب' },
      {
        id: 'recipient',
        label: 'إلى / من',
        type: 'text',
        defaultValue: 'نتمنى لك يوماً مليئاً بالسعادة',
      },
      { id: 'sender', label: 'التوقيع', type: 'text', defaultValue: 'مع أرق التحيات' },
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
      const headline = escapeXml(fields.headline || 'هدية خاصة بكل حب');
      const recipient = escapeXml(fields.recipient || 'نتمنى لك يوماً مليئاً بالسعادة');
      const sender = escapeXml(fields.sender || 'مع أرق التحيات');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">
  <defs>
    <radialGradient id="glg-aura" cx="50%" cy="32%" r="60%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="492" height="312" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="492" height="312" rx="18" fill="url(#glg-aura)"/>
  <rect x="26" y="26" width="468" height="288" rx="12" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <!-- Satin ribbon bow emblem -->
  <path d="M 260,82 C 232,54 202,68 214,90 C 222,102 246,96 260,86 C 274,96 298,102 306,90 C 318,68 288,54 260,82 Z" fill="${secondaryColor}" fill-opacity="0.32" stroke="${primaryColor}" stroke-width="2.2" data-color-role="secondary"/>
  <path d="M 248,92 L 228,122 L 244,114 L 254,124 M 272,92 L 292,122 L 276,114 L 266,124" fill="none" stroke="${primaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary"/>
  <circle cx="260" cy="85" r="7" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="headline" data-max-width="410" x="260" y="182" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${headline}
  </text>
  <text data-field-id="recipient" data-max-width="400" x="260" y="232" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${recipient}
  </text>
  <rect x="148" y="256" width="224" height="40" rx="20" fill="${secondaryColor}" fill-opacity="0.22" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="sender" data-max-width="196" x="260" y="282" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${sender}
  </text>
</svg>`;
    },
  },
  {
    id: 'greeting_floral_wreath',
    name: 'إكليل زهور المناسبات',
    nameEn: 'Floral Wreath Occasion Seal',
    category: 'greeting',
    shape: 'circle',
    description: 'ختم دائري بإكليل أوراق وزهور لأعراس والتخرج والتهاني الراقية',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 250, cy: 250, r: 230 },
    defaultColors: {
      primary: '#2E4F4F',
      secondary: '#C77D63',
      background: '#FCF9F2',
    },
    fields: [
      { id: 'occasion', label: 'المناسبة / العبارة', type: 'text', defaultValue: 'زفاف سعيد' },
      { id: 'names', label: 'الأسماء أو الإهداء', type: 'text', defaultValue: 'علي وزينب' },
      { id: 'date', label: 'التاريخ أو الملاحظة', type: 'text', defaultValue: 'تشرين الثاني 2026' },
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
      const occasion = escapeXml(fields.occasion || 'زفاف سعيد');
      const names = escapeXml(fields.names || 'علي وزينب');
      const date = escapeXml(fields.date || 'تشرين الثاني 2026');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <circle cx="250" cy="250" r="230" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <circle cx="250" cy="250" r="212" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="4 5" data-color-role="secondary"/>
  <!-- Symmetrical botanical wreath -->
  <path d="M 102,250 C 102,150 164,96 226,86 M 398,250 C 398,150 336,96 274,86 M 102,250 C 102,350 164,404 226,414 M 398,250 C 398,350 336,404 274,414" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 118,194 C 94,186 92,164 112,160 C 128,164 128,182 118,194 Z M 148,144 C 128,128 134,108 154,112 C 166,120 160,136 148,144 Z M 382,194 C 406,186 408,164 388,160 C 372,164 372,182 382,194 Z M 352,144 C 372,128 366,108 346,112 C 334,120 340,136 352,144 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="250" cy="86" r="10" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="250" cy="414" r="8" fill="${secondaryColor}"/>
  <text data-field-id="occasion" data-max-width="290" x="250" y="190" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${occasion}
  </text>
  <text data-field-id="names" data-max-width="320" x="250" y="268" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${names}
  </text>
  <path d="M 166,304 H 334" stroke="${secondaryColor}" stroke-width="1.5"/>
  <text data-field-id="date" data-max-width="270" x="250" y="346" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${date}
  </text>
</svg>`;
    },
  },
  {
    id: 'greeting_vip_invitation',
    name: 'بطاقة دعوة وختم VIP',
    nameEn: 'VIP Event Invitation Seal',
    category: 'greeting',
    shape: 'rect',
    description: 'ملصق دعوات رسمي لحفلات الافتتاح والمؤتمرات والمناسبات الخاصة',
    defaultWidth: 520,
    defaultHeight: 340,
    aspectRatio: 520 / 340,
    defaultMm: { width: 75, height: 48 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 496, height: 316, rx: 16 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#C69749',
      background: '#FFFDF8',
    },
    fields: [
      { id: 'eventTitle', label: 'عنوان المناسبة', type: 'text', defaultValue: 'دعوة حضور خاصة' },
      {
        id: 'guestNote',
        label: 'تفاصيل الدعوة',
        type: 'text',
        defaultValue: 'يسرنا تشريفكم في حفل الافتتاح',
      },
      {
        id: 'venue',
        label: 'التاريخ والمكان',
        type: 'text',
        defaultValue: 'فندق بغداد • الساعة 7 مساءً',
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
      const eventTitle = escapeXml(fields.eventTitle || 'دعوة حضور خاصة');
      const guestNote = escapeXml(fields.guestNote || 'يسرنا تشريفكم في حفل الافتتاح');
      const venue = escapeXml(fields.venue || 'فندق بغداد • الساعة 7 مساءً');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">
  <defs>
    <linearGradient id="gvi-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="gvi-clip">
      <rect x="12" y="12" width="496" height="316" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="496" height="316" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#gvi-clip)">
    <rect x="12" y="12" width="496" height="18" fill="url(#gvi-hdr)" data-color-role="secondary"/>
    <rect x="12" y="310" width="496" height="18" fill="url(#gvi-hdr)"/>
  </g>
  ${cornerBracketsMarkup(28, 44, 464, 252, 18, secondaryColor, 2, 'secondary')}
  <polygon points="260,54 274,72 260,90 246,72" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="eventTitle" data-max-width="410" x="260" y="148" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${eventTitle}
  </text>
  <text data-field-id="guestNote" data-max-width="408" x="260" y="202" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${guestNote}
  </text>
  <path d="M 130,228 H 390" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1.5"/>
  <text data-field-id="venue" data-max-width="400" x="260" y="268" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${venue}
  </text>
</svg>`;
    },
  },
];
