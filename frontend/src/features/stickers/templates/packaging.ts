import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const PACKAGING_TEMPLATES: StickerTemplate[] = [
  {
    id: 'packaging_expiry_dates',
    name: 'جدول الإنتاج والانتهاء والتشغيلة',
    nameEn: 'Production & Expiry Matrix',
    category: 'packaging',
    description: 'ملصق تنظيمي لبيانات الصلاحية، تاريخ التعبئة، والباتش للمنتجات والمصانع',
    defaultWidth: 600,
    defaultHeight: 340,
    aspectRatio: 600 / 340,
    defaultMm: { width: 120, height: 68 },
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
  <rect x="12" y="12" width="576" height="316" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <path d="M36 30H92" stroke="${secondaryColor}" stroke-width="4" data-color-role="secondary"/>
  <text data-field-id="productName" data-max-width="528" x="300" y="70" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${name}
  </text>
  <!-- Consistent label/value columns, with rules confined to the content measure. -->
  <path d="M36 94H564" stroke="${primaryColor}" stroke-width="1.5"/>
  <path d="M36 167H564M36 240H564M318 110V306" stroke="${primaryColor}" stroke-width="1" opacity="0.2"/>
  <text data-max-width="222" x="444" y="140" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    تاريخ الإنتاج (MFG):
  </text>
  <text data-field-id="mfgDate" data-max-width="256" x="172" y="142" font-family="${fontFamily}, monospace" font-size="${Math.round(25 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${mfg}
  </text>
  <text data-max-width="222" x="444" y="213" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    تاريخ الانتهاء (EXP):
  </text>
  <text data-field-id="expDate" data-max-width="256" x="172" y="215" font-family="${fontFamily}, monospace" font-size="${Math.round(25 * fs)}" font-weight="800" fill="#B91C1C" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${exp}
  </text>
  <text data-max-width="222" x="444" y="286" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    رقم التشغيلة (BATCH):
  </text>
  <text data-field-id="batchNo" data-max-width="256" x="172" y="288" font-family="${fontFamily}, monospace" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
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
    description: 'ملصق أنيق وعصري لإغلاق كراتين الشحن وطرود المتاجر الإلكترونية',
    defaultWidth: 500,
    defaultHeight: 380,
    aspectRatio: 500 / 380,
    defaultMm: { width: 100, height: 76 },
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
  <rect x="15" y="15" width="470" height="350" rx="10" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <!-- A small, open heart keeps the message, not the ornament, in the foreground. -->
  <path d="M250 119L224 95C203 75 229 51 250 74C271 51 297 75 276 95Z" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linejoin="round" data-color-role="primary"/>
  <text data-field-id="thankTitle" data-max-width="414" x="250" y="191" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${thank}
  </text>
  <text data-field-id="sentiment" data-max-width="414" x="250" y="243" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${sentiment}
  </text>
  <path d="M210 279H290" stroke="${primaryColor}" stroke-width="1"/>
  <text data-field-id="socialHandle" data-max-width="374" x="250" y="319" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
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
    description: 'شريط ملصق طولي لتحديد موضع الفتح الآمن للعبوات والعلب',
    defaultWidth: 600,
    defaultHeight: 240,
    aspectRatio: 600 / 240,
    defaultMm: { width: 120, height: 48 },
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
  <rect x="12" y="12" width="576" height="216" rx="6" fill="${bg}" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="background"/>
  <!-- Open blades converge on the perforation; handles remain clear of the cut line. -->
  <g fill="none" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <circle cx="64" cy="95" r="14"/>
    <circle cx="64" cy="145" r="14"/>
    <path d="M76 102L142 149M76 138L142 91"/>
    <circle cx="103" cy="120" r="3" fill="${primaryColor}" stroke="none"/>
  </g>
  <path d="M160 120H554" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="10 8"/>
  <path d="M12 112L20 120L12 128M588 112L580 120L588 128" fill="none" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <text data-field-id="openText" data-max-width="386" x="357" y="83" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${open}
  </text>
  <text data-field-id="enText" data-max-width="386" x="357" y="177" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" letter-spacing="3">
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
    description: 'شعار الاستدامة البيئية وإعادة التدوير للمنتجات الصديقة للأرض',
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 92, height: 92 },
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
  <circle cx="230" cy="230" r="205" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- Three equal bent arrows form a clockwise recycling loop with an open centre. -->
  <g transform="translate(230 145)" fill="none" stroke="${primaryColor}" stroke-width="10" stroke-linecap="square" stroke-linejoin="round" data-color-role="primary">
    <path d="M-46-16L-15-68Q-5-85 5-68L32-21M7-33L32-21L36-47"/>
    <path d="M-46-16L-15-68Q-5-85 5-68L32-21M7-33L32-21L36-47" transform="rotate(120)"/>
    <path d="M-46-16L-15-68Q-5-85 5-68L32-21M7-33L32-21L36-47" transform="rotate(240)"/>
  </g>
  <text data-field-id="ecoTitle" data-max-width="366" x="230" y="273" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <text data-field-id="ecoSub" data-max-width="334" x="230" y="319" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <path d="M194 347H266" stroke="${primaryColor}" stroke-width="1"/>
  <text data-field-id="pledge" data-max-width="260" x="230" y="380" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
    ${pledge}
  </text>
</svg>`;
    },
  },
];
