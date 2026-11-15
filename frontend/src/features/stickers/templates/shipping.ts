import { cornerBracketsMarkup } from './svg-elements';
import { generateBarcodeInnerSvg } from '../lib/barcode-svg';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const SHIPPING_TEMPLATES: StickerTemplate[] = [
  {
    id: 'shipping_fragile',
    name: 'قابل للكسر (احذر)',
    nameEn: 'Fragile (Handle with Care)',
    category: 'shipping',
    shape: 'rect',
    description: 'ملصق تحذيري دولي للشحنات الحساسة والزجاجية مع رمز الكأس وباركود',
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultMm: { width: 120, height: 80 },
    cutShape: { kind: 'roundedRect', x: 15, y: 15, width: 570, height: 370, rx: 14 },
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
  <defs>
    <linearGradient id="ship-fragile-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0.88"/>
    </linearGradient>
    <clipPath id="ship-fragile-clip">
      <rect x="15" y="15" width="570" height="370" rx="14"/>
    </clipPath>
  </defs>
  <rect x="15" y="15" width="570" height="370" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#ship-fragile-clip)">
    <rect x="15" y="15" width="570" height="104" fill="url(#ship-fragile-hdr)" data-color-role="primary"/>
    <rect x="15" y="119" width="166" height="266" fill="${primaryColor}" fill-opacity="0.06"/>
  </g>
  <text data-field-id="mainWarning" data-max-width="500" x="300" y="84" font-family="${fontFamily}, sans-serif" font-size="${Math.round(46 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${main}
  </text>
  <g fill="none" stroke="${primaryColor}" stroke-linejoin="round" data-color-role="primary">
    <path d="M58 168H146L141 210C139 235 123 249 102 249C81 249 65 235 63 210Z" stroke-width="6"/>
    <path d="M102 249V310M74 310H130" stroke-width="7" stroke-linecap="round"/>
    <path d="M106 169L94 193L109 210L95 235" stroke-width="4" stroke-linecap="round"/>
  </g>
  <path d="M181 134V370" stroke="${primaryColor}" stroke-width="1.5" stroke-opacity="0.22"/>
  <rect x="242" y="142" width="276" height="30" rx="15" fill="${secondaryColor}" fill-opacity="0.1"/>
  <text data-max-width="260" x="380" y="162" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1" data-color-role="secondary">
    FRAGILE • HANDLE WITH CARE
  </text>
  <text data-field-id="subWarning" data-max-width="344" x="380" y="216" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <rect x="206" y="246" width="348" height="76" rx="8" fill="#FFFFFF" stroke="${secondaryColor}" stroke-opacity="0.15"/>
  <g transform="translate(230, 260)">
    ${innerBarcode}
  </g>
  <text data-field-id="tracking" data-max-width="344" x="380" y="352" font-family="${fontFamily}, monospace" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2" direction="ltr" unicode-bidi="embed">
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
    shape: 'rect',
    description: 'ملصق اتجاه الصندوق لتفادي انقلاب الطرود والمعدات الحساسة',
    defaultWidth: 400,
    defaultHeight: 500,
    aspectRatio: 400 / 500,
    defaultMm: { width: 80, height: 100 },
    cutShape: { kind: 'roundedRect', x: 15, y: 15, width: 370, height: 470, rx: 14 },
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
  <rect x="15" y="15" width="370" height="470" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <rect x="34" y="34" width="332" height="278" rx="12" fill="${secondaryColor}" fill-opacity="0.08" data-color-role="secondary"/>
  ${cornerBracketsMarkup(46, 46, 308, 254, 18, secondaryColor, 2.5, 'secondary')}
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M128 72L184 137H146V268H110V137H72Z"/>
    <path d="M272 72L328 137H290V268H254V137H216Z"/>
    <rect x="72" y="280" width="256" height="16" rx="4"/>
  </g>
  <text data-field-id="topTitle" data-max-width="320" x="200" y="372" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${ar}
  </text>
  <rect x="74" y="402" width="252" height="46" rx="23" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="enTitle" data-max-width="224" x="200" y="432" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" letter-spacing="3">
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
    shape: 'rect',
    description: 'ملصق الحماية من الرطوبة والمطر مع رمز المظلة والقطرات',
    defaultWidth: 400,
    defaultHeight: 500,
    aspectRatio: 400 / 500,
    defaultMm: { width: 80, height: 100 },
    cutShape: { kind: 'roundedRect', x: 15, y: 15, width: 370, height: 470, rx: 14 },
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
  <rect x="15" y="15" width="370" height="470" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <rect x="32" y="32" width="336" height="272" rx="12" fill="${primaryColor}" fill-opacity="0.08" data-color-role="primary"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M126 62C122 71 115 79 115 86A11 11 0 0 0 137 86C137 79 130 71 126 62Z"/>
    <path d="M200 44C196 53 189 61 189 68A11 11 0 0 0 211 68C211 61 204 53 200 44Z"/>
    <path d="M274 62C270 71 263 79 263 86A11 11 0 0 0 285 86C285 79 278 71 274 62Z"/>
    <path d="M86 208C91 148 138 114 200 114C262 114 309 148 314 208Q285 185 257 208Q229 185 200 208Q171 185 143 208Q115 185 86 208Z"/>
  </g>
  <path d="M200 104V268C200 295 164 295 164 268" fill="none" stroke="${secondaryColor}" stroke-width="7" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="mainText" data-max-width="322" x="200" y="352" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${main}
  </text>
  <rect x="96" y="370" width="208" height="38" rx="19" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="enText" data-max-width="184" x="200" y="396" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" letter-spacing="3">
    ${en}
  </text>
  <text data-field-id="note" data-max-width="316" x="200" y="446" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
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
    shape: 'rect',
    description: 'تنبيه للأوزان الثقيلة التي تتطلب شخصين أو رافعة لتجنب إصابات الظهر',
    defaultWidth: 500,
    defaultHeight: 400,
    aspectRatio: 500 / 400,
    defaultMm: { width: 100, height: 80 },
    cutShape: { kind: 'roundedRect', x: 15, y: 15, width: 470, height: 370, rx: 14 },
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
  <defs>
    <clipPath id="ship-heavy-clip">
      <rect x="15" y="15" width="470" height="370" rx="14"/>
    </clipPath>
  </defs>
  <rect x="15" y="15" width="470" height="370" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#ship-heavy-clip)">
    <rect x="15" y="15" width="470" height="92" fill="${primaryColor}" data-color-role="primary"/>
  </g>
  <path d="M80 34L112 88H48Z" fill="${backgroundColor}"/>
  <text data-max-width="24" x="80" y="79" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">!</text>
  <text data-field-id="warningText" data-max-width="320" x="288" y="74" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${warning}
  </text>
  <g data-color-role="secondary">
    <path d="M222 162V150A28 28 0 0 1 278 150V162" fill="none" stroke="${secondaryColor}" stroke-width="9"/>
    <path d="M140 165H360L379 266H121Z" fill="${secondaryColor}"/>
  </g>
  <text data-field-id="weightText" data-max-width="216" x="250" y="232" font-family="${fontFamily}, monospace" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${weight}
  </text>
  <text data-field-id="actionText" data-max-width="414" x="250" y="316" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${action}
  </text>
  <text data-max-width="414" x="250" y="355" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="1.5">
    HEAVY PACKAGE • TEAM LIFT REQUIRED
  </text>
</svg>`;
    },
  },
  {
    id: 'shipping_do_not_stack',
    name: 'ممنوع التكديس',
    nameEn: 'Do Not Stack',
    category: 'shipping',
    shape: 'rect',
    description: 'ملصق لحظر وضع أي طرود أخرى فوق الصندوق في المستودع أو الشاحنة',
    defaultWidth: 420,
    defaultHeight: 480,
    aspectRatio: 420 / 480,
    defaultMm: { width: 84, height: 96 },
    cutShape: { kind: 'roundedRect', x: 15, y: 15, width: 390, height: 450, rx: 14 },
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
  <rect x="15" y="15" width="390" height="450" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <rect x="34" y="34" width="352" height="236" rx="12" fill="${primaryColor}" fill-opacity="0.06"/>
  <g fill="none" stroke="${secondaryColor}" stroke-width="5" stroke-linejoin="round" data-color-role="secondary">
    <path d="M158 158H262V218H158ZM172 90H248V145H172Z"/>
    <path d="M210 90V108M210 158V180" stroke-width="4"/>
  </g>
  <g fill="none" stroke="${primaryColor}" stroke-width="12" data-color-role="primary">
    <circle cx="210" cy="154" r="95"/>
    <path d="M143 87L277 221"/>
  </g>
  <text data-field-id="mainText" data-max-width="338" x="210" y="322" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <rect x="86" y="342" width="248" height="38" rx="19" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="subText" data-max-width="220" x="210" y="368" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" letter-spacing="2">
    ${sub}
  </text>
  <text data-field-id="note" data-max-width="336" x="210" y="426" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
];
