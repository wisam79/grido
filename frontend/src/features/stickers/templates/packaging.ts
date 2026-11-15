import { cornerBracketsMarkup, starPoints } from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const PACKAGING_TEMPLATES: StickerTemplate[] = [
  {
    id: 'packaging_expiry_dates',
    name: 'جدول الإنتاج والانتهاء والتشغيلة',
    nameEn: 'Production & Expiry Matrix',
    category: 'packaging',
    shape: 'rect',
    description: 'ملصق تنظيمي لبيانات الصلاحية، تاريخ التعبئة، والباتش للمنتجات والمصانع',
    defaultWidth: 600,
    defaultHeight: 340,
    aspectRatio: 600 / 340,
    defaultMm: { width: 120, height: 68 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 576, height: 316, rx: 14 },
    defaultColors: {
      primary: '#263441',
      secondary: '#315A6F',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'productName', label: 'اسم المنتج', type: 'text', defaultValue: 'عسل سدر طبيعي فاخر' },
      { id: 'mfgDate', label: 'تاريخ الإنتاج (PROD)', type: 'text', defaultValue: '2026/09/12' },
      { id: 'expDate', label: 'تاريخ الانتهاء (EXP)', type: 'text', defaultValue: '2028/09/11' },
      { id: 'batchNo', label: 'رقم التشغيلة (BATCH)', type: 'text', defaultValue: 'LOT #B402-99' },
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
      const name = escapeXml(fields.productName || 'عسل سدر طبيعي فاخر');
      const mfg = escapeXml(fields.mfgDate || '2026/09/12');
      const exp = escapeXml(fields.expDate || '2028/09/11');
      const batch = escapeXml(fields.batchNo || 'LOT #B402-99');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340" width="600" height="340">
  <defs>
    <linearGradient id="pkg-exp-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="pkg-exp-clip">
      <rect x="12" y="12" width="576" height="316" rx="14"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="576" height="316" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#pkg-exp-clip)">
    <rect x="12" y="12" width="576" height="78" fill="url(#pkg-exp-hdr)" data-color-role="primary"/>
    <rect x="24" y="168" width="552" height="72" rx="8" fill="${secondaryColor}" fill-opacity="0.08" data-color-role="secondary"/>
  </g>
  <text data-field-id="productName" data-max-width="520" x="300" y="61" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${name}
  </text>
  <path d="M318 102V312" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.22"/>
  <path d="M24 166H576M24 242H576" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.18"/>
  <rect x="342" y="114" width="212" height="36" rx="18" fill="${primaryColor}" fill-opacity="0.08"/>
  <text data-max-width="196" x="448" y="138" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    تاريخ الإنتاج (MFG)
  </text>
  <text data-field-id="mfgDate" data-max-width="260" x="172" y="140" font-family="${fontFamily}, monospace" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${mfg}
  </text>
  <rect x="342" y="186" width="212" height="36" rx="18" fill="${secondaryColor}" fill-opacity="0.16"/>
  <text data-max-width="196" x="448" y="210" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    تاريخ الانتهاء (EXP)
  </text>
  <text data-field-id="expDate" data-max-width="260" x="172" y="213" font-family="${fontFamily}, monospace" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${exp}
  </text>
  <rect x="342" y="260" width="212" height="36" rx="18" fill="${primaryColor}" fill-opacity="0.08"/>
  <text data-max-width="196" x="448" y="284" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    رقم التشغيلة (BATCH)
  </text>
  <text data-field-id="batchNo" data-max-width="260" x="172" y="286" font-family="${fontFamily}, monospace" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${batch}
  </text>
</svg>`;
    },
  },
  {
    id: 'packaging_thank_you',
    name: 'بطاقة شكر للطلب',
    nameEn: 'Thank You Sticker',
    category: 'packaging',
    shape: 'rect',
    description: 'ملصق أنيق وعصري لإغلاق كراتين الشحن وطرود المتاجر الإلكترونية',
    defaultWidth: 500,
    defaultHeight: 380,
    aspectRatio: 500 / 380,
    defaultMm: { width: 100, height: 76 },
    cutShape: { kind: 'roundedRect', x: 15, y: 15, width: 470, height: 350, rx: 18 },
    defaultColors: {
      primary: '#A74856',
      secondary: '#493B3B',
      background: '#FFF8F3',
    },
    fields: [
      { id: 'thankTitle', label: 'عبارة الشكر', type: 'text', defaultValue: 'شكراً لطلبك الجميل!' },
      {
        id: 'sentiment',
        label: 'رسالة المحبة',
        type: 'text',
        defaultValue: 'تم تجهيز وتغليف طلبك بكل حب وعناية',
      },
      {
        id: 'socialHandle',
        label: 'حساب التواصل أو المتجر',
        type: 'text',
        defaultValue: '@YourStore.iq',
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
      const thank = escapeXml(fields.thankTitle || 'شكراً لطلبك الجميل!');
      const sentiment = escapeXml(fields.sentiment || 'تم تجهيز وتغليف طلبك بكل حب وعناية');
      const social = escapeXml(fields.socialHandle || '@YourStore.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 380" width="500" height="380">
  <defs>
    <radialGradient id="pkg-ty-aura" cx="50%" cy="28%" r="48%">
      <stop offset="0" stop-color="${primaryColor}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="15" y="15" width="470" height="350" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="27" y="27" width="446" height="326" rx="12" fill="url(#pkg-ty-aura)" stroke="${primaryColor}" stroke-width="1" stroke-dasharray="4 6" stroke-opacity="0.45"/>
  ${cornerBracketsMarkup(40, 40, 420, 300, 18, secondaryColor, 1.8, 'secondary')}
  <circle cx="250" cy="88" r="36" fill="${primaryColor}" fill-opacity="0.12" data-color-role="primary"/>
  <path d="M250 110L226 88C209 71 230 50 250 70C270 50 291 71 274 88Z" fill="${primaryColor}" data-color-role="primary"/>
  <polygon points="${starPoints(184, 86, 4, 8, 3)}" fill="${secondaryColor}" opacity="0.65" data-color-role="secondary"/>
  <polygon points="${starPoints(316, 86, 4, 8, 3)}" fill="${secondaryColor}" opacity="0.65" data-color-role="secondary"/>
  <text data-field-id="thankTitle" data-max-width="404" x="250" y="182" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${thank}
  </text>
  <text data-field-id="sentiment" data-max-width="404" x="250" y="232" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${sentiment}
  </text>
  <rect x="128" y="274" width="244" height="44" rx="22" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="socialHandle" data-max-width="214" x="250" y="303" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${social}
  </text>
</svg>`;
    },
  },
  {
    id: 'packaging_open_here',
    name: 'افتح هنا (مقص وقص)',
    nameEn: 'Open Here Strip',
    category: 'packaging',
    shape: 'rect',
    description: 'شريط ملصق طولي لتحديد موضع الفتح الآمن للعبوات والعلب',
    defaultWidth: 600,
    defaultHeight: 240,
    aspectRatio: 600 / 240,
    defaultMm: { width: 120, height: 48 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 576, height: 216, rx: 14 },
    defaultColors: {
      primary: '#28312D',
      secondary: '#896222',
      background: '#FFFAED',
    },
    fields: [
      { id: 'openText', label: 'نص الفتح', type: 'text', defaultValue: 'افتح من هنا بعناية' },
      { id: 'enText', label: 'النص الإنجليزي', type: 'text', defaultValue: 'OPEN HERE ✂' },
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
      const open = escapeXml(fields.openText || 'افتح من هنا بعناية');
      const en = escapeXml(fields.enText || 'OPEN HERE ✂');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="600" height="240">
  <defs>
    <clipPath id="pkg-open-clip">
      <rect x="12" y="12" width="576" height="216" rx="14"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="576" height="216" rx="14" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#pkg-open-clip)">
    <rect x="12" y="12" width="144" height="216" fill="${secondaryColor}" fill-opacity="0.14" data-color-role="secondary"/>
    <path d="M12 12H588V26H12ZM12 214H588V228H12Z" fill="${secondaryColor}" fill-opacity="0.24" data-color-role="secondary"/>
  </g>
  <g fill="none" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <circle cx="64" cy="95" r="14"/>
    <circle cx="64" cy="145" r="14"/>
    <path d="M76 102L142 149M76 138L142 91"/>
    <circle cx="103" cy="120" r="3.5" fill="${primaryColor}" stroke="none"/>
  </g>
  <path d="M164 120H556" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-dasharray="10 8"/>
  <path d="M542 111L558 120L542 129" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" data-color-role="secondary"/>
  <text data-field-id="openText" data-max-width="380" x="364" y="84" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${open}
  </text>
  <text data-field-id="enText" data-max-width="380" x="364" y="176" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="3">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: 'packaging_eco_recycle',
    name: 'صديق للبيئة وقابل للتدوير',
    nameEn: 'Eco-Friendly Recyclable',
    category: 'packaging',
    shape: 'circle',
    description: 'شعار الاستدامة البيئية وإعادة التدوير للمنتجات الصديقة للأرض',
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 92, height: 92 },
    cutShape: { kind: 'circle', cx: 230, cy: 230, r: 210 },
    defaultColors: {
      primary: '#286947',
      secondary: '#254735',
      background: '#F7FAF1',
    },
    fields: [
      {
        id: 'ecoTitle',
        label: 'عنوان الاستدامة',
        type: 'text',
        defaultValue: '100% قابل لإعادة التدوير',
      },
      { id: 'ecoSub', label: 'النص الفرعي', type: 'text', defaultValue: 'تغليف صديق للبيئة' },
      { id: 'pledge', label: 'شعار الكوكب', type: 'text', defaultValue: 'معاً لحماية كوكبنا' },
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
      const title = escapeXml(fields.ecoTitle || '100% قابل لإعادة التدوير');
      const sub = escapeXml(fields.ecoSub || 'تغليف صديق للبيئة');
      const pledge = escapeXml(fields.pledge || 'معاً لحماية كوكبنا');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <defs>
    <radialGradient id="eco-aura" cx="50%" cy="35%" r="55%">
      <stop offset="0" stop-color="${primaryColor}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="230" cy="230" r="210" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <circle cx="230" cy="230" r="196" fill="url(#eco-aura)" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="5 6" stroke-opacity="0.6"/>
  <g transform="translate(230 144)" fill="none" stroke="${primaryColor}" stroke-width="10" stroke-linecap="square" stroke-linejoin="round" data-color-role="primary">
    <path d="M-46-16L-15-68Q-5-85 5-68L32-21M7-33L32-21L36-47"/>
    <path d="M-46-16L-15-68Q-5-85 5-68L32-21M7-33L32-21L36-47" transform="rotate(120)"/>
    <path d="M-46-16L-15-68Q-5-85 5-68L32-21M7-33L32-21L36-47" transform="rotate(240)"/>
  </g>
  <text data-field-id="ecoTitle" data-max-width="354" x="230" y="272" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <text data-field-id="ecoSub" data-max-width="326" x="230" y="316" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <rect x="116" y="344" width="228" height="36" rx="18" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="pledge" data-max-width="200" x="230" y="369" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${pledge}
  </text>
</svg>`;
    },
  },
];
