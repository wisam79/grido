import { generateBarcodeInnerSvg } from '../lib/barcode-svg';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const SHIPPING_TEMPLATES: StickerTemplate[] = [
  {
    id: 'shipping_fragile',
    name: 'قابل للكسر (احذر)',
    nameEn: 'Fragile (Handle with Care)',
    category: 'shipping',
    description: 'ملصق تحذيري دولي للشحنات الحساسة والزجاجية مع رمز الكأس وباركود',
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultMm: { width: 120, height: 80 },
    defaultColors: {
      primary: '#DC2626',
      secondary: '#1F2937',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'mainWarning', label: 'عنوان التحذير', type: 'text', defaultValue: 'قابل للكسر' },
      {
        id: 'subWarning',
        label: 'التعليمات اللوجستية',
        type: 'text',
        defaultValue: 'يُرجى التعامل معه بعناية فائقة',
      },
      { id: 'tracking', label: 'رمز التتبع أو الشحنة', type: 'text', defaultValue: 'FRG-9842-EXP' },
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
      const main = escapeXml(fields.mainWarning || 'قابل للكسر');
      const sub = escapeXml(fields.subWarning || 'يُرجى التعامل معه بعناية فائقة');
      const track = escapeXml(fields.tracking || 'FRG-9842-EXP');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(fields.tracking || 'FRG-9842-EXP', 'CODE128', {
        lineColor: secondaryColor,
        width: 300,
        height: 48,
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="15" y="15" width="570" height="370" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M21 15H579Q585 15 585 21V118H15V21Q15 15 21 15Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="mainWarning" data-max-width="514" x="300" y="86" font-family="${fontFamily}, sans-serif" font-size="${Math.round(46 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${main}
  </text>
  <!-- Broken goblet: a clear bowl, continuous stem and level foot. -->
  <g fill="none" stroke="${primaryColor}" stroke-linejoin="round" data-color-role="primary">
    <path d="M68 165H160L155 207C153 233 137 247 114 247C91 247 75 233 73 207Z" stroke-width="6"/>
    <path d="M114 247V308M85 308H143" stroke-width="7"/>
    <path d="M118 166L106 190L121 207L107 232" stroke-width="4"/>
  </g>
  <path d="M188 146V352" stroke="${secondaryColor}" stroke-width="1" opacity="0.2"/>
  <text data-max-width="324" x="360" y="187" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    FRAGILE - HANDLE WITH CARE
  </text>
  <text data-field-id="subWarning" data-max-width="324" x="360" y="234" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <!-- Opaque quiet zone stays white even when the label background is transparent. -->
  <rect x="190" y="263" width="340" height="72" fill="#FFFFFF"/>
  <g transform="translate(210, 275)">
    ${innerBarcode}
  </g>
  <text data-field-id="tracking" data-max-width="324" x="360" y="357" font-family="${fontFamily}, monospace" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2" direction="ltr" unicode-bidi="embed">
    * ${track} *
  </text>
</svg>`;
    },
  },
  {
    id: 'shipping_this_way_up',
    name: 'هذا الجانب لأعلى',
    nameEn: 'This Way Up',
    category: 'shipping',
    description: 'ملصق اتجاه الصندوق لتفادي انقلاب الطرود والمعدات الحساسة',
    defaultWidth: 400,
    defaultHeight: 500,
    aspectRatio: 400 / 500,
    defaultMm: { width: 80, height: 100 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#0284C7',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'topTitle', label: 'النص العلوي', type: 'text', defaultValue: 'هذا الجانب لأعلى' },
      { id: 'enTitle', label: 'النص بالإنجليزية', type: 'text', defaultValue: 'THIS WAY UP' },
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
      const ar = escapeXml(fields.topTitle || 'هذا الجانب لأعلى');
      const en = escapeXml(fields.enTitle || 'THIS WAY UP');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect x="15" y="15" width="370" height="470" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- Equal shafts and square baseline preserve the familiar handling pictogram. -->
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M128 64L184 129H146V277H110V129H72Z"/>
    <path d="M272 64L328 129H290V277H254V129H216Z"/>
    <path d="M72 291H328V307H72Z"/>
  </g>
  <text data-field-id="topTitle" data-max-width="320" x="200" y="374" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${ar}
  </text>
  <text data-field-id="enTitle" data-max-width="308" x="200" y="430" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" letter-spacing="3" data-color-role="secondary">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: 'shipping_keep_dry',
    name: 'يحفظ بعيداً عن الماء',
    nameEn: 'Keep Dry',
    category: 'shipping',
    description: 'ملصق الحماية من الرطوبة والمطر مع رمز المظلة والقطرات',
    defaultWidth: 400,
    defaultHeight: 500,
    aspectRatio: 400 / 500,
    defaultMm: { width: 80, height: 100 },
    defaultColors: {
      primary: '#0284C7',
      secondary: '#0F172A',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'mainText', label: 'النص العربي', type: 'text', defaultValue: 'يُحفظ في مكان جاف' },
      { id: 'enText', label: 'النص الإنجليزي', type: 'text', defaultValue: 'KEEP DRY' },
      {
        id: 'note',
        label: 'ملاحظة التخزين',
        type: 'text',
        defaultValue: 'تجنب التعرض للمطر والرطوبة',
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
      const main = escapeXml(fields.mainText || 'يُحفظ في مكان جاف');
      const en = escapeXml(fields.enText || 'KEEP DRY');
      const note = escapeXml(fields.note || 'تجنب التعرض للمطر والرطوبة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect x="15" y="15" width="370" height="470" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M126 62C122 71 115 79 115 86A11 11 0 0 0 137 86C137 79 130 71 126 62Z"/>
    <path d="M200 44C196 53 189 61 189 68A11 11 0 0 0 211 68C211 61 204 53 200 44Z"/>
    <path d="M274 62C270 71 263 79 263 86A11 11 0 0 0 285 86C285 79 278 71 274 62Z"/>
    <!-- Semicircular canopy with three scallops, not a flat bowl. -->
    <path d="M86 208C91 148 138 114 200 114C262 114 309 148 314 208Q285 185 257 208Q229 185 200 208Q171 185 143 208Q115 185 86 208Z"/>
  </g>
  <path d="M200 104V268C200 295 164 295 164 268" fill="none" stroke="${secondaryColor}" stroke-width="7" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="mainText" data-max-width="322" x="200" y="348" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="enText" data-max-width="310" x="200" y="395" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="3">
    ${en}
  </text>
  <text data-field-id="note" data-max-width="316" x="200" y="441" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: 'shipping_heavy_package',
    name: 'طرد ثقيل (احذر الرفع)',
    nameEn: 'Heavy Weight Package',
    category: 'shipping',
    description: 'تنبيه للأوزان الثقيلة التي تتطلب شخصين أو رافعة لتجنب إصابات الظهر',
    defaultWidth: 500,
    defaultHeight: 400,
    aspectRatio: 500 / 400,
    defaultMm: { width: 100, height: 80 },
    defaultColors: {
      primary: '#EA580C',
      secondary: '#1E293B',
      background: '#FFF7ED',
    },
    fields: [
      { id: 'weightText', label: 'الوزن المقدر', type: 'text', defaultValue: '> 25 KG' },
      { id: 'warningText', label: 'عنوان التنبيه', type: 'text', defaultValue: 'طرد ثقيل الوزن' },
      {
        id: 'actionText',
        label: 'إجراء الرفع',
        type: 'text',
        defaultValue: 'يتطلب شخصين للرفع أو رافعة',
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
      const weight = escapeXml(fields.weightText || '> 25 KG');
      const warning = escapeXml(fields.warningText || 'طرد ثقيل الوزن');
      const action = escapeXml(fields.actionText || 'يتطلب شخصين للرفع أو رافعة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400">
  <rect x="15" y="15" width="470" height="370" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M82 39L115 97H49Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-max-width="24" x="82" y="87" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">!</text>
  <text data-field-id="warningText" data-max-width="318" x="294" y="83" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${warning}
  </text>
  <path d="M40 117H460" stroke="${primaryColor}" stroke-width="1" opacity="0.35"/>
  <!-- A weight silhouette gives the mass a recognisable physical signifier. -->
  <g data-color-role="secondary">
    <path d="M222 160V149A28 28 0 0 1 278 149V160" fill="none" stroke="${secondaryColor}" stroke-width="9"/>
    <path d="M143 163H357L375 262H125Z" fill="${secondaryColor}"/>
  </g>
  <text data-field-id="weightText" data-max-width="216" x="250" y="229" font-family="${fontFamily}, monospace" font-size="${Math.round(38 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${weight}
  </text>
  <text data-field-id="actionText" data-max-width="414" x="250" y="313" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${action}
  </text>
  <text data-max-width="414" x="250" y="355" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" letter-spacing="0.5">
    HEAVY PACKAGE - TEAM LIFT REQUIRED
  </text>
</svg>`;
    },
  },
  {
    id: 'shipping_do_not_stack',
    name: 'ممنوع التكديس',
    nameEn: 'Do Not Stack',
    category: 'shipping',
    description: 'ملصق لحظر وضع أي طرود أخرى فوق الصندوق في المستودع أو الشاحنة',
    defaultWidth: 420,
    defaultHeight: 480,
    aspectRatio: 420 / 480,
    defaultMm: { width: 84, height: 96 },
    defaultColors: {
      primary: '#E11D48',
      secondary: '#0F172A',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'mainText', label: 'النص الرئيسي', type: 'text', defaultValue: 'ممنوع التكديس' },
      { id: 'subText', label: 'النص بالإنجليزية', type: 'text', defaultValue: 'DO NOT STACK' },
      {
        id: 'note',
        label: 'ملاحظة أمان',
        type: 'text',
        defaultValue: 'لا تضع أي طرود أو أثقال فوق هذا الصندوق',
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
      const main = escapeXml(fields.mainText || 'ممنوع التكديس');
      const sub = escapeXml(fields.subText || 'DO NOT STACK');
      const note = escapeXml(fields.note || 'لا تضع أي طرود أو أثقال فوق هذا الصندوق');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 480" width="420" height="480">
  <rect x="15" y="15" width="390" height="450" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- Solid cartons stay legible beneath the standard red prohibition circle. -->
  <g fill="none" stroke="${secondaryColor}" stroke-width="5" stroke-linejoin="round" data-color-role="secondary">
    <path d="M158 158H262V218H158ZM172 90H248V145H172Z"/>
    <path d="M210 90V108M210 158V180" stroke-width="4"/>
  </g>
  <g fill="none" stroke="${primaryColor}" stroke-width="12" data-color-role="primary">
    <circle cx="210" cy="155" r="99"/>
    <path d="M140 85L280 225"/>
  </g>
  <text data-field-id="mainText" data-max-width="338" x="210" y="319" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="330" x="210" y="366" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2">
    ${sub}
  </text>
  <path d="M42 395H378" stroke="${secondaryColor}" stroke-width="1" opacity="0.2"/>
  <text data-field-id="note" data-max-width="336" x="210" y="428" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
];
