import { cornerBracketsMarkup, starRowMarkup } from './svg-elements';
import { generateQrCodeInnerSvg } from '../lib/barcode-svg';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const SOCIAL_TEMPLATES: StickerTemplate[] = [
  {
    id: 'social_pay_accepted',
    name: 'ملصق الدفع الإلكتروني المعتمد',
    nameEn: 'Contactless Pay Accepted',
    category: 'social',
    shape: 'rect',
    description: 'ملصق لطاولات الكاشير ونقاط البيع يوضح قبول زين كاش وكي كارد والبطاقات المصرفية',
    defaultWidth: 500,
    defaultHeight: 320,
    aspectRatio: 500 / 320,
    defaultMm: { width: 70, height: 45 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 296, rx: 14 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#0F766E',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'payTitle', label: 'عنوان الدفع', type: 'text', defaultValue: 'طرق الدفع الإلكتروني' },
      {
        id: 'payMethods',
        label: 'الشبكات المقبولة',
        type: 'text',
        defaultValue: 'زين كاش • كي كارد • FIB • Visa',
      },
      { id: 'note', label: 'ملاحظة سريعة', type: 'text', defaultValue: 'دفع آمن وفوري بدون تلامس' },
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
      const title = escapeXml(fields.payTitle || 'طرق الدفع الإلكتروني');
      const methods = escapeXml(fields.payMethods || 'زين كاش • كي كارد • FIB • Visa');
      const note = escapeXml(fields.note || 'دفع آمن وفوري بدون تلامس');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <defs>
    <linearGradient id="sp-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="sp-clip">
      <rect x="12" y="12" width="476" height="296" rx="14"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="476" height="296" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#sp-clip)">
    <rect x="12" y="12" width="476" height="106" fill="url(#sp-hdr)" data-color-role="secondary"/>
    <circle cx="430" cy="40" r="78" fill="${backgroundColor}" opacity="0.08"/>
  </g>
  <rect x="34" y="34" width="96" height="62" rx="8" fill="${backgroundColor}" fill-opacity="0.16" stroke="${backgroundColor}" stroke-width="2"/>
  <path d="M 34,53 H 130 M 48,76 H 72" stroke="${backgroundColor}" stroke-width="2.5" stroke-linecap="round"/>
  <g fill="none" stroke="${backgroundColor}" stroke-width="2.8" stroke-linecap="round">
    <path d="M 142,57 Q 150,65 142,73 M 151,50 Q 163,65 151,80 M 160,43 Q 176,65 160,87"/>
  </g>
  <text data-field-id="payTitle" data-max-width="268" x="322" y="75" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="36" y="140" width="428" height="72" rx="12" fill="${secondaryColor}" fill-opacity="0.08" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1.5" data-color-role="secondary"/>
  ${cornerBracketsMarkup(28, 132, 444, 88, 12, primaryColor, 2, 'primary')}
  <text data-field-id="payMethods" data-max-width="396" x="250" y="186" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${methods}
  </text>
  <rect x="116" y="236" width="268" height="44" rx="22" fill="${primaryColor}" fill-opacity="0.07"/>
  <circle cx="144" cy="258" r="6" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="note" data-max-width="214" x="256" y="264" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: 'social_follow_us',
    name: 'تابعنا على منصات التواصل',
    nameEn: 'Follow Us Social Tag',
    category: 'social',
    shape: 'square',
    description: 'ملصق لحسابات انستغرام وتيك توك وسناب شات مع رمز المنشن',
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'roundedRect', x: 16, y: 16, width: 428, height: 428, rx: 28 },
    defaultColors: {
      primary: '#9F4055',
      secondary: '#2D2430',
      background: '#FFF8F5',
    },
    fields: [
      {
        id: 'callToAction',
        label: 'الدعوة للمتابعة',
        type: 'text',
        defaultValue: 'يسعدنا انضمامك إلينا!',
      },
      {
        id: 'handle',
        label: 'اسم الحساب (@Handle)',
        type: 'text',
        defaultValue: '@GridoStudio.iq',
      },
      {
        id: 'platforms',
        label: 'المنصات المتواجدين عليها',
        type: 'text',
        defaultValue: 'TikTok • Instagram • X',
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
      const cta = escapeXml(fields.callToAction || 'يسعدنا انضمامك إلينا!');
      const handle = escapeXml(fields.handle || '@GridoStudio.iq');
      const platforms = escapeXml(fields.platforms || 'TikTok • Instagram • X');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <defs>
    <radialGradient id="sf-glow" cx="50%" cy="28%" r="55%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sf-badge" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <rect x="16" y="16" width="428" height="428" rx="28" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <rect x="16" y="16" width="428" height="428" rx="28" fill="url(#sf-glow)"/>
  <rect x="28" y="28" width="404" height="404" rx="20" fill="none" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1.5"/>
  <circle cx="230" cy="112" r="56" fill="none" stroke="${primaryColor}" stroke-opacity="0.28" stroke-width="2" stroke-dasharray="6 5" data-color-role="primary"/>
  <circle cx="230" cy="112" r="44" fill="url(#sf-badge)" data-color-role="primary"/>
  <text data-max-width="70" x="230" y="130" font-family="${fontFamily}, sans-serif" font-size="${Math.round(52 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">@</text>
  <text data-field-id="callToAction" data-max-width="356" x="230" y="216" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${cta}
  </text>
  <rect x="44" y="242" width="372" height="68" rx="34" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="332" x="230" y="286" font-family="${fontFamily}, monospace" font-size="${Math.round(29 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <rect x="74" y="346" width="312" height="48" rx="24" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="platforms" data-max-width="278" x="230" y="376" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${platforms}
  </text>
</svg>`;
    },
  },
  {
    id: 'social_wifi_access',
    name: 'بطاقة الاتصال بالواي فاي',
    nameEn: 'Free Guest WiFi Card',
    category: 'social',
    shape: 'rect',
    description: 'ملصق لطاولات الكافيهات والمكاتب لاسم شبكة الإنترنت وكلمة المرور',
    defaultWidth: 500,
    defaultHeight: 340,
    aspectRatio: 500 / 340,
    defaultMm: { width: 70, height: 48 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 316, rx: 16 },
    defaultColors: {
      primary: '#1E5F74',
      secondary: '#1D2D3A',
      background: '#F6FAFB',
    },
    fields: [
      { id: 'wifiTitle', label: 'عنوان الشبكة', type: 'text', defaultValue: 'إنترنت مجاني للضيوف' },
      { id: 'ssid', label: 'اسم الشبكة (SSID)', type: 'text', defaultValue: 'Dijlah_Guest_5G' },
      { id: 'password', label: 'كلمة السر (Password)', type: 'text', defaultValue: 'Welcome#2026' },
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
      const title = escapeXml(fields.wifiTitle || 'إنترنت مجاني للضيوف');
      const ssid = escapeXml(fields.ssid || 'Dijlah_Guest_5G');
      const pass = escapeXml(fields.password || 'Welcome#2026');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340">
  <defs>
    <linearGradient id="sw-top" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="sw-clip">
      <rect x="12" y="12" width="476" height="316" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="476" height="316" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#sw-clip)">
    <rect x="12" y="12" width="476" height="92" fill="url(#sw-top)" data-color-role="primary"/>
  </g>
  <g fill="none" stroke="${backgroundColor}" stroke-width="3.8" stroke-linecap="round">
    <path d="M 48,54 Q 76,28 104,54 M 58,64 Q 76,46 94,64 M 68,74 Q 76,66 84,74"/>
    <circle cx="76" cy="84" r="3.5" fill="${backgroundColor}" stroke="none"/>
  </g>
  <text data-field-id="wifiTitle" data-max-width="314" x="304" y="68" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="38" y="122" width="424" height="66" rx="10" fill="${primaryColor}" fill-opacity="0.08" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="1.5" data-color-role="primary"/>
  <text data-max-width="108" x="444" y="155" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    الشبكة
  </text>
  <text data-field-id="ssid" data-max-width="264" x="196" y="155" font-family="${fontFamily}, monospace" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${ssid}
  </text>
  <rect x="38" y="200" width="424" height="66" rx="10" fill="${secondaryColor}" fill-opacity="0.06" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1.5" data-color-role="secondary"/>
  <text data-max-width="108" x="444" y="233" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    الرمز السري
  </text>
  <text data-field-id="password" data-max-width="264" x="196" y="233" font-family="${fontFamily}, monospace" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${pass}
  </text>
  <text data-max-width="416" x="250" y="303" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="2">
    FREE HIGH-SPEED GUEST WIFI
  </text>
</svg>`;
    },
  },
  {
    id: 'social_review_five_stars',
    name: 'تقييمك يهمنا — 5 نجوم',
    nameEn: '5-Star Review Request',
    category: 'social',
    shape: 'rect',
    description: 'ملصق طلب التقييم بخمس نجوم لطلبات التوصيل وصناديق العملاء',
    defaultWidth: 500,
    defaultHeight: 340,
    aspectRatio: 500 / 340,
    defaultMm: { width: 70, height: 48 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 472, height: 312, rx: 18 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#D97706',
      background: '#FFFBEB',
    },
    fields: [
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'رأيك يصنع فرقاً!' },
      {
        id: 'subline',
        label: 'رسالة الطلب',
        type: 'text',
        defaultValue: 'شاركنا تقييمك بـ 5 نجوم إذا أعجبك الطلب',
      },
      { id: 'storeTag', label: 'حساب المتجر', type: 'text', defaultValue: '@GridoStore.iq' },
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
      const headline = escapeXml(fields.headline || 'رأيك يصنع فرقاً!');
      const subline = escapeXml(fields.subline || 'شاركنا تقييمك بـ 5 نجوم إذا أعجبك الطلب');
      const storeTag = escapeXml(fields.storeTag || '@GridoStore.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340">
  <defs>
    <radialGradient id="sr-glow" cx="50%" cy="24%" r="58%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="472" height="312" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="472" height="312" rx="18" fill="url(#sr-glow)"/>
  ${cornerBracketsMarkup(26, 26, 448, 288, 16, secondaryColor, 2, 'secondary')}
  ${starRowMarkup(250, 72, 5, 48, 20, secondaryColor, 'secondary')}
  <text data-field-id="headline" data-max-width="408" x="250" y="148" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${headline}
  </text>
  <text data-field-id="subline" data-max-width="410" x="250" y="198" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${subline}
  </text>
  <rect x="116" y="236" width="268" height="52" rx="26" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="storeTag" data-max-width="234" x="250" y="269" font-family="${fontFamily}, monospace" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${storeTag}
  </text>
</svg>`;
    },
  },
  {
    id: 'social_whatsapp_order',
    name: 'اطلب عبر واتساب مباشرة',
    nameEn: 'WhatsApp Direct Order Card',
    category: 'social',
    shape: 'rect',
    description: 'ملصق للطلب السريع وخدمة العملاء عبر واتساب برقم عراقي',
    defaultWidth: 500,
    defaultHeight: 320,
    aspectRatio: 500 / 320,
    defaultMm: { width: 75, height: 48 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 296, rx: 16 },
    defaultColors: {
      primary: '#115E59',
      secondary: '#0F172A',
      background: '#F0FDF9',
    },
    fields: [
      { id: 'title', label: 'عنوان الخدمة', type: 'text', defaultValue: 'للطلب السريع عبر واتساب' },
      { id: 'phone', label: 'رقم الواتساب', type: 'text', defaultValue: '+964 770 123 4567' },
      {
        id: 'hours',
        label: 'أوقات الخدمة',
        type: 'text',
        defaultValue: 'توصيل يومي لجميع المحافظات',
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
      const title = escapeXml(fields.title || 'للطلب السريع عبر واتساب');
      const phone = escapeXml(fields.phone || '+964 770 123 4567');
      const hours = escapeXml(fields.hours || 'توصيل يومي لجميع المحافظات');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <defs>
    <linearGradient id="wa-bar" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="wa-clip">
      <rect x="12" y="12" width="476" height="296" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="476" height="296" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#wa-clip)">
    <rect x="12" y="12" width="476" height="96" fill="url(#wa-bar)" data-color-role="primary"/>
  </g>
  <!-- Crisp geometric chat & phone emblem -->
  <path d="M 74,30 A 30,30 0 1,1 48,75 L 41,89 L 56,83 A 30,30 0 0,1 74,30 Z" fill="none" stroke="${backgroundColor}" stroke-width="3" stroke-linejoin="round"/>
  <path d="M 63,47 C 61,47 59,49 59,52 C 59,62 67,70 77,70 C 80,70 82,68 82,66 L 78,62 C 77,61 75,62 74,63 C 70,62 67,59 66,55 C 67,54 68,52 67,51 Z" fill="${backgroundColor}"/>
  <text data-field-id="title" data-max-width="318" x="296" y="70" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="46" y="136" width="408" height="78" rx="39" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <text data-field-id="phone" data-max-width="368" x="250" y="186" font-family="${fontFamily}, monospace" font-size="${Math.round(31 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" data-color-role="secondary">
    ${phone}
  </text>
  <path d="M 80,242 H 420" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1.5"/>
  <text data-field-id="hours" data-max-width="400" x="250" y="278" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${hours}
  </text>
</svg>`;
    },
  },
  {
    id: 'social_qr_bio_card',
    name: 'بطاقة QR المنيو والمتجر',
    nameEn: 'Menu & Store Bio QR Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة أنيقة لمسح رمز الاستجابة السريعة لقائمة الطعام أو رابط المتجر',
    defaultWidth: 460,
    defaultHeight: 500,
    aspectRatio: 460 / 500,
    defaultMm: { width: 65, height: 70 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 432, height: 472, rx: 22 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#B45309',
      background: '#FFFDF9',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'الرابط المشفر (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'cardTitle', label: 'عنوان البطاقة', type: 'text', defaultValue: 'امسح الكود للمنيو' },
      { id: 'brandName', label: 'اسم المتجر / المطعم', type: 'text', defaultValue: 'GRIDO STUDIO' },
      {
        id: 'hint',
        label: 'تعليمات المسح',
        type: 'text',
        defaultValue: 'وجّه كاميرا الهاتف للمسح الفوري',
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
      const cardTitle = escapeXml(fields.cardTitle || 'امسح الكود للمنيو');
      const brandName = escapeXml(fields.brandName || 'GRIDO STUDIO');
      const hint = escapeXml(fields.hint || 'وجّه كاميرا الهاتف للمسح الفوري');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 210, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 500" width="460" height="500">
  <defs>
    <linearGradient id="sq-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="sq-clip">
      <rect x="14" y="14" width="432" height="472" rx="22"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="432" height="472" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#sq-clip)">
    <rect x="14" y="14" width="432" height="96" fill="url(#sq-hdr)" data-color-role="primary"/>
  </g>
  <text data-field-id="cardTitle" data-max-width="370" x="230" y="72" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${cardTitle}
  </text>
  <!-- White quiet zone preserves reliable mobile camera scanning -->
  <rect x="97" y="128" width="266" height="266" rx="14" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(85, 116, 290, 290, 20, secondaryColor, 3, 'secondary')}
  <g transform="translate(125, 156)">
    ${qrSvg}
  </g>
  <text data-field-id="brandName" data-max-width="368" x="230" y="432" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" letter-spacing="1.5" data-color-role="primary">
    ${brandName}
  </text>
  <text data-field-id="hint" data-max-width="368" x="230" y="464" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${hint}
  </text>
</svg>`;
    },
  },
];
