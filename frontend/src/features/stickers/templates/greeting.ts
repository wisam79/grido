import { speechBubblePath, sunRaysPath } from './svg-elements';
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
];
