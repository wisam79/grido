import {
  cornerBracketsMarkup,
  scallopCirclePath,
  starPoints,
  ticketStubPath,
} from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const RETAIL_TEMPLATES: StickerTemplate[] = [
  {
    id: 'retail_was_now',
    name: 'السعر قبل وبعد',
    nameEn: 'Was / Now Price Tag',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة تسعير ترويجية تعرض السعر السابق مشطوباً والسعر الجديد البارز',
    defaultWidth: 500,
    defaultHeight: 320,
    aspectRatio: 500 / 320,
    defaultMm: { width: 70, height: 45 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 296, rx: 14 },
    defaultColors: {
      primary: '#C32635',
      secondary: '#24252B',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'itemTitle', label: 'اسم المنتج', type: 'text', defaultValue: 'عرض خاص ومميز' },
      { id: 'oldPrice', label: 'السعر السابق', type: 'text', defaultValue: '25,000 د.ع' },
      { id: 'newPrice', label: 'السعر الجديد', type: 'text', defaultValue: '18,000 د.ع' },
      { id: 'badgeText', label: 'شارة التوفير', type: 'text', defaultValue: 'وفر 30%' },
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
      const item = escapeXml(fields.itemTitle || 'عرض خاص ومميز');
      const oldP = escapeXml(fields.oldPrice || '25,000 د.ع');
      const newP = escapeXml(fields.newPrice || '18,000 د.ع');
      const badge = escapeXml(fields.badgeText || 'وفر 30%');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const cardPath = ticketStubPath(12, 12, 476, 296, 14, 13, 0.34);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <defs>
    <linearGradient id="retail-was-now-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${secondaryColor}"/>
      <stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="retail-was-now-clip">
      <path d="${cardPath}"/>
    </clipPath>
  </defs>
  <path d="${cardPath}" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#retail-was-now-clip)">
    <rect x="12" y="12" width="476" height="84" fill="url(#retail-was-now-hdr)" data-color-role="secondary"/>
    <rect x="12" y="294" width="476" height="14" fill="${primaryColor}" data-color-role="primary"/>
  </g>
  <text data-field-id="itemTitle" data-max-width="420" x="250" y="65" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${item}
  </text>
  <path d="M34 112H466" stroke="${secondaryColor}" stroke-width="1.2" stroke-dasharray="6 5" opacity="0.35"/>
  <text data-field-id="oldPrice" data-max-width="230" x="150" y="156" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" text-decoration="line-through" opacity="0.65">
    كان: ${oldP}
  </text>
  <rect x="296" y="126" width="166" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="badgeText" data-max-width="142" x="379" y="155" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${badge}
  </text>
  <rect x="34" y="186" width="432" height="90" rx="14" fill="${primaryColor}" fill-opacity="0.08" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1.5"/>
  <text data-field-id="newPrice" data-max-width="408" x="250" y="246" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    الآن: ${newP}
  </text>
</svg>`;
    },
  },
  {
    id: 'retail_bogo_free',
    name: 'اشترِ 1 واحصل على 1 مجاناً',
    nameEn: 'BOGO 1+1 Free',
    category: 'retail',
    shape: 'circle',
    description: 'ملصق عروض ترويجية دائري للمتاجر والماركات والمطاعم',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 224 },
    defaultColors: {
      primary: '#B82037',
      secondary: '#D99B26',
      background: '#FFFAF0',
    },
    fields: [
      { id: 'topText', label: 'العبارة الأولى', type: 'text', defaultValue: 'اشترِ قطعة' },
      { id: 'centerText', label: 'الرقم البارز', type: 'text', defaultValue: '1+1' },
      {
        id: 'bottomText',
        label: 'العبارة السفلية',
        type: 'text',
        defaultValue: 'والثانية مجاناً!',
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
      const top = escapeXml(fields.topText || 'اشترِ قطعة');
      const center = escapeXml(fields.centerText || '1+1');
      const bottom = escapeXml(fields.bottomText || 'والثانية مجاناً!');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const sealEdge = scallopCirclePath(240, 240, 214, 28, 1.045);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="bogo-glow" cx="50%" cy="45%" r="55%">
      <stop offset="0" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <path d="${sealEdge}" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <circle cx="240" cy="240" r="196" fill="url(#bogo-glow)" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="6 6" data-color-role="secondary"/>
  <polygon points="${starPoints(88, 152, 4, 11, 4)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${starPoints(392, 152, 4, 11, 4)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="topText" data-max-width="290" x="240" y="122" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${top}
  </text>
  <rect x="78" y="164" width="324" height="128" rx="64" fill="${primaryColor}" data-color-role="primary"/>
  <rect x="86" y="172" width="308" height="112" rx="56" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-opacity="0.7" data-color-role="secondary"/>
  <text data-field-id="centerText" data-max-width="290" x="240" y="228" font-family="${fontFamily}, sans-serif" font-size="${Math.round(84 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${center}
  </text>
  <text data-field-id="bottomText" data-max-width="308" x="240" y="362" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${bottom}
  </text>
</svg>`;
    },
  },
  {
    id: 'retail_best_seller',
    name: 'الأكثر مبيعاً',
    nameEn: 'Best Seller Badge',
    category: 'retail',
    shape: 'circle',
    description: 'شارة شرفية ملوكية تميز المنتجات الأكثر طلباً في المتجر',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 45, height: 45 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 220 },
    defaultColors: {
      primary: '#A8742F',
      secondary: '#493827',
      background: '#FFF9EB',
    },
    fields: [
      { id: 'title', label: 'اللقب الشرفي', type: 'text', defaultValue: 'الأكثر مبيعاً' },
      { id: 'sub', label: 'التقييم أو التميز', type: 'text', defaultValue: 'BEST SELLER' },
      { id: 'extra', label: 'التقييم بالنجوم', type: 'text', defaultValue: '★★★★★' },
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
      const title = escapeXml(fields.title || 'الأكثر مبيعاً');
      const sub = escapeXml(fields.sub || 'BEST SELLER');
      const extra = escapeXml(fields.extra || '★★★★★');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="best-seller-ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="0.5" stop-color="${backgroundColor}"/>
      <stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
  </defs>
  <circle cx="240" cy="240" r="220" fill="${bg}" stroke="url(#best-seller-ring)" stroke-width="10" data-color-role="background"/>
  <circle cx="240" cy="240" r="200" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="3 6" data-color-role="primary"/>
  <path d="M 105,305 A 152,152 0 0,1 124,134 M 375,305 A 152,152 0 0,0 356,134" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" opacity="0.65" data-color-role="primary"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M194 102L218 122L240 86L262 122L286 102L276 148H204Z"/>
    <rect x="204" y="155" width="72" height="6" rx="3"/>
    <circle cx="194" cy="96" r="4"/><circle cx="240" cy="80" r="4.5"/><circle cx="286" cy="96" r="4"/>
  </g>
  <text data-field-id="extra" data-max-width="250" x="240" y="205" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" letter-spacing="4">
    ${extra}
  </text>
  <text data-field-id="title" data-max-width="344" x="240" y="274" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <rect x="136" y="314" width="208" height="38" rx="19" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="sub" data-max-width="184" x="240" y="340" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" letter-spacing="2.5">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'retail_national_product',
    name: 'صُنع في العراق (منتج وطني)',
    nameEn: 'Made in Iraq (National Product)',
    category: 'retail',
    shape: 'square',
    description: 'ملصق فخر الصناعة الوطنية العراقية مع رمز النخيل للمنتجات والمحاصيل المحلية',
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'roundedRect', x: 20, y: 20, width: 420, height: 420, rx: 18 },
    defaultColors: {
      primary: '#1F6B4B',
      secondary: '#214B3B',
      background: '#F7FAF3',
    },
    fields: [
      { id: 'mainText', label: 'النص الرئيسي', type: 'text', defaultValue: 'صُنع في العراق' },
      { id: 'subText', label: 'الشعار الوطني', type: 'text', defaultValue: 'منتج عراقي وطني' },
      {
        id: 'enText',
        label: 'النص بالإنجليزية',
        type: 'text',
        defaultValue: 'PROUDLY MADE IN IRAQ',
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
      const main = escapeXml(fields.mainText || 'صُنع في العراق');
      const sub = escapeXml(fields.subText || 'منتج عراقي وطني');
      const en = escapeXml(fields.enText || 'PROUDLY MADE IN IRAQ');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <rect x="20" y="20" width="420" height="420" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <rect x="30" y="30" width="400" height="400" rx="12" fill="none" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.4"/>
  ${cornerBracketsMarkup(42, 42, 376, 376, 22, secondaryColor, 2.5, 'secondary')}
  <circle cx="230" cy="134" r="68" fill="${primaryColor}" fill-opacity="0.09" data-color-role="primary"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M226 114H234L241 204H219Z"/>
    <path d="M230 116C208 82 176 80 159 93C190 91 212 106 230 123Z"/>
    <path d="M230 119C196 103 166 116 157 143C184 126 204 126 230 126Z"/>
    <path d="M230 124C204 126 187 148 190 173C199 152 213 141 230 132Z"/>
    <path d="M230 116C252 82 284 80 301 93C270 91 248 106 230 123Z"/>
    <path d="M230 119C264 103 294 116 303 143C276 126 256 126 230 126Z"/>
    <path d="M230 124C256 126 273 148 270 173C261 152 247 141 230 132Z"/>
    <path d="M230 119C219 94 222 78 230 66C238 78 241 94 230 119Z"/>
  </g>
  <text data-field-id="mainText" data-max-width="350" x="230" y="256" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="340" x="230" y="314" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${sub}
  </text>
  <rect x="74" y="346" width="312" height="40" rx="20" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="enText" data-max-width="280" x="230" y="372" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" letter-spacing="2">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: 'retail_clearance_sale',
    name: 'تصفية كبرى وتخفيضات',
    nameEn: 'Mega Clearance Sale',
    category: 'retail',
    shape: 'rect',
    description: 'شريط عرض عريض ملفت للمنتجات المعروضة بأسعار التصفية',
    defaultWidth: 600,
    defaultHeight: 280,
    aspectRatio: 600 / 280,
    defaultMm: { width: 100, height: 45 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 576, height: 256, rx: 12 },
    defaultColors: {
      primary: '#B72232',
      secondary: '#FFE7AB',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'saleTitle',
        label: 'عنوان التصفية',
        type: 'text',
        defaultValue: 'تصفية كبرى حتى نفاذ الكمية',
      },
      { id: 'discountAmount', label: 'نسبة الخصم', type: 'text', defaultValue: 'خصم يصل إلى 70%' },
      {
        id: 'tagline',
        label: 'العبارة الإنجليزية',
        type: 'text',
        defaultValue: 'MEGA CLEARANCE SALE',
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
      const title = escapeXml(fields.saleTitle || 'تصفية كبرى حتى نفاذ الكمية');
      const discount = escapeXml(fields.discountAmount || 'خصم يصل إلى 70%');
      const tagline = escapeXml(fields.tagline || 'MEGA CLEARANCE SALE');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 280" width="600" height="280">
  <defs>
    <linearGradient id="clearance-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0.86"/>
    </linearGradient>
    <clipPath id="clearance-clip">
      <rect x="12" y="12" width="576" height="256" rx="12"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="576" height="256" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#clearance-clip)">
    <rect x="12" y="12" width="576" height="192" fill="url(#clearance-grad)" data-color-role="primary"/>
    <path d="M12 12H106L52 204H12ZM588 12H494L548 204H588Z" fill="${secondaryColor}" fill-opacity="0.16" data-color-role="secondary"/>
  </g>
  <polygon points="${starPoints(64, 108, 4, 14, 5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${starPoints(536, 108, 4, 14, 5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="saleTitle" data-max-width="460" x="300" y="72" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="discountAmount" data-max-width="472" x="300" y="158" font-family="${fontFamily}, sans-serif" font-size="${Math.round(48 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${discount}
  </text>
  <text data-field-id="tagline" data-max-width="500" x="300" y="246" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" letter-spacing="3.5">
    ${tagline}
  </text>
</svg>`;
    },
  },
];
