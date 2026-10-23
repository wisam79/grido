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

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <rect x="12" y="12" width="476" height="296" rx="8" fill="${bg}" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="background"/>
  <path d="M36 34H92" stroke="${primaryColor}" stroke-width="5" data-color-role="primary"/>
  <text data-field-id="itemTitle" data-max-width="428" x="250" y="77" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${item}
  </text>
  <path d="M36 98H464" stroke="${secondaryColor}" stroke-width="1" opacity="0.2"/>
  <!-- The previous price and saving share a row; the new price gets its own full measure. -->
  <text data-field-id="oldPrice" data-max-width="232" x="152" y="145" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle" text-decoration="line-through" opacity="0.65">
    كان: ${oldP}
  </text>
  <rect x="304" y="116" width="160" height="40" rx="4" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="badgeText" data-max-width="140" x="384" y="143" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
    ${badge}
  </text>
  <text data-field-id="newPrice" data-max-width="428" x="250" y="235" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    الآن: ${newP}
  </text>
  <path d="M36 275H464" stroke="${primaryColor}" stroke-width="3" data-color-role="primary"/>
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
    defaultColors: {
      primary: '#B82037',
      secondary: '#EAC76F',
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

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="220" fill="${bg}" data-color-role="background"/>
  <circle cx="240" cy="240" r="212" fill="none" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <!-- A single oversized offer, with a quiet rule rather than a second badge. -->
  <text data-field-id="topText" data-max-width="300" x="240" y="132" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${top}
  </text>
  <path d="M94 286H386" stroke="${secondaryColor}" stroke-width="18" data-color-role="secondary"/>
  <text data-field-id="centerText" data-max-width="350" x="240" y="278" font-family="${fontFamily}, sans-serif" font-size="${Math.round(128 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${center}
  </text>
  <text data-field-id="bottomText" data-max-width="322" x="240" y="356" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
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
  <circle cx="240" cy="240" r="215" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <circle cx="240" cy="240" r="202" fill="none" stroke="${primaryColor}" stroke-width="0.75" opacity="0.45"/>
  <!-- A compact crown with a distinct base, rather than a floating zigzag. -->
  <g fill="${primaryColor}" data-color-role="primary">
    <path d="M198 105L220 123L240 92L260 123L282 105L273 148H207Z"/>
    <rect x="207" y="155" width="66" height="5" rx="2"/>
  </g>
  <text data-field-id="extra" data-max-width="250" x="240" y="208" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" letter-spacing="5">
    ${extra}
  </text>
  <text data-field-id="title" data-max-width="354" x="240" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(39 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <path d="M182 313H298" stroke="${primaryColor}" stroke-width="1.5"/>
  <text data-field-id="sub" data-max-width="290" x="240" y="353" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" letter-spacing="3">
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
  <rect x="20" y="20" width="420" height="420" rx="10" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- Date palm: a tapered trunk and six individually drawn fronds. -->
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
  <text data-field-id="mainText" data-max-width="360" x="230" y="267" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" data-max-width="350" x="230" y="314" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${sub}
  </text>
  <path d="M60 347H400" stroke="${primaryColor}" stroke-width="1" opacity="0.35"/>
  <text data-field-id="enText" data-max-width="340" x="230" y="385" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2">
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
  <rect x="12" y="12" width="576" height="256" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <!-- One uninterrupted sale panel gives the offer a clear, generous measure. -->
  <path d="M18 12H582Q588 12 588 18V204H12V18Q12 12 18 12Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="saleTitle" data-max-width="512" x="300" y="71" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="discountAmount" data-max-width="512" x="300" y="156" font-family="${fontFamily}, sans-serif" font-size="${Math.round(47 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${discount}
  </text>
  <text data-field-id="tagline" data-max-width="512" x="300" y="245" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="3">
    ${tagline}
  </text>
</svg>`;
    },
  },
];
