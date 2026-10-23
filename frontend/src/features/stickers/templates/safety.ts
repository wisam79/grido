import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const SAFETY_TEMPLATES: StickerTemplate[] = [
  {
    id: 'safety_no_blade',
    name: 'ممنوع استخدام شفرة للفتح',
    nameEn: 'Do Not Open with Blade',
    category: 'safety',
    shape: 'rect',
    description: 'ملصق تحذيري لحماية محتويات الصندوق والملابس من التمزق بشفرة القاطع',
    defaultWidth: 500,
    defaultHeight: 340,
    aspectRatio: 500 / 340,
    defaultMm: { width: 70, height: 48 },
    defaultColors: {
      primary: '#DC2626',
      secondary: '#0F172A',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'warningTitle',
        label: 'عنوان التحذير',
        type: 'text',
        defaultValue: 'لا تستخدم شفرة للفتح',
      },
      {
        id: 'enWarning',
        label: 'النص بالإنجليزية',
        type: 'text',
        defaultValue: 'DO NOT OPEN WITH BLADE',
      },
      { id: 'subText', label: 'التوجيه', type: 'text', defaultValue: 'المحتوى حساس للخدش والتمزق' },
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
      const title = escapeXml(fields.warningTitle || 'لا تستخدم شفرة للفتح');
      const en = escapeXml(fields.enWarning || 'DO NOT OPEN WITH BLADE');
      const sub = escapeXml(fields.subText || 'المحتوى حساس للخدش والتمزق');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340">
  <rect x="12" y="12" width="476" height="316" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <text data-field-id="warningTitle" data-max-width="420" x="250" y="64" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <path d="M36 85H464" stroke="${primaryColor}" stroke-width="1" opacity="0.35"/>
  <g transform="rotate(35 250 163)" stroke="${secondaryColor}" stroke-linejoin="round" data-color-role="secondary">
    <rect x="239" y="111" width="22" height="66" rx="5" fill="${secondaryColor}" stroke-width="2"/>
    <path d="M240 177H260V199L240 216Z M240 191H260 M240 202L253 199" fill="none" stroke-width="3"/>
    <path d="M246 123V159 M254 123V159" stroke="${backgroundColor}" stroke-width="2"/>
  </g>
  <g fill="none" stroke="${primaryColor}" stroke-width="9" data-color-role="primary">
    <circle cx="250" cy="163" r="64"/>
    <path d="M205 118L295 208"/>
  </g>
  <text data-field-id="enWarning" data-max-width="414" x="250" y="266" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${en}
  </text>
  <text data-field-id="subText" data-max-width="414" x="250" y="306" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'safety_flammable',
    name: 'سائل سريع الاشتعال',
    nameEn: 'Flammable Liquid Warning',
    category: 'safety',
    shape: 'square',
    description: 'ملصق السلامة الدولي للمواد القابلة للاشتعال والعطور والمذيبات',
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: '#DC2626',
      secondary: '#000000',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'mainText', label: 'التحذير', type: 'text', defaultValue: 'سائل سريع الاشتعال' },
      { id: 'enText', label: 'النص بالإنجليزية', type: 'text', defaultValue: 'FLAMMABLE LIQUID' },
      { id: 'hazardClass', label: 'فئة الخطر الدولي', type: 'text', defaultValue: 'CLASS 3' },
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
      const main = escapeXml(fields.mainText || 'سائل سريع الاشتعال');
      const en = escapeXml(fields.enText || 'FLAMMABLE LIQUID');
      const cls = escapeXml(fields.hazardClass || 'CLASS 3');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <!-- Keep the red hazard diamond and black flame; do not soften the safety geometry. -->
  <path d="M230 18L442 230L230 442L18 230Z" fill="${bg}" data-color-role="background"/>
  <path d="M230 18L442 230L230 442L18 230Z" fill="none" stroke="${primaryColor}" stroke-width="9" stroke-linejoin="miter" data-color-role="primary"/>
  <g fill="${secondaryColor}" data-color-role="secondary">
    <path d="M225 96C240 123 222 137 239 151C241 138 252 130 253 118C275 139 284 161 284 180C284 211 261 231 230 231C199 231 178 211 178 181C178 163 189 145 201 136C198 157 207 166 216 170C207 145 231 128 225 96ZM230 175C233 190 251 194 251 207C251 219 242 225 230 225C218 225 210 217 210 207C210 194 224 189 230 175Z" fill-rule="evenodd"/>
    <path d="M183 238H277V244H183Z"/>
  </g>
  <text data-field-id="mainText" data-max-width="304" x="230" y="286" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="enText" data-max-width="236" x="230" y="323" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="0.5">
    ${en}
  </text>
  <text data-field-id="hazardClass" data-max-width="126" x="230" y="372" font-family="${fontFamily}, monospace" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${cls}
  </text>
</svg>`;
    },
  },
  {
    id: 'safety_keep_frozen',
    name: 'يحفظ مجمداً (-18°C)',
    nameEn: 'Keep Frozen (-18°C)',
    category: 'safety',
    shape: 'rect',
    description: 'ملصق لسلسلة التبريد والأطعمة واللقاحات والمستحضرات الحساسة للحرارة',
    defaultWidth: 500,
    defaultHeight: 340,
    aspectRatio: 500 / 340,
    defaultMm: { width: 70, height: 48 },
    defaultColors: {
      primary: '#0284C7',
      secondary: '#0369A1',
      background: '#F0F9FF',
    },
    fields: [
      { id: 'mainText', label: 'تعليمات الحفظ', type: 'text', defaultValue: 'يُحفظ مجمداً' },
      { id: 'temp', label: 'درجة الحرارة', type: 'text', defaultValue: '-18°C / 0°F' },
      {
        id: 'enText',
        label: 'النص بالإنجليزية',
        type: 'text',
        defaultValue: 'KEEP FROZEN - DO NOT THAW',
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
      const main = escapeXml(fields.mainText || 'يُحفظ مجمداً');
      const temp = escapeXml(fields.temp || '-18°C / 0°F');
      const en = escapeXml(fields.enText || 'KEEP FROZEN - DO NOT THAW');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340">
  <rect x="12" y="12" width="476" height="316" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- Six equal branches keep the cold-chain pictogram clear without a font glyph. -->
  <g transform="translate(250 80)" fill="none" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <path d="M0-40V40M-34.6-20L34.6 20M-34.6 20L34.6-20"/>
    <path d="M-10-31L0-21L10-31M-10 31L0 21L10 31"/>
    <path d="M-10-31L0-21L10-31M-10 31L0 21L10 31" transform="rotate(60)"/>
    <path d="M-10-31L0-21L10-31M-10 31L0 21L10 31" transform="rotate(120)"/>
  </g>
  <text data-field-id="mainText" data-max-width="416" x="250" y="173" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${main}
  </text>
  <text data-field-id="temp" data-max-width="408" x="250" y="240" font-family="${fontFamily}, monospace" font-size="${Math.round(43 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${temp}
  </text>
  <path d="M40 266H460" stroke="${primaryColor}" stroke-width="1" opacity="0.35"/>
  <text data-field-id="enText" data-max-width="416" x="250" y="300" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: 'safety_lithium_battery',
    name: 'بطارية ليثيوم (UN3481)',
    nameEn: 'Lithium Battery Shipping Label',
    category: 'safety',
    shape: 'rect',
    description: 'ملصق الشحن الجوي والبري الإلزامي للأجهزة التي تحتوي على بطاريات ليثيوم',
    defaultWidth: 500,
    defaultHeight: 380,
    aspectRatio: 500 / 380,
    defaultMm: { width: 80, height: 60 },
    defaultColors: {
      primary: '#DC2626',
      secondary: '#0F172A',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'unCode', label: 'رمز الأمم المتحدة UN', type: 'text', defaultValue: 'UN 3481' },
      {
        id: 'contactPhone',
        label: 'هاتف الطوارئ والاستفسار',
        type: 'text',
        defaultValue: '+964 770 123 4567',
      },
      { id: 'title', label: 'عنوان الشحنة', type: 'text', defaultValue: 'LITHIUM ION BATTERIES' },
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
      const un = escapeXml(fields.unCode || 'UN 3481');
      const phone = escapeXml(fields.contactPhone || '+964 770 123 4567');
      const title = escapeXml(fields.title || 'LITHIUM ION BATTERIES');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      // Aggregate the diagonal safety hatching into two paths, with no patterns or filters.
      const horizontalStripes = Array.from({ length: 19 }, (_, i) => {
        const x = 28 + i * 24;
        return `M${x} 16h16l-12 12h-16ZM${x} 352h16l-12 12h-16Z`;
      }).join('');
      const verticalStripes = Array.from({ length: 14 }, (_, i) => {
        const y = 28 + i * 24;
        return `M16 ${y}v16l12-12v-16ZM472 ${y}v16l12-12v-16Z`;
      }).join('');

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 380" width="500" height="380">
  <rect x="16" y="16" width="468" height="348" fill="${bg}" data-color-role="background"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="${horizontalStripes}"/>
    <path d="${verticalStripes}"/>
  </g>
  <!-- Two batteries, one damaged and emitting flame; black pictogram on the safety surface. -->
  <g fill="${secondaryColor}" data-color-role="secondary">
    <path d="M166 76H200V134H166ZM175 68H191V76H175Z"/>
    <path d="M211 93H250L263 105L255 118L269 134H211ZM264 93H325V134H279L267 119L275 104Z"/>
    <path d="M291 42C305 61 291 68 302 77C306 70 310 65 311 59C324 76 326 83 320 89H282C274 82 279 67 286 62C284 71 289 76 293 77C286 64 297 56 291 42Z"/>
    <path d="M156 139H336V143H156Z"/>
  </g>
  <text data-field-id="title" data-max-width="412" x="250" y="187" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${title}
  </text>
  <text data-field-id="unCode" data-max-width="412" x="250" y="249" font-family="${fontFamily}, monospace" font-size="${Math.round(43 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${un}
  </text>
  <path d="M48 270H452" stroke="${secondaryColor}" stroke-width="1" opacity="0.25"/>
  <text data-max-width="404" x="250" y="299" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
    For additional information:
  </text>
  <text data-field-id="contactPhone" data-max-width="404" x="250" y="334" font-family="${fontFamily}, monospace" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
];
