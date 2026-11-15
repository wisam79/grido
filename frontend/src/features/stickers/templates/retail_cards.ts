import {
  cornerBracketsMarkup,
  iconMarkup,
  regularPolygonPoints,
  scallopCirclePath,
  starPoints,
  starRowMarkup,
  ticketStubPath,
} from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const RETAIL_CARDS: StickerTemplate[] = [
  {
    id: 'card_ret_fashion_hang_tag',
    name: 'تاق سعر الأزياء المعلّق',
    nameEn: 'Fashion Boutique Price Hang Tag',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة تسعير عمودية معلّقة لملابس البوتيك مع ثقب تعليق وشريط سفلي للسعر',
    defaultWidth: 330,
    defaultHeight: 540,
    aspectRatio: 330 / 540,
    defaultMm: { width: 55, height: 90 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 306, height: 516, rx: 18 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#B48342',
      background: '#FAF8F5',
    },
    fields: [
      { id: 'brand', label: 'اسم البوتيك', type: 'text', defaultValue: 'دار الرافدين للأزياء' },
      { id: 'item', label: 'وصف القطعة', type: 'text', defaultValue: 'فستان كتان صيفي' },
      { id: 'size', label: 'المقاس', type: 'text', defaultValue: 'M / 38' },
      { id: 'price', label: 'السعر', type: 'text', defaultValue: '65,000 د.ع' },
      { id: 'sku', label: 'رمز الموديل', type: 'text', defaultValue: 'SKU #RF-408' },
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
      const brand = escapeXml(fields.brand || 'دار الرافدين للأزياء');
      const item = escapeXml(fields.item || 'فستان كتان صيفي');
      const size = escapeXml(fields.size || 'M / 38');
      const price = escapeXml(fields.price || '65,000 د.ع');
      const sku = escapeXml(fields.sku || 'SKU #RF-408');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 540" width="330" height="540">
  <defs>
    <linearGradient id="cr01-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cr01-clip">
      <rect x="12" y="12" width="306" height="516" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="306" height="516" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr01-clip)">
    <rect x="12" y="12" width="306" height="106" fill="${primaryColor}" fill-opacity="0.06" data-color-role="primary"/>
    <path d="M12 118 H318" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.28"/>
    <path d="M12 406 L318 388 V528 H12 Z" fill="url(#cr01-g)" data-color-role="primary"/>
    <path d="M12 414 L318 396" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.28"/>
  </g>
  <rect x="20" y="20" width="290" height="500" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="0.9" stroke-opacity="0.25"/>
  <circle cx="165" cy="52" r="18" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-width="2.4" data-color-role="secondary"/>
  <circle cx="165" cy="52" r="10.5" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="1.6"/>
  <g fill="none" stroke="${secondaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-color-role="secondary">
    <path d="M165 142 C165 132 178 130 178 140 C178 147 165 150 165 157"/>
    <path d="M165 157 L112 186 C106 189 108 197 115 197 H215 C222 197 224 189 218 186 Z"/>
  </g>
  ${cornerBracketsMarkup(28, 28, 274, 346, 16, secondaryColor, 1.5, 'secondary')}
  <text data-field-id="brand" data-max-width="256" x="165" y="232" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${brand}
  </text>
  <path d="M68 258 H262" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.45"/>
  <text data-field-id="item" data-max-width="256" x="165" y="286" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" opacity="0.88">
    ${item}
  </text>
  <rect x="98" y="318" width="134" height="42" rx="21" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <text data-field-id="size" data-max-width="114" x="165" y="339" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${size}
  </text>
  <text data-field-id="price" data-max-width="264" x="165" y="452" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(31 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${price}
  </text>
  <text data-field-id="sku" data-max-width="240" x="165" y="498" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(13 * fs)}" font-weight="600" fill="${backgroundColor}" text-anchor="middle" opacity="0.88" direction="ltr" unicode-bidi="embed">
    ${sku}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_luxury_gift_voucher',
    name: 'قسيمة هدية فاخرة',
    nameEn: 'Luxury Gift Card Voucher',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة إهداء فاخرة داكنة بلمسة ذهبية وقيمة مالية بالدينار العراقي',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 16 },
    defaultColors: {
      primary: '#D4A853',
      secondary: '#F5EFE6',
      background: '#17171D',
    },
    fields: [
      { id: 'store', label: 'اسم المتجر', type: 'text', defaultValue: 'متجر أور الفاخر' },
      { id: 'headline', label: 'عنوان البطاقة', type: 'text', defaultValue: 'بطاقة هدية مميزة' },
      { id: 'amount', label: 'قيمة الهدية', type: 'text', defaultValue: '100,000 د.ع' },
      { id: 'code', label: 'رمز القسيمة', type: 'text', defaultValue: 'GIFT-IQ-2026' },
      {
        id: 'note',
        label: 'ملاحظة الصلاحية',
        type: 'text',
        defaultValue: 'صالحة في جميع فروع بغداد وأربيل',
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
      const store = escapeXml(fields.store || 'متجر أور الفاخر');
      const headline = escapeXml(fields.headline || 'بطاقة هدية مميزة');
      const amount = escapeXml(fields.amount || '100,000 د.ع');
      const code = escapeXml(fields.code || 'GIFT-IQ-2026');
      const note = escapeXml(fields.note || 'صالحة في جميع فروع بغداد وأربيل');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cr02-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="0.5" stop-color="${secondaryColor}"/>
      <stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
    <radialGradient id="cr02-glow" cx="74%" cy="32%" r="58%">
      <stop offset="0" stop-color="${primaryColor}" stop-opacity="0.24"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cr02-clip">
      <rect x="12" y="12" width="516" height="306" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="16" fill="${bg}" stroke="url(#cr02-g)" stroke-width="2.6" data-color-role="background"/>
  <g clip-path="url(#cr02-clip)">
    <rect x="12" y="12" width="516" height="306" fill="url(#cr02-glow)"/>
    <path d="M12 12 H182 L144 318 H12 Z" fill="${primaryColor}" fill-opacity="0.12" data-color-role="primary"/>
    <path d="M182 12 L144 318" stroke="url(#cr02-g)" stroke-width="1.6"/>
    <path d="M174 12 L136 318" stroke="${primaryColor}" stroke-width="0.7" stroke-opacity="0.35"/>
  </g>
  <rect x="20" y="20" width="500" height="290" rx="12" fill="none" stroke="${primaryColor}" stroke-width="0.8" stroke-opacity="0.35"/>
  ${cornerBracketsMarkup(28, 28, 484, 274, 18, primaryColor, 1.8, 'primary')}
  <circle cx="86" cy="126" r="40" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.5"/>
  ${iconMarkup('gift', 58, 98, 56, primaryColor, 'primary')}
  <rect x="24" y="196" width="118" height="34" rx="10" fill="${primaryColor}" fill-opacity="0.14" stroke="${primaryColor}" stroke-width="1.1" stroke-opacity="0.55"/>
  <text data-field-id="code" data-max-width="104" x="83" y="213" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(12 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" data-color-role="secondary">
    ${code}
  </text>
  <text data-field-id="store" data-max-width="304" x="342" y="66" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${store}
  </text>
  <path d="M238 86 H446" stroke="${primaryColor}" stroke-width="0.9" stroke-opacity="0.45"/>
  <text data-field-id="headline" data-max-width="308" x="342" y="114" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${headline}
  </text>
  <rect x="212" y="148" width="260" height="68" rx="34" fill="url(#cr02-g)" stroke="${secondaryColor}" stroke-width="1.2" stroke-opacity="0.45" data-color-role="primary"/>
  <rect x="218" y="154" width="248" height="56" rx="28" fill="none" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.3"/>
  <text data-field-id="amount" data-max-width="224" x="342" y="182" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${amount}
  </text>
  <text data-field-id="note" data-max-width="308" x="342" y="262" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" opacity="0.84">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_vip_loyalty_punch',
    name: 'بطاقة الولاء والأختام VIP',
    nameEn: 'VIP Loyalty Punch Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة ولاء عملاء من 10 خانات ختم مع مكافأة مجانية في الخانة العاشرة',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 16 },
    defaultColors: {
      primary: '#7C2D42',
      secondary: '#D49A42',
      background: '#FFFDF9',
    },
    fields: [
      { id: 'brand', label: 'اسم المتجر', type: 'text', defaultValue: 'بوتيك الياسمين' },
      {
        id: 'reward',
        label: 'عرض المكافأة',
        type: 'text',
        defaultValue: 'اجمع 9 أختام والعاشر هدية مجانية',
      },
      { id: 'badge', label: 'شارة الولاء', type: 'text', defaultValue: 'VIP CLUB' },
      { id: 'phone', label: 'هاتف المتجر', type: 'text', defaultValue: '+964 770 245 8890' },
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
      const brand = escapeXml(fields.brand || 'بوتيك الياسمين');
      const reward = escapeXml(fields.reward || 'اجمع 9 أختام والعاشر هدية مجانية');
      const badge = escapeXml(fields.badge || 'VIP CLUB');
      const phone = escapeXml(fields.phone || '+964 770 245 8890');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const punchCircles = Array.from({ length: 10 }, (_, idx) => {
        const col = idx % 5;
        const row = Math.floor(idx / 5);
        const cx = 203 + col * 68;
        const cy = 154 + row * 72;
        if (idx === 9) {
          return (
            `<circle cx="${cx}" cy="${cy}" r="27" fill="none" stroke="${secondaryColor}" stroke-width="1.2" stroke-dasharray="3 3" data-color-role="secondary"/>` +
            `<circle cx="${cx}" cy="${cy}" r="23" fill="${secondaryColor}" data-color-role="secondary"/>` +
            `<polygon points="${starPoints(cx, cy, 5, 13, 6)}" fill="${backgroundColor}"/>`
          );
        }
        return (
          `<circle cx="${cx}" cy="${cy}" r="24" fill="${primaryColor}" fill-opacity="0.06" stroke="${primaryColor}" stroke-width="1.6" stroke-dasharray="4 3" data-color-role="primary"/>` +
          `<text data-max-width="30" x="${cx}" y="${cy}" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" opacity="0.72">${idx + 1}</text>`
        );
      }).join('');

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cr03-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="#4A1725"/>
    </linearGradient>
    <clipPath id="cr03-clip">
      <rect x="12" y="12" width="516" height="306" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr03-clip)">
    <rect x="12" y="12" width="138" height="306" fill="url(#cr03-g)" data-color-role="primary"/>
    <path d="M149 12 V318" stroke="${secondaryColor}" stroke-width="1.6" stroke-opacity="0.65"/>
    <circle cx="81" cy="78" r="36" fill="none" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.45"/>
    <circle cx="81" cy="78" r="30" fill="${secondaryColor}" fill-opacity="0.2" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
    <polygon points="${starPoints(81, 78, 5, 16, 7)}" fill="${secondaryColor}" data-color-role="secondary"/>
  </g>
  <rect x="22" y="138" width="118" height="36" rx="18" fill="${secondaryColor}" fill-opacity="0.18" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <text data-field-id="badge" data-max-width="102" x="81" y="156" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${badge}
  </text>
  <path d="M44 208 H118" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.45"/>
  <rect x="20" y="254" width="122" height="34" rx="17" fill="${backgroundColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-width="0.9" stroke-opacity="0.45"/>
  <text data-field-id="phone" data-max-width="108" x="81" y="271" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="600" fill="${backgroundColor}" text-anchor="middle" opacity="0.95" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  <text data-field-id="brand" data-max-width="336" x="339" y="52" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${brand}
  </text>
  <rect x="176" y="78" width="326" height="34" rx="17" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-width="1.1" stroke-opacity="0.55" data-color-role="secondary"/>
  <text data-field-id="reward" data-max-width="302" x="339" y="95" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${reward}
  </text>
  ${punchCircles}
  <path d="M186 276 H492" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.32"/>
  ${starRowMarkup(339, 294, 3, 22, 6.5, secondaryColor, 'secondary')}
</svg>`;
    },
  },
  {
    id: 'card_ret_flash_sale_ribbon',
    name: 'بطاقة التخفيضات السريعة',
    nameEn: 'Flash Sale Diagonal Ribbon Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة عرض سريع بشريط قطري جريء وشارة نسبة الخصم والسعر بالدينار العراقي',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 14 },
    defaultColors: {
      primary: '#DC2626',
      secondary: '#18181B',
      background: '#FFFDF7',
    },
    fields: [
      { id: 'ribbon', label: 'نص الشريط', type: 'text', defaultValue: 'خصم فوري' },
      { id: 'percent', label: 'نسبة الخصم', type: 'text', defaultValue: '40%' },
      { id: 'title', label: 'عنوان العرض', type: 'text', defaultValue: 'تصفية نهاية الموسم' },
      {
        id: 'price',
        label: 'السعر بعد الخصم',
        type: 'text',
        defaultValue: 'ابتداءً من 15,000 د.ع',
      },
      {
        id: 'cta',
        label: 'شريط التنبيه',
        type: 'text',
        defaultValue: 'العرض ساري لغاية نفاد الكمية',
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
      const ribbon = escapeXml(fields.ribbon || 'خصم فوري');
      const percent = escapeXml(fields.percent || '40%');
      const title = escapeXml(fields.title || 'تصفية نهاية الموسم');
      const price = escapeXml(fields.price || 'ابتداءً من 15,000 د.ع');
      const cta = escapeXml(fields.cta || 'العرض ساري لغاية نفاد الكمية');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cr04-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="#991B1B"/>
    </linearGradient>
    <clipPath id="cr04-clip">
      <rect x="12" y="12" width="516" height="306" rx="14"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="14" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr04-clip)">
    <path d="M12 12 H195 L12 195 Z" fill="${secondaryColor}" fill-opacity="0.06"/>
    <path d="M-10 128 L128 -10 L194 -10 L-10 194 Z" fill="url(#cr04-g)" data-color-role="primary"/>
    <path d="M-10 135 L135 -10 M-10 187 L187 -10" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.35"/>
    <rect x="12" y="264" width="516" height="54" fill="${secondaryColor}" data-color-role="secondary"/>
    <path d="M12 264 H528" stroke="${primaryColor}" stroke-width="2"/>
  </g>
  <g transform="translate(76, 76) rotate(-45)">
    <text data-field-id="ribbon" data-max-width="116" x="0" y="0" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
      ${ribbon}
    </text>
  </g>
  <polygon points="${starPoints(126, 182, 14, 68, 58)}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="126" cy="182" r="51" fill="none" stroke="${backgroundColor}" stroke-width="1.6" stroke-dasharray="4 3"/>
  <text data-field-id="percent" data-max-width="90" x="126" y="182" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${percent}
  </text>
  <text data-field-id="title" data-max-width="290" x="364" y="96" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <rect x="218" y="140" width="292" height="64" rx="32" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <text data-field-id="price" data-max-width="264" x="364" y="172" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${price}
  </text>
  <text data-field-id="cta" data-max-width="460" x="270" y="291" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${cta}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_new_collection_editorial',
    name: 'بطاقة التشكيلة الجديدة التحريرية',
    nameEn: 'New Collection Editorial Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة مجلة أزياء أنيقة لإطلاق التشكيلات الموسمية بقوس معماري ناعم',
    defaultWidth: 420,
    defaultHeight: 540,
    aspectRatio: 420 / 540,
    defaultMm: { width: 70, height: 90 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 396, height: 516, rx: 16 },
    defaultColors: {
      primary: '#7A5438',
      secondary: '#2B2420',
      background: '#FBF6F0',
    },
    fields: [
      { id: 'season', label: 'الموسم', type: 'text', defaultValue: 'تشكيلة خريف / شتاء' },
      { id: 'title', label: 'العنوان التحريري', type: 'text', defaultValue: 'وصل حديثاً' },
      { id: 'brand', label: 'اسم العلامة', type: 'text', defaultValue: 'ألماس كولكشن' },
      {
        id: 'location',
        label: 'العنوان',
        type: 'text',
        defaultValue: 'بغداد — المنصور، شارع الأميرات',
      },
      { id: 'handle', label: 'الموقع الإلكتروني', type: 'text', defaultValue: 'almas.style.iq' },
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
      const season = escapeXml(fields.season || 'تشكيلة خريف / شتاء');
      const title = escapeXml(fields.title || 'وصل حديثاً');
      const brand = escapeXml(fields.brand || 'ألماس كولكشن');
      const location = escapeXml(fields.location || 'بغداد — المنصور، شارع الأميرات');
      const handle = escapeXml(fields.handle || 'almas.style.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 540" width="420" height="540">
  <defs>
    <linearGradient id="cr05-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${primaryColor}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0.04"/>
    </linearGradient>
  </defs>
  <rect x="12" y="12" width="396" height="516" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="24" y="24" width="372" height="492" rx="12" fill="none" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.35"/>
  <path d="M56 324 V166 A154 134 0 0 1 364 166 V324 Z" fill="url(#cr05-g)" stroke="${primaryColor}" stroke-width="1.8" data-color-role="primary"/>
  <path d="M70 314 V170 A140 120 0 0 1 350 170 V314" fill="none" stroke="${secondaryColor}" stroke-width="0.9" stroke-opacity="0.35"/>
  ${iconMarkup('sparkle', 194, 68, 32, primaryColor, 'primary')}
  <rect x="104" y="122" width="212" height="36" rx="18" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="season" data-max-width="188" x="210" y="140" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${season}
  </text>
  <text data-field-id="title" data-max-width="276" x="210" y="214" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <text data-field-id="brand" data-max-width="260" x="210" y="278" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${brand}
  </text>
  <path d="M74 360 H194 M226 360 H346" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.45"/>
  <polygon points="210,354 216,360 210,366 204,360" fill="${primaryColor}" fill-opacity="0.65" data-color-role="primary"/>
  <text data-field-id="location" data-max-width="336" x="210" y="400" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${location}
  </text>
  <rect x="105" y="436" width="210" height="40" rx="20" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="184" x="210" y="456" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_warranty_certificate',
    name: 'بطاقة شهادة الضمان الرسمي',
    nameEn: 'Official Warranty Certificate Card',
    category: 'badges',
    shape: 'rect',
    description: 'شهادة ضمان تجارية رسمية بدرع حماية وأرقام تسلسلية للوكلاء والشركات',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 336, rx: 14 },
    defaultColors: {
      primary: '#1E40AF',
      secondary: '#0F172A',
      background: '#F8FAFC',
    },
    fields: [
      { id: 'title', label: 'عنوان الشهادة', type: 'text', defaultValue: 'شهادة ضمان رسمي معتمد' },
      { id: 'duration', label: 'مدة الضمان', type: 'text', defaultValue: 'ضمان حقيقي لمدة سنتين' },
      {
        id: 'serial',
        label: 'رقم الفاتورة / التسلسل',
        type: 'text',
        defaultValue: 'SN: IQ-994821',
      },
      {
        id: 'terms',
        label: 'الشروط',
        type: 'text',
        defaultValue: 'يشمل الصيانة المجانية واستبدال القطع المصنعية',
      },
      { id: 'support', label: 'مركز الصيانة', type: 'text', defaultValue: '+964 780 512 9000' },
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
      const title = escapeXml(fields.title || 'شهادة ضمان رسمي معتمد');
      const duration = escapeXml(fields.duration || 'ضمان حقيقي لمدة سنتين');
      const serial = escapeXml(fields.serial || 'SN: IQ-994821');
      const terms = escapeXml(fields.terms || 'يشمل الصيانة المجانية واستبدال القطع المصنعية');
      const support = escapeXml(fields.support || '+964 780 512 9000');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <linearGradient id="cr06-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${secondaryColor}"/>
      <stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="cr06-clip">
      <rect x="12" y="12" width="516" height="336" rx="14"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="336" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr06-clip)">
    <rect x="12" y="12" width="516" height="78" fill="url(#cr06-g)" data-color-role="primary"/>
    <path d="M12 85 H528" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.25"/>
    <rect x="12" y="336" width="516" height="12" fill="${primaryColor}" data-color-role="primary"/>
  </g>
  ${cornerBracketsMarkup(24, 102, 492, 222, 16, primaryColor, 1.5, 'primary')}
  <g transform="translate(46, 124)">
    <circle cx="36" cy="40" r="42" fill="${primaryColor}" fill-opacity="0.06" stroke="${primaryColor}" stroke-width="1" stroke-dasharray="4 3" stroke-opacity="0.4"/>
    <path d="M36 4 L66 16 V38 C66 56 52 70 36 76 C20 70 6 56 6 38 V16 Z" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
    <path d="M23 40 L33 50 L51 28" fill="none" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary"/>
  </g>
  <text data-field-id="title" data-max-width="460" x="270" y="51" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="duration" data-max-width="330" x="320" y="144" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${duration}
  </text>
  <rect x="174" y="174" width="292" height="42" rx="10" fill="${primaryColor}" fill-opacity="0.08" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="1.3"/>
  <text data-field-id="serial" data-max-width="264" x="320" y="195" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" data-color-role="primary">
    ${serial}
  </text>
  <text data-field-id="terms" data-max-width="444" x="270" y="246" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${terms}
  </text>
  <rect x="164" y="274" width="212" height="38" rx="19" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="support" data-max-width="184" x="270" y="293" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${support}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_thank_you_unboxing',
    name: 'بطاقة شكر داخل الطرد',
    nameEn: 'Thank You Unboxing Insert Card',
    category: 'packaging',
    shape: 'rect',
    description: 'بطاقة شكر دافئة تُرفق داخل طرود التوصيل مع كود خصم للطلب القادم',
    defaultWidth: 600,
    defaultHeight: 420,
    aspectRatio: 600 / 420,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 572, height: 392, rx: 18 },
    defaultColors: {
      primary: '#9D4E5A',
      secondary: '#3A2E32',
      background: '#FFF9F6',
    },
    fields: [
      {
        id: 'headline',
        label: 'عبارة الشكر',
        type: 'text',
        defaultValue: 'شكراً لطلبكِ من متجرنا',
      },
      {
        id: 'message',
        label: 'رسالة دافئة',
        type: 'text',
        defaultValue: 'سعادتكم تهمّنا — نتمنى أن تنال القطعة إعجابكم',
      },
      {
        id: 'promo',
        label: 'كود الخصم القادم',
        type: 'text',
        defaultValue: 'خصم 10% لطلبك القادم: BAGHDAD10',
      },
      { id: 'brand', label: 'التوقيع / الحساب', type: 'text', defaultValue: '@warda.boutique.iq' },
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
      const headline = escapeXml(fields.headline || 'شكراً لطلبكِ من متجرنا');
      const message = escapeXml(fields.message || 'سعادتكم تهمّنا — نتمنى أن تنال القطعة إعجابكم');
      const promo = escapeXml(fields.promo || 'خصم 10% لطلبك القادم: BAGHDAD10');
      const brand = escapeXml(fields.brand || '@warda.boutique.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <radialGradient id="cr07-g" cx="50%" cy="40%" r="60%">
      <stop offset="0" stop-color="${primaryColor}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="572" height="392" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="28" y="28" width="544" height="364" rx="12" fill="url(#cr07-g)" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.35"/>
  ${cornerBracketsMarkup(40, 40, 520, 340, 14, primaryColor, 1.3, 'primary')}
  ${iconMarkup('heart', 280, 54, 40, primaryColor, 'primary')}
  ${iconMarkup('sparkle', 236, 64, 20, secondaryColor, 'secondary')}
  ${iconMarkup('sparkle', 344, 64, 20, secondaryColor, 'secondary')}
  <text data-field-id="headline" data-max-width="490" x="300" y="144" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${headline}
  </text>
  <path d="M130 184 H470" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.35"/>
  <text data-field-id="message" data-max-width="486" x="300" y="218" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${message}
  </text>
  <rect x="86" y="254" width="428" height="56" rx="28" fill="${primaryColor}" data-color-role="primary"/>
  <rect x="92" y="260" width="416" height="44" rx="22" fill="none" stroke="${backgroundColor}" stroke-width="1" stroke-dasharray="5 4" stroke-opacity="0.45"/>
  <text data-field-id="promo" data-max-width="388" x="300" y="282" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${promo}
  </text>
  <text data-field-id="brand" data-max-width="300" x="300" y="348" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${brand}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_care_washing_guide',
    name: 'بطاقة إرشادات العناية والغسيل',
    nameEn: 'Care & Washing Instruction Card',
    category: 'packaging',
    shape: 'rect',
    description: 'بطاقة تعليمات العناية بالأقمشة والملابس بأيقونات الغسيل والكي والتجفيف',
    defaultWidth: 420,
    defaultHeight: 540,
    aspectRatio: 420 / 540,
    defaultMm: { width: 70, height: 90 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 396, height: 516, rx: 16 },
    defaultColors: {
      primary: '#2F5D62',
      secondary: '#5E8B7E',
      background: '#F7FAF9',
    },
    fields: [
      { id: 'title', label: 'العنوان', type: 'text', defaultValue: 'دليل العناية بالقطعة' },
      {
        id: 'rule1',
        label: 'القاعدة الأولى',
        type: 'text',
        defaultValue: 'غسيل بارد بماء لطيف 30°',
      },
      {
        id: 'rule2',
        label: 'القاعدة الثانية',
        type: 'text',
        defaultValue: 'يُمنع استخدام المبيّضات',
      },
      {
        id: 'rule3',
        label: 'القاعدة الثالثة',
        type: 'text',
        defaultValue: 'كيّ بدرجة حرارة منخفضة',
      },
      { id: 'fabric', label: 'خامة القماش', type: 'text', defaultValue: '100% قطن طبيعي فاخر' },
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
      const title = escapeXml(fields.title || 'دليل العناية بالقطعة');
      const rule1 = escapeXml(fields.rule1 || 'غسيل بارد بماء لطيف 30°');
      const rule2 = escapeXml(fields.rule2 || 'يُمنع استخدام المبيّضات');
      const rule3 = escapeXml(fields.rule3 || 'كيّ بدرجة حرارة منخفضة');
      const fabric = escapeXml(fields.fabric || '100% قطن طبيعي فاخر');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 540" width="420" height="540">
  <defs>
    <linearGradient id="cr08-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cr08-clip">
      <rect x="12" y="12" width="396" height="516" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="396" height="516" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr08-clip)">
    <rect x="12" y="12" width="396" height="86" fill="url(#cr08-g)" data-color-role="primary"/>
    <path d="M12 92 H408" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.25"/>
  </g>
  <text data-field-id="title" data-max-width="340" x="210" y="55" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="34" y="126" width="352" height="88" rx="14" fill="${secondaryColor}" fill-opacity="0.1" stroke="${secondaryColor}" stroke-opacity="0.32" stroke-width="1.3"/>
  <circle cx="338" cy="170" r="28" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.35"/>
  <g transform="translate(310, 143)" stroke="${primaryColor}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <path d="M6 14 L12 40 H44 L50 14"/>
    <path d="M9 22 Q18 17 28 22 T47 22"/>
  </g>
  <text data-field-id="rule1" data-max-width="244" x="296" y="170" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    ${rule1}
  </text>
  <rect x="34" y="232" width="352" height="88" rx="14" fill="${secondaryColor}" fill-opacity="0.1" stroke="${secondaryColor}" stroke-opacity="0.32" stroke-width="1.3"/>
  <circle cx="338" cy="276" r="28" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.35"/>
  <g transform="translate(310, 249)" stroke="${primaryColor}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <path d="M28 8 L48 42 H8 Z"/>
    <path d="M12 16 L44 40 M44 16 L12 40"/>
  </g>
  <text data-field-id="rule2" data-max-width="244" x="296" y="276" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    ${rule2}
  </text>
  <rect x="34" y="338" width="352" height="88" rx="14" fill="${secondaryColor}" fill-opacity="0.1" stroke="${secondaryColor}" stroke-opacity="0.32" stroke-width="1.3"/>
  <circle cx="338" cy="382" r="28" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.35"/>
  <g transform="translate(310, 355)" stroke="${primaryColor}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <path d="M14 14 H36 L47 38 H9 C9 27 17 23 36 23"/>
    <circle cx="28" cy="31" r="2.2" fill="${primaryColor}"/>
  </g>
  <text data-field-id="rule3" data-max-width="244" x="296" y="382" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    ${rule3}
  </text>
  <rect x="64" y="452" width="292" height="46" rx="23" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="fabric" data-max-width="260" x="210" y="475" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${fabric}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_product_authenticity',
    name: 'بطاقة أصالة المنتج الموثّقة',
    nameEn: 'Product Authenticity Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة توثيق أصالة المنتج برقم تشغيلة وختم سداسي ورابط تحقق',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 14 },
    defaultColors: {
      primary: '#0EA5E9',
      secondary: '#E2E8F0',
      background: '#0B1324',
    },
    fields: [
      { id: 'title', label: 'العنوان', type: 'text', defaultValue: 'بطاقة الأصالة المعتمدة' },
      {
        id: 'statement',
        label: 'بيان التوثيق',
        type: 'text',
        defaultValue: 'نضمن بأن هذا المنتج أصلي 100% ومفحوص مخبرياً',
      },
      { id: 'batch', label: 'رقم التوثيق', type: 'text', defaultValue: 'AUTH-2026-8834' },
      { id: 'verifyUrl', label: 'رابط التحقق', type: 'text', defaultValue: 'verify.alrafidain.iq' },
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
      const title = escapeXml(fields.title || 'بطاقة الأصالة المعتمدة');
      const statement = escapeXml(
        fields.statement || 'نضمن بأن هذا المنتج أصلي 100% ومفحوص مخبرياً',
      );
      const batch = escapeXml(fields.batch || 'AUTH-2026-8834');
      const verifyUrl = escapeXml(fields.verifyUrl || 'verify.alrafidain.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cr09-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0.04"/>
    </linearGradient>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="24" y="24" width="492" height="282" rx="10" fill="url(#cr09-g)" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.45"/>
  ${cornerBracketsMarkup(34, 34, 472, 262, 18, primaryColor, 2, 'primary')}
  <polygon points="${regularPolygonPoints(96, 134, 52, 6)}" fill="none" stroke="${primaryColor}" stroke-width="1" stroke-dasharray="4 3" stroke-opacity="0.55"/>
  <polygon points="${regularPolygonPoints(96, 134, 42, 6)}" fill="${primaryColor}" fill-opacity="0.18" stroke="${primaryColor}" stroke-width="2.2" data-color-role="primary"/>
  <path d="M80 135 L91 146 L113 122" fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" data-color-role="secondary"/>
  <text data-field-id="title" data-max-width="318" x="328" y="88" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <text data-field-id="statement" data-max-width="320" x="328" y="132" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" opacity="0.88">
    ${statement}
  </text>
  <rect x="176" y="166" width="304" height="46" rx="10" fill="${primaryColor}" fill-opacity="0.16" stroke="${primaryColor}" stroke-width="1.4"/>
  <text data-field-id="batch" data-max-width="276" x="328" y="189" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(19 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" data-color-role="primary">
    ${batch}
  </text>
  <rect x="170" y="238" width="200" height="38" rx="19" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="verifyUrl" data-max-width="176" x="270" y="257" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${verifyUrl}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_bogo_modern_ticket',
    name: 'تذكرة عرض اشترِ 1 واحصل على 1',
    nameEn: 'Buy 1 Get 1 Modern Ticket Card',
    category: 'retail',
    shape: 'rect',
    description: 'تذكرة كوبون عصرية بثلمات قص جانبية وشريط تثقيب لعروض 1+1 المجانية',
    defaultWidth: 540,
    defaultHeight: 300,
    aspectRatio: 540 / 300,
    defaultMm: { width: 90, height: 50 },
    cutShape: { kind: 'path', d: ticketStubPath(12, 12, 516, 276, 16, 15, 0.5) },
    defaultColors: {
      primary: '#E11D48',
      secondary: '#1F2937',
      background: '#FFFDFB',
    },
    fields: [
      { id: 'stubBadge', label: 'رقم العرض الجانبي', type: 'text', defaultValue: '1+1' },
      { id: 'stubSub', label: 'وصف الجانب', type: 'text', defaultValue: 'مجاناً' },
      {
        id: 'headline',
        label: 'عنوان التذكرة',
        type: 'text',
        defaultValue: 'اشترِ قطعة واحصل على الثانية مجاناً',
      },
      {
        id: 'minOrder',
        label: 'شرط العرض',
        type: 'text',
        defaultValue: 'للمشتريات فوق 30,000 د.ع',
      },
      {
        id: 'expiry',
        label: 'صلاحية الكوبون',
        type: 'text',
        defaultValue: 'صالح طوال الشهر الحالي',
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
      const stubBadge = escapeXml(fields.stubBadge || '1+1');
      const stubSub = escapeXml(fields.stubSub || 'مجاناً');
      const headline = escapeXml(fields.headline || 'اشترِ قطعة واحصل على الثانية مجاناً');
      const minOrder = escapeXml(fields.minOrder || 'للمشتريات فوق 30,000 د.ع');
      const expiry = escapeXml(fields.expiry || 'صالح طوال الشهر الحالي');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const stubD = ticketStubPath(12, 12, 516, 276, 16, 15, 0.5);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 300" width="540" height="300">
  <defs>
    <linearGradient id="cr10-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="#9F1239"/>
    </linearGradient>
    <clipPath id="cr10-clip">
      <path d="${stubD}"/>
    </clipPath>
  </defs>
  <path d="${stubD}" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr10-clip)">
    <rect x="12" y="12" width="166" height="276" fill="url(#cr10-g)" data-color-role="primary"/>
    <rect x="178" y="12" width="350" height="16" fill="${secondaryColor}" data-color-role="secondary"/>
    <rect x="178" y="274" width="350" height="14" fill="${primaryColor}" fill-opacity="0.16"/>
  </g>
  <path d="M178 24 V276" stroke="${secondaryColor}" stroke-width="1.8" stroke-dasharray="6 6" opacity="0.5"/>
  <circle cx="178" cy="12" r="5" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="1.5"/>
  <circle cx="178" cy="288" r="5" fill="${backgroundColor}" stroke="${secondaryColor}" stroke-width="1.5"/>
  <text data-field-id="stubBadge" data-max-width="124" x="99" y="126" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(54 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${stubBadge}
  </text>
  <rect x="42" y="182" width="114" height="36" rx="18" fill="${backgroundColor}" fill-opacity="0.18" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.45"/>
  <text data-field-id="stubSub" data-max-width="96" x="99" y="200" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${stubSub}
  </text>
  <text data-field-id="headline" data-max-width="304" x="353" y="96" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${headline}
  </text>
  <rect x="218" y="136" width="270" height="48" rx="24" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="1.6" data-color-role="primary"/>
  <text data-field-id="minOrder" data-max-width="244" x="353" y="160" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${minOrder}
  </text>
  <text data-field-id="expiry" data-max-width="290" x="353" y="228" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" opacity="0.78">
    ${expiry}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_boutique_return_policy',
    name: 'بطاقة سياسة الاستبدال والاسترجاع',
    nameEn: 'Boutique Return Policy Card',
    category: 'packaging',
    shape: 'rect',
    description: 'بطاقة منظمة تشرح شروط الاستبدال والاسترجاع وأرقام خدمة العملاء',
    defaultWidth: 600,
    defaultHeight: 420,
    aspectRatio: 600 / 420,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 572, height: 392, rx: 16 },
    defaultColors: {
      primary: '#334155',
      secondary: '#0D9488',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'title', label: 'العنوان', type: 'text', defaultValue: 'سياسة الاستبدال والاسترجاع' },
      {
        id: 'rule1',
        label: 'البند الأول',
        type: 'text',
        defaultValue: 'الاستبدال متاح خلال 7 أيام من تاريخ الاستلام',
      },
      {
        id: 'rule2',
        label: 'البند الثاني',
        type: 'text',
        defaultValue: 'أن تكون القطعة بحالتها الأصلية مع التاق',
      },
      {
        id: 'rule3',
        label: 'البند الثالث',
        type: 'text',
        defaultValue: 'التوصيل مجاني في حال وجود خلل مصنعي',
      },
      { id: 'whatsapp', label: 'واتساب الدعم', type: 'text', defaultValue: '+964 771 334 5566' },
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
      const title = escapeXml(fields.title || 'سياسة الاستبدال والاسترجاع');
      const rule1 = escapeXml(fields.rule1 || 'الاستبدال متاح خلال 7 أيام من تاريخ الاستلام');
      const rule2 = escapeXml(fields.rule2 || 'أن تكون القطعة بحالتها الأصلية مع التاق');
      const rule3 = escapeXml(fields.rule3 || 'التوصيل مجاني في حال وجود خلل مصنعي');
      const whatsapp = escapeXml(fields.whatsapp || '+964 771 334 5566');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <linearGradient id="cr11-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cr11-clip">
      <rect x="14" y="14" width="572" height="392" rx="16"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="572" height="392" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr11-clip)">
    <rect x="14" y="14" width="572" height="80" fill="url(#cr11-g)" data-color-role="primary"/>
    <path d="M14 89 H586" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.25"/>
  </g>
  <g transform="translate(508, 30)" stroke="${backgroundColor}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 22 A14 14 0 0 1 33 14 L38 19"/>
    <path d="M38 11 V19 H30"/>
    <path d="M38 26 A14 14 0 0 1 13 34 L8 29"/>
    <path d="M8 37 V29 H16"/>
  </g>
  <text data-field-id="title" data-max-width="420" x="275" y="54" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="44" y="118" width="512" height="52" rx="12" fill="${secondaryColor}" fill-opacity="0.06"/>
  <circle cx="524" cy="144" r="16" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-max-width="20" x="524" y="144" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">1</text>
  <text data-field-id="rule1" data-max-width="436" x="492" y="144" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    ${rule1}
  </text>
  <rect x="44" y="188" width="512" height="52" rx="12" fill="${secondaryColor}" fill-opacity="0.06"/>
  <circle cx="524" cy="214" r="16" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-max-width="20" x="524" y="214" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">2</text>
  <text data-field-id="rule2" data-max-width="436" x="492" y="214" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    ${rule2}
  </text>
  <rect x="44" y="258" width="512" height="52" rx="12" fill="${secondaryColor}" fill-opacity="0.06"/>
  <circle cx="524" cy="284" r="16" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-max-width="20" x="524" y="284" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">3</text>
  <text data-field-id="rule3" data-max-width="436" x="492" y="284" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    ${rule3}
  </text>
  <rect x="155" y="334" width="290" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="whatsapp" data-max-width="256" x="300" y="356" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${whatsapp}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_wholesale_price_card',
    name: 'بطاقة تسعير الجملة والمفرد',
    nameEn: 'Wholesale & Retail Price Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة مقارنة سريعة بين سعر الجملة وسعر المفرد مع الحد الأدنى للطلب',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 336, rx: 14 },
    defaultColors: {
      primary: '#0F766E',
      secondary: '#1E293B',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'product', label: 'اسم الصنف', type: 'text', defaultValue: 'طقم حافظات حراري 6 قطع' },
      { id: 'wholesalePrice', label: 'سعر الجملة', type: 'text', defaultValue: '24,000 د.ع' },
      { id: 'retailPrice', label: 'سعر المفرد', type: 'text', defaultValue: '32,000 د.ع' },
      { id: 'minQty', label: 'أقل كمية جملة', type: 'text', defaultValue: 'أقل طلب جملة: 12 قطعة' },
      { id: 'phone', label: 'هاتف المبيعات', type: 'text', defaultValue: '+964 780 990 1122' },
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
      const product = escapeXml(fields.product || 'طقم حافظات حراري 6 قطع');
      const wholesalePrice = escapeXml(fields.wholesalePrice || '24,000 د.ع');
      const retailPrice = escapeXml(fields.retailPrice || '32,000 د.ع');
      const minQty = escapeXml(fields.minQty || 'أقل طلب جملة: 12 قطعة');
      const phone = escapeXml(fields.phone || '+964 780 990 1122');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <linearGradient id="cr12-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${secondaryColor}"/>
      <stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="cr12-clip">
      <rect x="12" y="12" width="516" height="336" rx="14"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="336" rx="14" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr12-clip)">
    <rect x="12" y="12" width="516" height="82" fill="url(#cr12-g)" data-color-role="secondary"/>
    <path d="M12 89 H528" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.22"/>
  </g>
  <text data-field-id="product" data-max-width="468" x="270" y="53" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${product}
  </text>
  <rect x="34" y="114" width="224" height="142" rx="14" fill="${secondaryColor}" fill-opacity="0.06" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1.5"/>
  <path d="M54 168 H238" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.16"/>
  <text data-max-width="180" x="146" y="142" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" opacity="0.78">
    سعر المفرد
  </text>
  <text data-field-id="retailPrice" data-max-width="196" x="146" y="212" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${retailPrice}
  </text>
  <rect x="282" y="114" width="224" height="142" rx="14" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="2.2" data-color-role="primary"/>
  <path d="M302 168 H486" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.28"/>
  <text data-max-width="180" x="394" y="142" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    سعر الجملة
  </text>
  <text data-field-id="wholesalePrice" data-max-width="196" x="394" y="212" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${wholesalePrice}
  </text>
  <rect x="34" y="278" width="252" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="minQty" data-max-width="228" x="160" y="300" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${minQty}
  </text>
  <rect x="302" y="278" width="204" height="44" rx="22" fill="${secondaryColor}" fill-opacity="0.06" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1.4"/>
  <text data-field-id="phone" data-max-width="180" x="404" y="300" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_jewelry_brand_card',
    name: 'بطاقة مجوهرات وإكسسوارات فاخرة',
    nameEn: 'Luxury Jewelry Brand Card',
    category: 'retail',
    shape: 'square',
    description: 'بطاقة عرض مربعة فاخرة للمجوهرات والفضة بأيقونة ماسة وإطار مزدوج ذهبي',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 80, height: 80 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 452, height: 452, rx: 18 },
    defaultColors: {
      primary: '#9A6F32',
      secondary: '#1B3B36',
      background: '#FCF9F2',
    },
    fields: [
      { id: 'brand', label: 'اسم الدار', type: 'text', defaultValue: 'مجوهرات بابل' },
      {
        id: 'karat',
        label: 'العيار / الخامة',
        type: 'text',
        defaultValue: 'ذهب عيار 21 • صياغة يدوية',
      },
      { id: 'guarantee', label: 'الضمان', type: 'text', defaultValue: 'مختوم ومضمون مدى الحياة' },
      { id: 'website', label: 'الحساب / الموقع', type: 'text', defaultValue: 'babylon.gems.iq' },
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
      const brand = escapeXml(fields.brand || 'مجوهرات بابل');
      const karat = escapeXml(fields.karat || 'ذهب عيار 21 • صياغة يدوية');
      const guarantee = escapeXml(fields.guarantee || 'مختوم ومضمون مدى الحياة');
      const website = escapeXml(fields.website || 'babylon.gems.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="cr13-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="0.5" stop-color="#E7C98B"/>
      <stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="452" height="452" rx="18" fill="${bg}" stroke="url(#cr13-g)" stroke-width="3" data-color-role="background"/>
  <rect x="24" y="24" width="432" height="432" rx="14" fill="none" stroke="${primaryColor}" stroke-width="0.9" stroke-opacity="0.35"/>
  ${cornerBracketsMarkup(36, 36, 408, 408, 24, primaryColor, 2, 'primary')}
  <g transform="translate(198, 68)" fill="none" stroke="${primaryColor}" stroke-width="2.4" stroke-linejoin="round" data-color-role="primary">
    <polygon points="16,12 68,12 82,34 42,76 2,34" fill="${primaryColor}" fill-opacity="0.1"/>
    <path d="M2 34 H82 M16 12 L28 34 L42 76 L56 34 L68 12"/>
  </g>
  <text data-field-id="brand" data-max-width="360" x="240" y="204" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${brand}
  </text>
  <path d="M110 244 H224 M256 244 H370" stroke="url(#cr13-g)" stroke-width="1.6"/>
  <polygon points="240,238 246,244 240,250 234,244" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="karat" data-max-width="360" x="240" y="280" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${karat}
  </text>
  <text data-field-id="guarantee" data-max-width="340" x="240" y="324" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" opacity="0.82">
    ${guarantee}
  </text>
  <rect x="125" y="366" width="230" height="44" rx="22" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="website" data-max-width="196" x="240" y="388" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${website}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_electronics_warranty_seal',
    name: 'ختم ضمان الأجهزة الإلكترونية',
    nameEn: 'Electronics Warranty Seal Card',
    category: 'badges',
    shape: 'circle',
    description: 'ختم ضمان دائري للأجهزة والهواتف بتفاصيل هندسية وتنبيه عدم نزع الملصق',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 60, height: 60 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 224 },
    defaultColors: {
      primary: '#0284C7',
      secondary: '#0F172A',
      background: '#F0F9FF',
    },
    fields: [
      { id: 'topLabel', label: 'الشعار العلوي', type: 'text', defaultValue: 'ضمان الوكيل المعتمد' },
      { id: 'period', label: 'المدة', type: 'text', defaultValue: '12 شهر' },
      {
        id: 'warning',
        label: 'تنبيه الختم',
        type: 'text',
        defaultValue: 'يلغى الضمان عند إزالة الختم',
      },
      { id: 'phone', label: 'الدعم الفني', type: 'text', defaultValue: '+964 770 800 9090' },
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
      const topLabel = escapeXml(fields.topLabel || 'ضمان الوكيل المعتمد');
      const period = escapeXml(fields.period || '12 شهر');
      const warning = escapeXml(fields.warning || 'يلغى الضمان عند إزالة الختم');
      const phone = escapeXml(fields.phone || '+964 770 800 9090');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="cr14-g" cx="50%" cy="50%" r="55%">
      <stop offset="0" stop-color="${primaryColor}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${primaryColor}" stop-opacity="0.02"/>
    </radialGradient>
  </defs>
  <circle cx="240" cy="240" r="224" fill="${bg}" stroke="${secondaryColor}" stroke-width="5" data-color-role="background"/>
  <circle cx="240" cy="240" r="206" fill="url(#cr14-g)" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="7 5" data-color-role="primary"/>
  <g transform="translate(212, 66)" stroke="${primaryColor}" stroke-width="2.2" fill="none" data-color-role="primary">
    <rect x="14" y="14" width="28" height="28" rx="4" fill="${primaryColor}" fill-opacity="0.14"/>
    <path d="M22 6 V14 M34 6 V14 M22 42 V50 M34 42 V50 M6 22 H14 M6 34 H14 M42 22 H50 M42 34 H50"/>
  </g>
  <text data-field-id="topLabel" data-max-width="280" x="240" y="148" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${topLabel}
  </text>
  <rect x="96" y="182" width="288" height="86" rx="43" fill="${primaryColor}" data-color-role="primary"/>
  <rect x="102" y="188" width="276" height="74" rx="37" fill="none" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.35"/>
  <text data-field-id="period" data-max-width="244" x="240" y="225" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(42 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${period}
  </text>
  <text data-field-id="warning" data-max-width="290" x="240" y="304" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${warning}
  </text>
  <rect x="130" y="338" width="220" height="36" rx="18" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="1.1" stroke-opacity="0.45"/>
  <text data-field-id="phone" data-max-width="196" x="240" y="356" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_apparel_size_tag',
    name: 'بطاقة مقاس الملابس والأحذية',
    nameEn: 'Apparel & Shoe Size Hang Tag',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة مقاس معلّقة عمودية بدائرة مقاس بارزة وتفاصيل القصة والخامة',
    defaultWidth: 330,
    defaultHeight: 540,
    aspectRatio: 330 / 540,
    defaultMm: { width: 55, height: 90 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 306, height: 516, rx: 18 },
    defaultColors: {
      primary: '#4F46E5',
      secondary: '#111827',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'brand', label: 'العلامة التجارية', type: 'text', defaultValue: 'تشكيلة دجلة سبورت' },
      { id: 'sizeValue', label: 'رمز المقاس', type: 'text', defaultValue: 'XL' },
      {
        id: 'fitNote',
        label: 'القصة / النوع',
        type: 'text',
        defaultValue: 'قصة مريحة • Regular Fit',
      },
      { id: 'price', label: 'السعر', type: 'text', defaultValue: '35,000 د.ع' },
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
      const brand = escapeXml(fields.brand || 'تشكيلة دجلة سبورت');
      const sizeValue = escapeXml(fields.sizeValue || 'XL');
      const fitNote = escapeXml(fields.fitNote || 'قصة مريحة • Regular Fit');
      const price = escapeXml(fields.price || '35,000 د.ع');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 540" width="330" height="540">
  <defs>
    <linearGradient id="cr15-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cr15-clip">
      <rect x="12" y="12" width="306" height="516" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="306" height="516" rx="18" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr15-clip)">
    <rect x="12" y="12" width="306" height="126" fill="url(#cr15-g)" data-color-role="primary"/>
    <path d="M12 132 H318" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.25"/>
  </g>
  <circle cx="165" cy="48" r="16" fill="${backgroundColor}" fill-opacity="0.18" stroke="${backgroundColor}" stroke-width="1.2" stroke-opacity="0.5"/>
  <circle cx="165" cy="48" r="10.5" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2"/>
  <text data-field-id="brand" data-max-width="258" x="165" y="100" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${brand}
  </text>
  <circle cx="165" cy="248" r="78" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="3" data-color-role="primary"/>
  <circle cx="165" cy="248" r="65" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="165" cy="248" r="58" fill="none" stroke="${backgroundColor}" stroke-width="1" stroke-dasharray="4 3" stroke-opacity="0.4"/>
  <text data-field-id="sizeValue" data-max-width="106" x="165" y="248" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(54 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${sizeValue}
  </text>
  <text data-field-id="fitNote" data-max-width="260" x="165" y="366" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${fitNote}
  </text>
  <path d="M52 404 H278" stroke="${secondaryColor}" stroke-width="1.2" stroke-dasharray="5 5" opacity="0.35"/>
  <rect x="44" y="432" width="242" height="60" rx="30" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="price" data-max-width="216" x="165" y="462" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${price}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_white_friday_card',
    name: 'بطاقة عروض الجمعة البيضاء',
    nameEn: 'White Friday Promo Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة عروض الجمعة البيضاء والسوداء بتصميم جريء وألوان متباينة',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 14 },
    defaultColors: {
      primary: '#F59E0B',
      secondary: '#FFFFFF',
      background: '#0F0F12',
    },
    fields: [
      { id: 'eventTitle', label: 'عنوان الحدث', type: 'text', defaultValue: 'الجمعة البيضاء' },
      { id: 'discount', label: 'نسبة الخصم', type: 'text', defaultValue: 'تخفيضات لغاية 60%' },
      { id: 'promoCode', label: 'كود التفعيل', type: 'text', defaultValue: 'كود الخصم: WF60' },
      {
        id: 'dates',
        label: 'فترة العرض',
        type: 'text',
        defaultValue: 'في جميع فروعنا ومتجرنا الإلكتروني .iq',
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
      const eventTitle = escapeXml(fields.eventTitle || 'الجمعة البيضاء');
      const discount = escapeXml(fields.discount || 'تخفيضات لغاية 60%');
      const promoCode = escapeXml(fields.promoCode || 'كود الخصم: WF60');
      const dates = escapeXml(fields.dates || 'في جميع فروعنا ومتجرنا الإلكتروني .iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cr16-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="#D97706"/>
    </linearGradient>
    <clipPath id="cr16-clip">
      <rect x="12" y="12" width="516" height="306" rx="14"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cr16-clip)">
    <path d="M12 12 H152 L74 318 H12 Z" fill="${primaryColor}" fill-opacity="0.16" data-color-role="primary"/>
    <path d="M398 12 H528 V318 H446 Z" fill="${primaryColor}" fill-opacity="0.1" data-color-role="primary"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="10" fill="none" stroke="${primaryColor}" stroke-width="0.9" stroke-opacity="0.35"/>
  ${starRowMarkup(270, 52, 3, 28, 8, primaryColor, 'primary')}
  <text data-field-id="eventTitle" data-max-width="440" x="270" y="106" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${eventTitle}
  </text>
  <rect x="104" y="146" width="332" height="60" rx="30" fill="url(#cr16-g)" data-color-role="primary"/>
  <rect x="110" y="152" width="320" height="48" rx="24" fill="none" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.28"/>
  <text data-field-id="discount" data-max-width="290" x="270" y="176" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${discount}
  </text>
  <rect x="145" y="222" width="250" height="36" rx="18" fill="${primaryColor}" fill-opacity="0.14" stroke="${primaryColor}" stroke-width="1.1" stroke-dasharray="4 3" stroke-opacity="0.65"/>
  <text data-field-id="promoCode" data-max-width="226" x="270" y="240" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${promoCode}
  </text>
  <text data-field-id="dates" data-max-width="430" x="270" y="284" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" opacity="0.82">
    ${dates}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_cash_on_delivery_insert',
    name: 'بطاقة الدفع عند الاستلام وفحص الطلب',
    nameEn: 'Cash on Delivery Unboxing Insert',
    category: 'packaging',
    shape: 'rect',
    description: 'بطاقة داخل الطرود للتجارة الإلكترونية العراقية توضح قيمة الفاتورة وحق الفحص',
    defaultWidth: 600,
    defaultHeight: 420,
    aspectRatio: 600 / 420,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 572, height: 392, rx: 16 },
    defaultColors: {
      primary: '#15803D',
      secondary: '#1E293B',
      background: '#FAFCFA',
    },
    fields: [
      { id: 'store', label: 'اسم المتجر', type: 'text', defaultValue: 'متجر نخيل للتسوق' },
      {
        id: 'guarantee',
        label: 'ميزة الفحص',
        type: 'text',
        defaultValue: 'يحق للزبون فحص الطلب قبل الدفع',
      },
      {
        id: 'total',
        label: 'المبلغ المطلوب',
        type: 'text',
        defaultValue: 'المبلغ الكلي: 45,000 د.ع',
      },
      {
        id: 'support',
        label: 'رقم الشكاوى والمتابعة',
        type: 'text',
        defaultValue: '+964 750 612 3400',
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
      const store = escapeXml(fields.store || 'متجر نخيل للتسوق');
      const guarantee = escapeXml(fields.guarantee || 'يحق للزبون فحص الطلب قبل الدفع');
      const total = escapeXml(fields.total || 'المبلغ الكلي: 45,000 د.ع');
      const support = escapeXml(fields.support || '+964 750 612 3400');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <defs>
    <linearGradient id="cr17-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cr17-clip">
      <rect x="14" y="14" width="572" height="392" rx="16"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="572" height="392" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr17-clip)">
    <rect x="14" y="14" width="572" height="84" fill="url(#cr17-g)" data-color-role="primary"/>
    <path d="M14 93 H586" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.25"/>
  </g>
  <text data-field-id="store" data-max-width="480" x="300" y="56" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${store}
  </text>
  <rect x="48" y="124" width="504" height="72" rx="14" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="1.5" data-color-role="primary"/>
  <circle cx="512" cy="160" r="19" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M503 161 L509 167 L521 153" fill="none" stroke="${backgroundColor}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <text data-field-id="guarantee" data-max-width="400" x="272" y="160" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${guarantee}
  </text>
  <rect x="92" y="220" width="416" height="68" rx="14" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="98" y="226" width="404" height="56" rx="10" fill="none" stroke="${backgroundColor}" stroke-width="1" stroke-opacity="0.2"/>
  <text data-field-id="total" data-max-width="370" x="300" y="254" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${total}
  </text>
  <rect x="148" y="318" width="304" height="46" rx="23" fill="${primaryColor}" fill-opacity="0.09" stroke="${primaryColor}" stroke-width="1.3" stroke-opacity="0.5"/>
  <text data-field-id="support" data-max-width="270" x="300" y="341" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${support}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_bundle_deal_hang_tag',
    name: 'بطاقة عرض البكج التوفيري',
    nameEn: 'Bundle Deal Price Hang Tag',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة معلّقة لعروض التجميع (3 قطع بسعر 2) مع قسيمة سفلية مفصولة بالتثقيب',
    defaultWidth: 330,
    defaultHeight: 540,
    aspectRatio: 330 / 540,
    defaultMm: { width: 55, height: 90 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 306, height: 516, rx: 18 },
    defaultColors: {
      primary: '#EA580C',
      secondary: '#292524',
      background: '#FFFBF7',
    },
    fields: [
      { id: 'badge', label: 'شارة العرض', type: 'text', defaultValue: 'بكج التوفير' },
      { id: 'headline', label: 'تفصيل العرض', type: 'text', defaultValue: '3 قطع بسعر 2' },
      { id: 'categoryName', label: 'القسم', type: 'text', defaultValue: 'قسم العطور والإكسسوارات' },
      { id: 'bundlePrice', label: 'سعر البكج', type: 'text', defaultValue: '40,000 د.ع' },
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
      const badge = escapeXml(fields.badge || 'بكج التوفير');
      const headline = escapeXml(fields.headline || '3 قطع بسعر 2');
      const categoryName = escapeXml(fields.categoryName || 'قسم العطور والإكسسوارات');
      const bundlePrice = escapeXml(fields.bundlePrice || '40,000 د.ع');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 540" width="330" height="540">
  <defs>
    <linearGradient id="cr18-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="#C2410C"/>
    </linearGradient>
    <clipPath id="cr18-clip">
      <rect x="12" y="12" width="306" height="516" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="306" height="516" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cr18-clip)">
    <rect x="12" y="398" width="306" height="130" fill="${secondaryColor}" data-color-role="secondary"/>
    <rect x="12" y="12" width="306" height="16" fill="${primaryColor}" fill-opacity="0.16"/>
  </g>
  <rect x="20" y="20" width="290" height="368" rx="14" fill="none" stroke="${primaryColor}" stroke-width="0.9" stroke-opacity="0.28"/>
  <circle cx="165" cy="48" r="16" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.45"/>
  <circle cx="165" cy="48" r="10.5" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2"/>
  <rect x="64" y="84" width="202" height="42" rx="21" fill="url(#cr18-g)" data-color-role="primary"/>
  <text data-field-id="badge" data-max-width="174" x="165" y="105" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${badge}
  </text>
  <g transform="translate(133, 148)" fill="none" stroke="${primaryColor}" stroke-width="2.6" stroke-linejoin="round" data-color-role="primary">
    <path d="M10 20 H54 L58 58 H6 Z" fill="${primaryColor}" fill-opacity="0.1"/>
    <path d="M22 20 V14 A10 10 0 0 1 42 14 V20"/>
  </g>
  <text data-field-id="headline" data-max-width="264" x="165" y="258" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${headline}
  </text>
  <path d="M74 294 H256" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.35"/>
  <text data-field-id="categoryName" data-max-width="256" x="165" y="328" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${categoryName}
  </text>
  <path d="M26 404 H304" stroke="${backgroundColor}" stroke-width="2" stroke-dasharray="7 6"/>
  <circle cx="12" cy="404" r="6" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="1.5"/>
  <circle cx="318" cy="404" r="6" fill="${backgroundColor}" stroke="${primaryColor}" stroke-width="1.5"/>
  <text data-field-id="bundlePrice" data-max-width="260" x="165" y="466" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${bundlePrice}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_gift_wrap_seal',
    name: 'ختم تغليف الهدايا الفاخر',
    nameEn: 'Boutique Gift Wrap Seal',
    category: 'packaging',
    shape: 'circle',
    description: 'ختم تغليف دائري بحواف مموّجة وشريط هدية لختم علب وأكياس المتاجر',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 60, height: 60 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#833852',
      secondary: '#C89B62',
      background: '#FDF7F4',
    },
    fields: [
      { id: 'store', label: 'اسم المتجر', type: 'text', defaultValue: 'هدايا ليلك' },
      { id: 'caption', label: 'عبارة الختم', type: 'text', defaultValue: 'مُغلّفة بكل حب لأجلك' },
      { id: 'handle', label: 'المعرّف', type: 'text', defaultValue: 'lilac.gifts.iq' },
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
      const store = escapeXml(fields.store || 'هدايا ليلك');
      const caption = escapeXml(fields.caption || 'مُغلّفة بكل حب لأجلك');
      const handle = escapeXml(fields.handle || 'lilac.gifts.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const edge = scallopCirclePath(240, 240, 214, 26, 1.045);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="cr19-g" cx="50%" cy="45%" r="55%">
      <stop offset="0" stop-color="${secondaryColor}" stop-opacity="0.18"/>
      <stop offset="1" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <path d="${edge}" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <circle cx="240" cy="240" r="192" fill="url(#cr19-g)" stroke="${secondaryColor}" stroke-width="1.8" stroke-dasharray="5 5" data-color-role="secondary"/>
  <circle cx="240" cy="240" r="182" fill="none" stroke="${primaryColor}" stroke-width="0.7" stroke-opacity="0.28"/>
  ${iconMarkup('gift', 210, 88, 60, primaryColor, 'primary')}
  ${iconMarkup('sparkle', 176, 108, 18, secondaryColor, 'secondary')}
  ${iconMarkup('sparkle', 286, 108, 18, secondaryColor, 'secondary')}
  <text data-field-id="store" data-max-width="300" x="240" y="204" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${store}
  </text>
  <path d="M128 244 H224 M256 244 H352" stroke="${secondaryColor}" stroke-width="1.5"/>
  <polygon points="240,239 245,244 240,249 235,244" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="caption" data-max-width="300" x="240" y="282" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${caption}
  </text>
  <rect x="130" y="326" width="220" height="40" rx="20" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="188" x="240" y="346" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_ret_store_membership_card',
    name: 'بطاقة العضوية الذهبية ونقاط المتجر',
    nameEn: 'Gold Store Membership Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة عضوية ذهبية بنظام البطاقات البنكية لخصومات الأعضاء ونقاط الشراء',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 16 },
    defaultColors: {
      primary: '#C9963B',
      secondary: '#F8FAFC',
      background: '#111827',
    },
    fields: [
      { id: 'store', label: 'اسم المتجر', type: 'text', defaultValue: 'مجمع النور التجاري' },
      { id: 'tier', label: 'فئة العضوية', type: 'text', defaultValue: 'GOLD MEMBER' },
      {
        id: 'benefit',
        label: 'الميزة',
        type: 'text',
        defaultValue: 'خصم دائم 15% + أولوية العروض',
      },
      { id: 'memberId', label: 'رقم العضو', type: 'text', defaultValue: 'ID: 4008-9210-IQ' },
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
      const store = escapeXml(fields.store || 'مجمع النور التجاري');
      const tier = escapeXml(fields.tier || 'GOLD MEMBER');
      const benefit = escapeXml(fields.benefit || 'خصم دائم 15% + أولوية العروض');
      const memberId = escapeXml(fields.memberId || 'ID: 4008-9210-IQ');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cr20-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="0.5" stop-color="#F3D083"/>
      <stop offset="1" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="cr20-clip">
      <rect x="12" y="12" width="516" height="306" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="16" fill="${bg}" stroke="url(#cr20-g)" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cr20-clip)">
    <path d="M310 12 H528 V245 Z" fill="${primaryColor}" fill-opacity="0.12" data-color-role="primary"/>
    <rect x="12" y="256" width="516" height="62" fill="${primaryColor}" fill-opacity="0.14"/>
    <path d="M12 256 H528" stroke="${primaryColor}" stroke-width="1" stroke-opacity="0.45"/>
  </g>
  <rect x="20" y="20" width="500" height="290" rx="12" fill="none" stroke="${primaryColor}" stroke-width="0.8" stroke-opacity="0.32"/>
  <rect x="46" y="46" width="54" height="40" rx="7" fill="url(#cr20-g)" data-color-role="primary"/>
  <path d="M46 66 H100 M73 46 V86 M58 55 H88 M58 77 H88" stroke="${backgroundColor}" stroke-width="1.3" opacity="0.6"/>
  <g fill="none" stroke="${primaryColor}" stroke-width="1.8" stroke-linecap="round" opacity="0.75">
    <path d="M114 60 A10 10 0 0 1 114 72"/>
    <path d="M120 55 A16 16 0 0 1 120 77"/>
    <path d="M126 50 A22 22 0 0 1 126 82"/>
  </g>
  <rect x="332" y="46" width="162" height="38" rx="19" fill="url(#cr20-g)" data-color-role="primary"/>
  <text data-field-id="tier" data-max-width="138" x="413" y="65" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${tier}
  </text>
  <text data-field-id="store" data-max-width="440" x="270" y="142" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${store}
  </text>
  ${starRowMarkup(270, 182, 5, 24, 7.5, primaryColor, 'primary')}
  <text data-field-id="benefit" data-max-width="440" x="270" y="218" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${benefit}
  </text>
  <text data-field-id="memberId" data-max-width="340" x="270" y="287" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${memberId}
  </text>
</svg>`;
    },
  },
];
