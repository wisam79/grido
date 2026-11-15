import { cornerBracketsMarkup, iconMarkup, starRowMarkup } from './svg-elements';
import { generateQrCodeInnerSvg } from '../lib/barcode-svg';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const SOCIAL_CARDS: StickerTemplate[] = [
  {
    id: 'card_soc_instagram_creator',
    name: 'بطاقة إنستغرام للمبدعين والمتاجر',
    nameEn: 'Instagram Creator Link Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة عصرية لحساب إنستغرام مع رمز QR للمسح السريع للملف الشخصي',
    defaultWidth: 450,
    defaultHeight: 600,
    aspectRatio: 450 / 600,
    defaultMm: { width: 75, height: 100 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 422, height: 572, rx: 24 },
    defaultColors: {
      primary: '#831843',
      secondary: '#EA580C',
      background: '#FFF7ED',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط الحساب (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      {
        id: 'brandName',
        label: 'اسم الحساب أو المتجر',
        type: 'text',
        defaultValue: 'ستوديو دجلة للإبداع',
      },
      { id: 'handle', label: 'معرّف إنستغرام', type: 'text', defaultValue: '@DijlahStudio.iq' },
      {
        id: 'tagline',
        label: 'وصف قصير',
        type: 'text',
        defaultValue: 'تصوير وتصميم هوية بصرية — بغداد',
      },
      {
        id: 'ctaText',
        label: 'دعوة المتابعة',
        type: 'text',
        defaultValue: 'امسح الكود وتابعنا الآن',
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
      const brandName = escapeXml(fields.brandName || 'ستوديو دجلة للإبداع');
      const handle = escapeXml(fields.handle || '@DijlahStudio.iq');
      const tagline = escapeXml(fields.tagline || 'تصوير وتصميم هوية بصرية — بغداد');
      const ctaText = escapeXml(fields.ctaText || 'امسح الكود وتابعنا الآن');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 196, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 600" width="450" height="600">
  <defs>
    <linearGradient id="cs01-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs01-glow" cx="50%" cy="54%" r="48%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs01-clip">
      <rect x="14" y="14" width="422" height="572" rx="24"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="422" height="572" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs01-clip)">
    <rect x="14" y="186" width="422" height="400" fill="url(#cs01-glow)"/>
    <rect x="14" y="14" width="422" height="172" fill="url(#cs01-hdr)" data-color-role="primary"/>
    <path d="M 14,14 H 436 V 82 Q 225,118 14,70 Z" fill="${backgroundColor}" opacity="0.07"/>
    <circle cx="385" cy="48" r="64" fill="${backgroundColor}" opacity="0.1"/>
    <circle cx="62" cy="148" r="46" fill="${backgroundColor}" opacity="0.08"/>
  </g>
  <rect x="22" y="22" width="406" height="556" rx="18" fill="none" stroke="${secondaryColor}" stroke-opacity="0.24" stroke-width="1.2"/>
  <rect x="196" y="30" width="58" height="58" rx="16" fill="${backgroundColor}" fill-opacity="0.12" stroke="${backgroundColor}" stroke-width="3.2"/>
  <circle cx="225" cy="59" r="13.5" fill="none" stroke="${backgroundColor}" stroke-width="3.2"/>
  <circle cx="241" cy="43" r="3.2" fill="${backgroundColor}"/>
  <text data-field-id="brandName" data-max-width="360" x="225" y="122" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${brandName}
  </text>
  <text data-field-id="tagline" data-max-width="364" x="225" y="160" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${backgroundColor}" opacity="0.92" text-anchor="middle">
    ${tagline}
  </text>
  <rect x="97" y="208" width="256" height="256" rx="18" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(86, 197, 278, 278, 18, primaryColor, 2.5, 'primary')}
  <g transform="translate(127, 238)">
    ${qrSvg}
  </g>
  <rect x="65" y="488" width="320" height="46" rx="23" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="284" x="225" y="511" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <text data-field-id="ctaText" data-max-width="350" x="225" y="558" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${ctaText}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_tiktok_follow',
    name: 'بطاقة متابعة تيك توك',
    nameEn: 'TikTok Follow Card',
    category: 'social',
    shape: 'square',
    description: 'بطاقة مربعة أنيقة لزيادة متابعي حساب تيك توك مع رمز مسح فوري',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 80, height: 80 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 452, height: 452, rx: 28 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#E11D48',
      background: '#F8FAFC',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط تيك توك (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'title', label: 'العنوان الترحيبي', type: 'text', defaultValue: 'تابعنا على تيك توك' },
      { id: 'handle', label: 'اسم الحساب', type: 'text', defaultValue: '@BaghdadTrends.iq' },
      {
        id: 'subline',
        label: 'سطر تشجيعي',
        type: 'text',
        defaultValue: 'عروض يومية وكواليس حصرية',
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
      const title = escapeXml(fields.title || 'تابعنا على تيك توك');
      const handle = escapeXml(fields.handle || '@BaghdadTrends.iq');
      const subline = escapeXml(fields.subline || 'عروض يومية وكواليس حصرية');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 176, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="cs02-bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs02-glow" cx="50%" cy="52%" r="48%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs02-clip">
      <rect x="14" y="14" width="452" height="452" rx="28"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="452" height="452" rx="28" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cs02-clip)">
    <rect x="14" y="108" width="452" height="358" fill="url(#cs02-glow)"/>
    <rect x="14" y="14" width="452" height="94" fill="url(#cs02-bar)" data-color-role="primary"/>
    <path d="M 14,14 H 466 V 54 Q 240,78 14,54 Z" fill="${backgroundColor}" opacity="0.06"/>
    <circle cx="68" cy="61" r="24" fill="${backgroundColor}" fill-opacity="0.16" stroke="${backgroundColor}" stroke-opacity="0.32" stroke-width="1.5"/>
  </g>
  <rect x="22" y="22" width="436" height="436" rx="22" fill="none" stroke="${secondaryColor}" stroke-opacity="0.2" stroke-width="1.2"/>
  <path d="M 73,43 V 70 A 9,9 0 1,1 64,61" fill="none" stroke="${backgroundColor}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M 73,43 Q 80,52 87,52" fill="none" stroke="${backgroundColor}" stroke-width="3.5" stroke-linecap="round"/>
  <text data-field-id="title" data-max-width="310" x="276" y="61" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="128" y="128" width="224" height="224" rx="16" fill="#FFFFFF" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="1.8"/>
  ${cornerBracketsMarkup(118, 118, 244, 244, 16, secondaryColor, 2.5, 'secondary')}
  <g transform="translate(152, 152)">
    ${qrSvg}
  </g>
  <rect x="76" y="374" width="328" height="46" rx="23" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="292" x="240" y="397" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <text data-field-id="subline" data-max-width="380" x="240" y="442" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${subline}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_digital_menu_qr',
    name: 'بطاقة المنيو الرقمي للطاولات',
    nameEn: 'Digital Menu QR Tabletop Card',
    category: 'barcodes',
    shape: 'rect',
    description: 'بطاقة طاولة للمطاعم والمقاهي لمسح قائمة الطعام الرقمية فوراً',
    defaultWidth: 450,
    defaultHeight: 600,
    aspectRatio: 450 / 600,
    defaultMm: { width: 75, height: 100 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 422, height: 572, rx: 22 },
    defaultColors: {
      primary: '#292524',
      secondary: '#B45309',
      background: '#FFFBEB',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط المنيو الرقمي (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      {
        id: 'menuTitle',
        label: 'عنوان البطاقة',
        type: 'text',
        defaultValue: 'قائمة الطعام الرقمية',
      },
      {
        id: 'venueName',
        label: 'اسم المطعم / الكافيه',
        type: 'text',
        defaultValue: 'مقهى ومطعم دجلة',
      },
      {
        id: 'scanHint',
        label: 'توجيه المسح',
        type: 'text',
        defaultValue: 'وجّه كاميرا الهاتف لتصفح المنيو',
      },
      {
        id: 'footerNote',
        label: 'ملاحظة أسفل البطاقة',
        type: 'text',
        defaultValue: 'المنصور — بغداد • خدمة يومية',
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
      const menuTitle = escapeXml(fields.menuTitle || 'قائمة الطعام الرقمية');
      const venueName = escapeXml(fields.venueName || 'مقهى ومطعم دجلة');
      const scanHint = escapeXml(fields.scanHint || 'وجّه كاميرا الهاتف لتصفح المنيو');
      const footerNote = escapeXml(fields.footerNote || 'المنصور — بغداد • خدمة يومية');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 200, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 600" width="450" height="600">
  <defs>
    <linearGradient id="cs03-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs03-glow" cx="50%" cy="60%" r="48%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs03-clip">
      <rect x="14" y="14" width="422" height="572" rx="22"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="422" height="572" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs03-clip)">
    <rect x="14" y="150" width="422" height="436" fill="url(#cs03-glow)"/>
    <path d="M 14,14 H 436 V 146 Q 225,184 14,146 Z" fill="url(#cs03-hdr)" data-color-role="primary"/>
    <path d="M 14,14 H 436 V 76 Q 225,108 14,76 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="22" y="22" width="406" height="556" rx="16" fill="none" stroke="${secondaryColor}" stroke-opacity="0.24" stroke-width="1.2"/>
  <circle cx="225" cy="54" r="24" fill="${backgroundColor}" fill-opacity="0.16" stroke="${backgroundColor}" stroke-width="2"/>
  <path d="M 216,42 V 66 M 212,42 V 52 M 220,42 V 52 M 234,42 V 66 M 234,42 Q 241,48 234,56" fill="none" stroke="${backgroundColor}" stroke-width="2.2" stroke-linecap="round"/>
  <text data-field-id="venueName" data-max-width="360" x="225" y="112" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${venueName}
  </text>
  <text data-field-id="menuTitle" data-max-width="370" x="225" y="200" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${menuTitle}
  </text>
  <rect x="95" y="232" width="260" height="260" rx="16" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(84, 221, 282, 282, 18, secondaryColor, 2.5, 'secondary')}
  <g transform="translate(125, 262)">
    ${qrSvg}
  </g>
  <text data-field-id="scanHint" data-max-width="370" x="225" y="518" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${scanHint}
  </text>
  <rect x="75" y="538" width="300" height="34" rx="17" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1"/>
  <text data-field-id="footerNote" data-max-width="272" x="225" y="555" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${footerNote}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_whatsapp_support_qr',
    name: 'بطاقة دعم وطلبات واتساب مع QR',
    nameEn: 'WhatsApp Support QR Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة أفقية لخدمة العملاء والطلبات عبر واتساب مع رمز QR ورقم عراقي',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 18 },
    defaultColors: {
      primary: '#065F46',
      secondary: '#0F172A',
      background: '#F0FDF4',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط واتساب المباشر (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'title', label: 'عنوان البطاقة', type: 'text', defaultValue: 'خدمة العملاء والطلبات' },
      { id: 'phone', label: 'رقم الواتساب', type: 'text', defaultValue: '+964 771 450 8899' },
      {
        id: 'hours',
        label: 'ساعات الرد',
        type: 'text',
        defaultValue: 'رد فوري يومياً 9 صباحاً — 11 مساءً',
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
      const title = escapeXml(fields.title || 'خدمة العملاء والطلبات');
      const phone = escapeXml(fields.phone || '+964 771 450 8899');
      const hours = escapeXml(fields.hours || 'رد فوري يومياً 9 صباحاً — 11 مساءً');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 150, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cs04-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cs04-clip">
      <rect x="12" y="12" width="516" height="306" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs04-clip)">
    <rect x="12" y="12" width="212" height="306" fill="url(#cs04-side)" data-color-role="primary"/>
    <circle cx="48" cy="44" r="52" fill="${backgroundColor}" opacity="0.06"/>
    <circle cx="196" cy="296" r="46" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="20" y="20" width="500" height="290" rx="13" fill="none" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1"/>
  <rect x="33" y="80" width="170" height="170" rx="14" fill="#FFFFFF" stroke="${backgroundColor}" stroke-width="2"/>
  <g transform="translate(43, 90)">
    ${qrSvg}
  </g>
  <path d="M 118,30 A 18,18 0 1,1 102,57 L 97,65 L 106,61 A 18,18 0 0,1 118,30 Z" fill="none" stroke="${backgroundColor}" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M 111,41 C 110,41 109,42 109,44 C 109,50 114,55 120,55 C 122,55 123,54 123,52 L 120,50 C 119,49 118,50 118,51 C 115,50 114,49 113,46 C 114,46 114,45 114,44 Z" fill="${backgroundColor}"/>
  <text data-max-width="180" x="118" y="284" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    امسح للمحادثة الفورية
  </text>
  <text data-field-id="title" data-max-width="268" x="376" y="78" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <rect x="244" y="122" width="264" height="66" rx="33" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <text data-field-id="phone" data-max-width="234" x="376" y="155" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(22 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  <path d="M 262,216 H 490" stroke="${primaryColor}" stroke-opacity="0.24" stroke-width="1.5"/>
  <text data-field-id="hours" data-max-width="264" x="376" y="258" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${hours}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_google_review_5star',
    name: 'بطاقة تقييم خرائط غوغل 5 نجوم',
    nameEn: 'Google Maps Review 5-Star Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة طاولة واستقبال لطلب تقييم 5 نجوم على خرائط غوغل عبر QR',
    defaultWidth: 500,
    defaultHeight: 350,
    aspectRatio: 500 / 350,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 326, rx: 20 },
    defaultColors: {
      primary: '#1E3A8A',
      secondary: '#D97706',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط التقييم على غوغل (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      {
        id: 'headline',
        label: 'رسالة التقييم',
        type: 'text',
        defaultValue: 'قيّم تجربتك بـ 5 نجوم',
      },
      {
        id: 'businessName',
        label: 'اسم المكان',
        type: 'text',
        defaultValue: 'عيادة النخيل التخصصية — بغداد',
      },
      {
        id: 'subline',
        label: 'دعوة قصيرة',
        type: 'text',
        defaultValue: 'امسح الكود وشاركنا رأيك على الخرائط',
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
      const headline = escapeXml(fields.headline || 'قيّم تجربتك بـ 5 نجوم');
      const businessName = escapeXml(fields.businessName || 'عيادة النخيل التخصصية — بغداد');
      const subline = escapeXml(fields.subline || 'امسح الكود وشاركنا رأيك على الخرائط');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 158, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350">
  <defs>
    <linearGradient id="cs05-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs05-glow" cx="72%" cy="55%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs05-clip">
      <rect x="12" y="12" width="476" height="326" rx="20"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="476" height="326" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs05-clip)">
    <rect x="12" y="94" width="476" height="244" fill="url(#cs05-glow)"/>
    <rect x="12" y="12" width="476" height="82" fill="url(#cs05-hdr)" data-color-role="primary"/>
    <path d="M 12,12 H 488 V 48 Q 250,68 12,48 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="20" y="20" width="460" height="310" rx="14" fill="none" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1.2"/>
  ${iconMarkup('pin', 34, 35, 36, backgroundColor)}
  <text data-field-id="businessName" data-max-width="368" x="276" y="53" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${businessName}
  </text>
  <rect x="34" y="118" width="184" height="184" rx="14" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(26, 110, 200, 200, 14, primaryColor, 2, 'primary')}
  <g transform="translate(47, 131)">
    ${qrSvg}
  </g>
  ${starRowMarkup(353, 144, 5, 38, 16, secondaryColor, 'secondary')}
  <text data-field-id="headline" data-max-width="240" x="353" y="204" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${headline}
  </text>
  <rect x="234" y="242" width="238" height="52" rx="26" fill="${primaryColor}" fill-opacity="0.08" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="1.5"/>
  <text data-field-id="subline" data-max-width="212" x="353" y="268" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${subline}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_wifi_luxury_navy_gold',
    name: 'بطاقة واي فاي فاخرة كحلي وذهبي',
    nameEn: 'WiFi Luxury Gold/Navy Tabletop Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة طاولة فاخرة للاتصال بالواي فاي مع رمز QR واسم الشبكة وكلمة المرور',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 18 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#B45309',
      background: '#FFFBEB',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'بيانات QR الواي فاي (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      {
        id: 'wifiTitle',
        label: 'عنوان الشبكة',
        type: 'text',
        defaultValue: 'واي فاي مجاني للضيوف',
      },
      { id: 'ssid', label: 'اسم الشبكة (SSID)', type: 'text', defaultValue: 'Baghdad_Lounge_5G' },
      { id: 'password', label: 'كلمة المرور', type: 'text', defaultValue: 'Dijlah@2026' },
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
      const wifiTitle = escapeXml(fields.wifiTitle || 'واي فاي مجاني للضيوف');
      const ssid = escapeXml(fields.ssid || 'Baghdad_Lounge_5G');
      const password = escapeXml(fields.password || 'Dijlah@2026');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 152, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cs06-gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs06-glow" cx="76%" cy="56%" r="54%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs06-clip">
      <rect x="12" y="12" width="516" height="306" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="18" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cs06-clip)">
    <rect x="12" y="94" width="516" height="224" fill="url(#cs06-glow)"/>
    <rect x="12" y="12" width="516" height="82" fill="url(#cs06-gold)" data-color-role="primary"/>
    <path d="M 12,12 H 528 V 48 Q 270,68 12,48 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="18" y="18" width="504" height="294" rx="14" fill="none" stroke="${secondaryColor}" stroke-opacity="0.3" stroke-width="1"/>
  ${cornerBracketsMarkup(24, 104, 492, 202, 14, secondaryColor, 2, 'secondary')}
  ${iconMarkup('wifi', 36, 33, 40, backgroundColor)}
  <text data-field-id="wifiTitle" data-max-width="390" x="298" y="53" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${wifiTitle}
  </text>
  <rect x="36" y="120" width="174" height="174" rx="12" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <g transform="translate(47, 131)">
    ${qrSvg}
  </g>
  <rect x="228" y="124" width="276" height="68" rx="12" fill="${primaryColor}" fill-opacity="0.06" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1.5"/>
  <line x1="408" y1="138" x2="408" y2="178" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1"/>
  <text data-max-width="76" x="490" y="158" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    الشبكة
  </text>
  <text data-field-id="ssid" data-max-width="160" x="320" y="158" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" data-color-role="primary">
    ${ssid}
  </text>
  <rect x="228" y="206" width="276" height="68" rx="12" fill="${secondaryColor}" fill-opacity="0.09" stroke="${secondaryColor}" stroke-opacity="0.3" stroke-width="1.5"/>
  <line x1="408" y1="220" x2="408" y2="260" stroke="${secondaryColor}" stroke-opacity="0.25" stroke-width="1"/>
  <text data-max-width="76" x="490" y="240" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" direction="rtl" unicode-bidi="embed">
    كلمة السر
  </text>
  <text data-field-id="password" data-max-width="160" x="320" y="240" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${password}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_linktree_multiplatform',
    name: 'بطاقة الروابط الشاملة — جميع المنصات',
    nameEn: 'Linktree Multi-Platform Card',
    category: 'barcodes',
    shape: 'rect',
    description: 'بطاقة تجمع كل روابط حساباتك ومتجرك في رمز QR واحد بتصميم عصري متكامل',
    defaultWidth: 450,
    defaultHeight: 600,
    aspectRatio: 450 / 600,
    defaultMm: { width: 75, height: 100 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 422, height: 572, rx: 24 },
    defaultColors: {
      primary: '#312E81',
      secondary: '#0D9488',
      background: '#F8FAFC',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط شجرة الروابط (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'brandName', label: 'اسم العلامة', type: 'text', defaultValue: 'متجر الرافدين الرقمي' },
      {
        id: 'bioLine',
        label: 'وصف تعريفي',
        type: 'text',
        defaultValue: 'كل روابطنا ومتجرنا في مكان واحد',
      },
      {
        id: 'platform1',
        label: 'الرابط الأول',
        type: 'text',
        defaultValue: 'المتجر الإلكتروني • alrafidain.iq',
      },
      {
        id: 'platform2',
        label: 'الرابط الثاني',
        type: 'text',
        defaultValue: 'إنستغرام وتيك توك • @Rafidain.iq',
      },
      {
        id: 'platform3',
        label: 'الرابط الثالث',
        type: 'text',
        defaultValue: 'واتساب الطلبات • +964 770 220 1100',
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
      const brandName = escapeXml(fields.brandName || 'متجر الرافدين الرقمي');
      const bioLine = escapeXml(fields.bioLine || 'كل روابطنا ومتجرنا في مكان واحد');
      const platform1 = escapeXml(fields.platform1 || 'المتجر الإلكتروني • alrafidain.iq');
      const platform2 = escapeXml(fields.platform2 || 'إنستغرام وتيك توك • @Rafidain.iq');
      const platform3 = escapeXml(fields.platform3 || 'واتساب الطلبات • +964 770 220 1100');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 170, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 600" width="450" height="600">
  <defs>
    <linearGradient id="cs07-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs07-glow" cx="50%" cy="48%" r="50%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs07-clip">
      <rect x="14" y="14" width="422" height="572" rx="24"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="422" height="572" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs07-clip)">
    <rect x="14" y="150" width="422" height="436" fill="url(#cs07-glow)"/>
    <rect x="14" y="14" width="422" height="136" fill="url(#cs07-hdr)" data-color-role="primary"/>
    <circle cx="388" cy="40" r="52" fill="${backgroundColor}" opacity="0.08"/>
    <circle cx="56" cy="126" r="38" fill="${backgroundColor}" opacity="0.07"/>
  </g>
  <rect x="22" y="22" width="406" height="556" rx="18" fill="none" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1.2"/>
  <text data-field-id="brandName" data-max-width="370" x="225" y="64" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${brandName}
  </text>
  <text data-field-id="bioLine" data-max-width="364" x="225" y="110" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${backgroundColor}" opacity="0.92" text-anchor="middle">
    ${bioLine}
  </text>
  <rect x="115" y="168" width="220" height="220" rx="16" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(104, 157, 242, 242, 16, primaryColor, 2, 'primary')}
  <g transform="translate(140, 193)">
    ${qrSvg}
  </g>
  <rect x="42" y="408" width="366" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="platform1" data-max-width="330" x="225" y="430" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${platform1}
  </text>
  <rect x="42" y="464" width="366" height="44" rx="22" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="platform2" data-max-width="330" x="225" y="486" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${platform2}
  </text>
  <rect x="42" y="520" width="366" height="44" rx="22" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="1.5"/>
  <text data-field-id="platform3" data-max-width="330" x="225" y="542" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${platform3}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_delivery_apps_order',
    name: 'بطاقة اطلبنا عبر تطبيقات التوصيل',
    nameEn: 'Delivery Apps Order Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة لتطبيقات التوصيل العراقية مع كود خصم ورمز QR للطلب المباشر',
    defaultWidth: 500,
    defaultHeight: 350,
    aspectRatio: 500 / 350,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 326, rx: 18 },
    defaultColors: {
      primary: '#9F1239',
      secondary: '#1E293B',
      background: '#FFF1F2',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط الطلب السريع (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'اطلب وجبتك أينما كنت' },
      {
        id: 'appsList',
        label: 'تطبيقات التوصيل',
        type: 'text',
        defaultValue: 'طلبات • توترز • ليوم • وصلني',
      },
      {
        id: 'promoCode',
        label: 'كود الخصم',
        type: 'text',
        defaultValue: 'خصم 15% بالكود: BAGHDAD15',
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
      const headline = escapeXml(fields.headline || 'اطلب وجبتك أينما كنت');
      const appsList = escapeXml(fields.appsList || 'طلبات • توترز • ليوم • وصلني');
      const promoCode = escapeXml(fields.promoCode || 'خصم 15% بالكود: BAGHDAD15');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 150, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350">
  <defs>
    <linearGradient id="cs08-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cs08-clip">
      <rect x="12" y="12" width="476" height="326" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="476" height="326" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs08-clip)">
    <rect x="12" y="12" width="476" height="86" fill="url(#cs08-hdr)" data-color-role="primary"/>
    <path d="M 12,12 H 488 V 50 Q 250,70 12,50 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="20" y="20" width="460" height="310" rx="13" fill="none" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1"/>
  <rect x="34" y="38" width="38" height="38" rx="6" fill="none" stroke="${backgroundColor}" stroke-width="2.5"/>
  <path d="M 43,38 V 32 A 10,10 0 0,1 63,32 V 38" fill="none" stroke="${backgroundColor}" stroke-width="2.5"/>
  <text data-field-id="headline" data-max-width="362" x="276" y="55" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${headline}
  </text>
  <rect x="34" y="120" width="180" height="180" rx="14" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2"/>
  ${cornerBracketsMarkup(26, 112, 196, 196, 14, primaryColor, 2, 'primary')}
  <g transform="translate(49, 135)">
    ${qrSvg}
  </g>
  <text data-max-width="230" x="352" y="136" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    متوفرون الآن عبر
  </text>
  <rect x="232" y="158" width="240" height="58" rx="12" fill="${primaryColor}" fill-opacity="0.09" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1.5"/>
  <text data-field-id="appsList" data-max-width="216" x="352" y="187" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${appsList}
  </text>
  <rect x="232" y="236" width="240" height="52" rx="26" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="promoCode" data-max-width="214" x="352" y="262" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${promoCode}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_podcast_channel_promo',
    name: 'بطاقة ترويج بودكاست وقناة صوتية',
    nameEn: 'Podcast & Channel Promo Card',
    category: 'social',
    shape: 'square',
    description: 'بطاقة مربعة لترويج البودكاست والقنوات الصوتية والمرئية مع QR للاستماع',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 80, height: 80 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 452, height: 452, rx: 26 },
    defaultColors: {
      primary: '#4C1D95',
      secondary: '#D97706',
      background: '#FAF5FF',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط الحلقات (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      {
        id: 'showTitle',
        label: 'اسم البرنامج / البودكاست',
        type: 'text',
        defaultValue: 'بودكاست سوالف بغداد',
      },
      {
        id: 'hostName',
        label: 'المقدّم / القناة',
        type: 'text',
        defaultValue: 'تقديم: حيدر العامري',
      },
      {
        id: 'schedule',
        label: 'موعد الحلقات',
        type: 'text',
        defaultValue: 'حلقة جديدة كل سبت — 8 مساءً',
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
      const showTitle = escapeXml(fields.showTitle || 'بودكاست سوالف بغداد');
      const hostName = escapeXml(fields.hostName || 'تقديم: حيدر العامري');
      const schedule = escapeXml(fields.schedule || 'حلقة جديدة كل سبت — 8 مساءً');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 176, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="cs09-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs09-glow" cx="50%" cy="54%" r="48%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs09-clip">
      <rect x="14" y="14" width="452" height="452" rx="26"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="452" height="452" rx="26" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs09-clip)">
    <rect x="14" y="136" width="452" height="330" fill="url(#cs09-glow)"/>
    <rect x="14" y="14" width="452" height="122" fill="url(#cs09-hdr)" data-color-role="primary"/>
    <path d="M 14,14 H 466 V 66 Q 240,92 14,66 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="22" y="22" width="436" height="436" rx="20" fill="none" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1.2"/>
  <rect x="50" y="45" width="18" height="30" rx="9" fill="none" stroke="${backgroundColor}" stroke-width="2.6"/>
  <path d="M 42,64 A 17,17 0 0,0 76,64 M 59,81 V 90 M 49,90 H 69" fill="none" stroke="${backgroundColor}" stroke-width="2.5" stroke-linecap="round"/>
  <g stroke="${backgroundColor}" stroke-width="2.5" stroke-linecap="round">
    <path d="M 90,56 V 76 M 98,48 V 84 M 106,60 V 72"/>
  </g>
  <text data-field-id="showTitle" data-max-width="296" x="284" y="56" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${showTitle}
  </text>
  <text data-field-id="hostName" data-max-width="296" x="284" y="98" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" opacity="0.92" text-anchor="middle">
    ${hostName}
  </text>
  <rect x="128" y="158" width="224" height="224" rx="16" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(118, 148, 244, 244, 16, primaryColor, 2.5, 'primary')}
  <g transform="translate(152, 182)">
    ${qrSvg}
  </g>
  <rect x="56" y="404" width="368" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="schedule" data-max-width="332" x="240" y="426" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${schedule}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_store_bio_scan_qr',
    name: 'بطاقة دائرية لرابط المتجر والبايو',
    nameEn: 'Store Bio & Scan QR Card',
    category: 'barcodes',
    shape: 'circle',
    description: 'ملصق دائري أنيق يوضع على الحقائب والعبوات لمسح رابط المتجر والبايو',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 80, height: 80 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 228 },
    defaultColors: {
      primary: '#115E59',
      secondary: '#C2410C',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط المتجر (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'storeName', label: 'اسم المتجر', type: 'text', defaultValue: 'متجر بابل للهدايا' },
      { id: 'domain', label: 'نطاق الموقع', type: 'text', defaultValue: 'babelgifts.iq' },
      { id: 'ctaText', label: 'نص الدعوة', type: 'text', defaultValue: 'امسح للتسوق أونلاين' },
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
      const storeName = escapeXml(fields.storeName || 'متجر بابل للهدايا');
      const domain = escapeXml(fields.domain || 'babelgifts.iq');
      const ctaText = escapeXml(fields.ctaText || 'امسح للتسوق أونلاين');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 152, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="cs10-ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs10-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="240" cy="240" r="228" fill="${bg}" stroke="url(#cs10-ring)" stroke-width="6" data-color-role="background"/>
  <circle cx="240" cy="240" r="220" fill="url(#cs10-glow)"/>
  <circle cx="240" cy="240" r="219" fill="none" stroke="${primaryColor}" stroke-opacity="0.2" stroke-width="1"/>
  <circle cx="240" cy="240" r="210" fill="none" stroke="${secondaryColor}" stroke-width="1.6" stroke-dasharray="7 5" data-color-role="secondary"/>
  <text data-field-id="storeName" data-max-width="244" x="240" y="84" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${storeName}
  </text>
  <text data-field-id="ctaText" data-max-width="260" x="240" y="120" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${ctaText}
  </text>
  <rect x="148" y="142" width="184" height="184" rx="14" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2"/>
  <g transform="translate(164, 158)">
    ${qrSvg}
  </g>
  <rect x="120" y="346" width="240" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="domain" data-max-width="210" x="240" y="368" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${domain}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_appointment_booking_qr',
    name: 'بطاقة حجز المواعيد السريع',
    nameEn: 'Appointment Booking QR Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة للعيادات والصالونات والمراكز التجميلية لحجز المواعيد عبر QR',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 18 },
    defaultColors: {
      primary: '#0F766E',
      secondary: '#1E293B',
      background: '#F0FDFA',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط نظام الحجز (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'title', label: 'عنوان الخدمة', type: 'text', defaultValue: 'احجز موعدك إلكترونياً' },
      {
        id: 'venueName',
        label: 'اسم المركز / العيادة',
        type: 'text',
        defaultValue: 'مركز الزهراء التجميلي — الكرادة',
      },
      { id: 'phone', label: 'هاتف الاستعلامات', type: 'text', defaultValue: '+964 780 321 6540' },
      {
        id: 'hours',
        label: 'أوقات الدوام',
        type: 'text',
        defaultValue: 'السبت — الخميس • 10 ص — 8 م',
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
      const title = escapeXml(fields.title || 'احجز موعدك إلكترونياً');
      const venueName = escapeXml(fields.venueName || 'مركز الزهراء التجميلي — الكرادة');
      const phone = escapeXml(fields.phone || '+964 780 321 6540');
      const hours = escapeXml(fields.hours || 'السبت — الخميس • 10 ص — 8 م');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 150, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cs11-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cs11-clip">
      <rect x="12" y="12" width="516" height="306" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs11-clip)">
    <rect x="12" y="12" width="516" height="78" fill="url(#cs11-hdr)" data-color-role="primary"/>
    <path d="M 12,12 H 528 V 45 Q 270,65 12,45 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="20" y="20" width="500" height="290" rx="13" fill="none" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1"/>
  <rect x="38" y="33" width="40" height="38" rx="6" fill="none" stroke="${backgroundColor}" stroke-width="2.5"/>
  <path d="M 38,45 H 78 M 49,28 V 36 M 67,28 V 36 M 50,56 L 56,62 L 67,51" fill="none" stroke="${backgroundColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <text data-field-id="venueName" data-max-width="390" x="298" y="51" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${venueName}
  </text>
  <rect x="328" y="114" width="176" height="176" rx="14" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2"/>
  ${cornerBracketsMarkup(320, 106, 192, 192, 14, primaryColor, 2, 'primary')}
  <g transform="translate(341, 127)">
    ${qrSvg}
  </g>
  <text data-field-id="title" data-max-width="268" x="174" y="138" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <rect x="38" y="174" width="272" height="52" rx="26" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="phone" data-max-width="240" x="174" y="200" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  <text data-field-id="hours" data-max-width="268" x="174" y="260" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${hours}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_feedback_suggestion',
    name: 'بطاقة الآراء والمقترحات',
    nameEn: 'Feedback & Suggestion Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة لاستقبال آراء الزبائن واقتراحات التحسين عبر استبيان QR سريع',
    defaultWidth: 500,
    defaultHeight: 350,
    aspectRatio: 500 / 350,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 326, rx: 18 },
    defaultColors: {
      primary: '#6B21A8',
      secondary: '#B45309',
      background: '#FFFDF7',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط استبيان الآراء (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'title', label: 'العنوان', type: 'text', defaultValue: 'رأيك يطوّر خدماتنا' },
      {
        id: 'subtitle',
        label: 'الوصف',
        type: 'text',
        defaultValue: 'امسح الكود وشاركنا ملاحظاتك خلال ثوانٍ',
      },
      {
        id: 'footerNote',
        label: 'اسم الجهة',
        type: 'text',
        defaultValue: 'شركة دجلة للضيافة — بغداد',
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
      const title = escapeXml(fields.title || 'رأيك يطوّر خدماتنا');
      const subtitle = escapeXml(fields.subtitle || 'امسح الكود وشاركنا ملاحظاتك خلال ثوانٍ');
      const footerNote = escapeXml(fields.footerNote || 'شركة دجلة للضيافة — بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 156, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350">
  <defs>
    <radialGradient id="cs12-glow" cx="76%" cy="24%" r="62%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cs12-glow2" cx="20%" cy="82%" r="50%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="12" y="12" width="476" height="326" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="12" y="12" width="476" height="326" rx="18" fill="url(#cs12-glow)"/>
  <rect x="12" y="12" width="476" height="326" rx="18" fill="url(#cs12-glow2)"/>
  <rect x="20" y="20" width="460" height="310" rx="13" fill="none" stroke="${secondaryColor}" stroke-opacity="0.24" stroke-width="1"/>
  ${cornerBracketsMarkup(26, 26, 448, 298, 16, secondaryColor, 2, 'secondary')}
  <rect x="286" y="76" width="176" height="176" rx="14" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <g transform="translate(296, 86)">
    ${qrSvg}
  </g>
  ${starRowMarkup(152, 74, 5, 34, 13, secondaryColor, 'secondary')}
  <text data-field-id="title" data-max-width="234" x="152" y="132" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${title}
  </text>
  <text data-field-id="subtitle" data-max-width="232" x="152" y="178" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${subtitle}
  </text>
  <rect x="40" y="218" width="224" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="footerNote" data-max-width="202" x="152" y="239" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${footerNote}
  </text>
  <text data-max-width="170" x="374" y="286" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    شكراً لمشاركتك
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_payment_zaincash_qicard_fib',
    name: 'بطاقة الدفع الإلكتروني العراقي للطاولة',
    nameEn: 'ZainCash / QiCard / FIB Tabletop Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة دفع للكاشير والمحلات تقبل زين كاش وكي كارد ومصرف العراق الأول مع QR',
    defaultWidth: 450,
    defaultHeight: 600,
    aspectRatio: 450 / 600,
    defaultMm: { width: 75, height: 100 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 422, height: 572, rx: 22 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#047857',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط محفظة الدفع (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      {
        id: 'payTitle',
        label: 'عنوان الدفع',
        type: 'text',
        defaultValue: 'ادفع إلكترونياً بسهولة',
      },
      {
        id: 'methodsLine',
        label: 'المحافظ والبطاقات',
        type: 'text',
        defaultValue: 'زين كاش • كي كارد • FIB',
      },
      {
        id: 'merchantName',
        label: 'اسم التاجر / المحل',
        type: 'text',
        defaultValue: 'أسواق بغداد المركزية',
      },
      {
        id: 'note',
        label: 'ملاحظة الدفع',
        type: 'text',
        defaultValue: 'امسح الكود للدفع الفوري الآمن',
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
      const payTitle = escapeXml(fields.payTitle || 'ادفع إلكترونياً بسهولة');
      const methodsLine = escapeXml(fields.methodsLine || 'زين كاش • كي كارد • FIB');
      const merchantName = escapeXml(fields.merchantName || 'أسواق بغداد المركزية');
      const note = escapeXml(fields.note || 'امسح الكود للدفع الفوري الآمن');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 200, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 600" width="450" height="600">
  <defs>
    <linearGradient id="cs13-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs13-glow" cx="50%" cy="62%" r="48%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs13-clip">
      <rect x="14" y="14" width="422" height="572" rx="22"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="422" height="572" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs13-clip)">
    <rect x="14" y="156" width="422" height="430" fill="url(#cs13-glow)"/>
    <rect x="14" y="14" width="422" height="142" fill="url(#cs13-hdr)" data-color-role="primary"/>
    <path d="M 14,14 H 436 V 74 Q 225,104 14,74 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="22" y="22" width="406" height="556" rx="16" fill="none" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1.2"/>
  <rect x="182" y="34" width="60" height="38" rx="6" fill="none" stroke="${backgroundColor}" stroke-width="2.4"/>
  <path d="M 182,47 H 242 M 192,62 H 210" stroke="${backgroundColor}" stroke-width="2.2" stroke-linecap="round"/>
  <g fill="none" stroke="${backgroundColor}" stroke-width="2.4" stroke-linecap="round">
    <path d="M 252,46 Q 259,53 252,60 M 260,40 Q 270,53 260,66"/>
  </g>
  <text data-field-id="payTitle" data-max-width="370" x="225" y="112" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${payTitle}
  </text>
  <rect x="44" y="174" width="362" height="48" rx="24" fill="${secondaryColor}" fill-opacity="0.1" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <text data-field-id="methodsLine" data-max-width="330" x="225" y="198" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${methodsLine}
  </text>
  <rect x="95" y="244" width="260" height="260" rx="16" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  ${cornerBracketsMarkup(84, 233, 282, 282, 18, secondaryColor, 2.5, 'secondary')}
  <g transform="translate(125, 274)">
    ${qrSvg}
  </g>
  <text data-field-id="merchantName" data-max-width="364" x="225" y="532" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${merchantName}
  </text>
  <text data-field-id="note" data-max-width="364" x="225" y="562" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_live_stream_schedule',
    name: 'بطاقة جدول البث المباشر',
    nameEn: 'Live Stream Schedule Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة إعلان مواعيد البث المباشر للمتاجر وصنّاع المحتوى',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 18 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#BE123C',
      background: '#FFF8F8',
    },
    fields: [
      { id: 'liveBadge', label: 'شارة البث', type: 'text', defaultValue: 'بث مباشر LIVE' },
      {
        id: 'channelName',
        label: 'اسم القناة / المتجر',
        type: 'text',
        defaultValue: 'معرض الكرادة للعروض',
      },
      {
        id: 'scheduleText',
        label: 'مواعيد البث',
        type: 'text',
        defaultValue: 'كل خميس وجمعة • 9:00 مساءً بتوقيت بغداد',
      },
      {
        id: 'platformHandle',
        label: 'الحساب والمنصة',
        type: 'text',
        defaultValue: 'TikTok & Instagram: @KarradaLive.iq',
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
      const liveBadge = escapeXml(fields.liveBadge || 'بث مباشر LIVE');
      const channelName = escapeXml(fields.channelName || 'معرض الكرادة للعروض');
      const scheduleText = escapeXml(
        fields.scheduleText || 'كل خميس وجمعة • 9:00 مساءً بتوقيت بغداد',
      );
      const platformHandle = escapeXml(
        fields.platformHandle || 'TikTok & Instagram: @KarradaLive.iq',
      );
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cs14-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cs14-clip">
      <rect x="12" y="12" width="516" height="306" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs14-clip)">
    <rect x="12" y="12" width="516" height="96" fill="url(#cs14-hdr)" data-color-role="primary"/>
    <path d="M 12,12 H 528 V 52 Q 270,74 12,52 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="20" y="20" width="500" height="290" rx="13" fill="none" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1"/>
  <rect x="165" y="38" width="210" height="44" rx="22" fill="${backgroundColor}" fill-opacity="0.18" stroke="${backgroundColor}" stroke-width="2"/>
  <circle cx="195" cy="60" r="11" fill="${backgroundColor}" fill-opacity="0.28"/>
  <circle cx="195" cy="60" r="6" fill="${backgroundColor}"/>
  <text data-field-id="liveBadge" data-max-width="140" x="288" y="60" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${liveBadge}
  </text>
  <text data-field-id="channelName" data-max-width="450" x="270" y="146" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${channelName}
  </text>
  <rect x="44" y="182" width="452" height="54" rx="12" fill="${secondaryColor}" fill-opacity="0.09" stroke="${secondaryColor}" stroke-opacity="0.3" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="scheduleText" data-max-width="420" x="270" y="209" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${scheduleText}
  </text>
  <rect x="70" y="254" width="400" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="platformHandle" data-max-width="366" x="270" y="276" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${platformHandle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_snapchat_add_card',
    name: 'بطاقة إضافة سناب شات والستوري',
    nameEn: 'Snapchat & Stories Add Card',
    category: 'social',
    shape: 'square',
    description: 'بطاقة مربعة عالية التباين لإضافة حساب سناب شات ومشاهدة اليوميات',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 80, height: 80 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 452, height: 452, rx: 28 },
    defaultColors: {
      primary: '#18181B',
      secondary: '#CA8A04',
      background: '#FEFCE8',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط الإضافة (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'أضفنا على سناب شات' },
      { id: 'handle', label: 'اسم المستخدم', type: 'text', defaultValue: '@KarradaStyle.iq' },
      { id: 'subline', label: 'ملاحظة', type: 'text', defaultValue: 'تغطيات يومية وتشكيلات جديدة' },
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
      const headline = escapeXml(fields.headline || 'أضفنا على سناب شات');
      const handle = escapeXml(fields.handle || '@KarradaStyle.iq');
      const subline = escapeXml(fields.subline || 'تغطيات يومية وتشكيلات جديدة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 176, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="cs15-glow" cx="50%" cy="48%" r="52%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="452" height="452" rx="28" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <rect x="14" y="14" width="452" height="452" rx="28" fill="url(#cs15-glow)"/>
  <rect x="22" y="22" width="436" height="436" rx="22" fill="none" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1.2"/>
  ${cornerBracketsMarkup(30, 30, 420, 420, 22, secondaryColor, 3, 'secondary')}
  ${iconMarkup('sparkle', 223, 32, 34, secondaryColor, 'secondary')}
  <text data-field-id="headline" data-max-width="370" x="240" y="96" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${headline}
  </text>
  <rect x="128" y="128" width="224" height="224" rx="18" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2.5"/>
  <g transform="translate(152, 152)">
    ${qrSvg}
  </g>
  <rect x="76" y="370" width="328" height="46" rx="23" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="290" x="240" y="393" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <text data-field-id="subline" data-max-width="364" x="240" y="440" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${subline}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_youtube_subscribe',
    name: 'بطاقة اشتراك قناة يوتيوب',
    nameEn: 'YouTube Subscribe & Bell Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة تشجيعية للاشتراك في قناة يوتيوب وتفعيل الجرس عبر رمز QR',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 18 },
    defaultColors: {
      primary: '#881337',
      secondary: '#0F172A',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط القناة (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'channelName', label: 'اسم القناة', type: 'text', defaultValue: 'قناة أربيل للتقنية' },
      { id: 'ctaText', label: 'نص الاشتراك', type: 'text', defaultValue: 'اشترك الآن وفعّل الجرس' },
      { id: 'handle', label: 'معرّف القناة', type: 'text', defaultValue: '@ErbilTech.iq' },
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
      const channelName = escapeXml(fields.channelName || 'قناة أربيل للتقنية');
      const ctaText = escapeXml(fields.ctaText || 'اشترك الآن وفعّل الجرس');
      const handle = escapeXml(fields.handle || '@ErbilTech.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 150, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cs16-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cs16-clip">
      <rect x="12" y="12" width="516" height="306" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs16-clip)">
    <rect x="12" y="12" width="516" height="82" fill="url(#cs16-hdr)" data-color-role="primary"/>
    <path d="M 12,12 H 528 V 48 Q 270,68 12,48 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="20" y="20" width="500" height="290" rx="13" fill="none" stroke="${primaryColor}" stroke-opacity="0.16" stroke-width="1"/>
  <rect x="38" y="34" width="52" height="38" rx="10" fill="none" stroke="${backgroundColor}" stroke-width="2.5"/>
  <polygon points="58,44 58,62 73,53" fill="${backgroundColor}"/>
  <text data-field-id="channelName" data-max-width="380" x="306" y="53" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${channelName}
  </text>
  <rect x="38" y="116" width="176" height="176" rx="14" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2"/>
  ${cornerBracketsMarkup(30, 108, 192, 192, 14, secondaryColor, 2, 'secondary')}
  <g transform="translate(51, 129)">
    ${qrSvg}
  </g>
  <rect x="234" y="132" width="268" height="58" rx="29" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="ctaText" data-max-width="238" x="368" y="161" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${ctaText}
  </text>
  <rect x="234" y="212" width="268" height="50" rx="25" fill="${secondaryColor}" fill-opacity="0.08" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="handle" data-max-width="238" x="368" y="237" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(19 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_vcard_digital_business',
    name: 'بطاقة عمل رقمية مع رمز QR',
    nameEn: 'Digital Business Card (vCard QR)',
    category: 'barcodes',
    shape: 'rect',
    description: 'بطاقة أعمال حديثة لحفظ بيانات التواصل مباشرة في الهاتف عبر رمز QR',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 16 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#B45309',
      background: '#FAF8F5',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط بطاقة الاتصال (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'fullName', label: 'الاسم الكامل', type: 'text', defaultValue: 'مصطفى الربيعي' },
      {
        id: 'jobTitle',
        label: 'المسمى الوظيفي',
        type: 'text',
        defaultValue: 'مصمم هوية بصرية ومطبوعات',
      },
      { id: 'phone', label: 'رقم الهاتف', type: 'text', defaultValue: '+964 770 987 6543' },
      {
        id: 'location',
        label: 'المدينة / الموقع',
        type: 'text',
        defaultValue: 'بغداد — شارع فلسطين • grido.iq',
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
      const fullName = escapeXml(fields.fullName || 'مصطفى الربيعي');
      const jobTitle = escapeXml(fields.jobTitle || 'مصمم هوية بصرية ومطبوعات');
      const phone = escapeXml(fields.phone || '+964 770 987 6543');
      const location = escapeXml(fields.location || 'بغداد — شارع فلسطين • grido.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 148, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <radialGradient id="cs17-glow" cx="76%" cy="30%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.09"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs17-clip">
      <rect x="12" y="12" width="516" height="306" rx="16"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs17-clip)">
    <rect x="12" y="12" width="516" height="306" fill="url(#cs17-glow)"/>
    <rect x="12" y="12" width="18" height="306" fill="${secondaryColor}" data-color-role="secondary"/>
    <rect x="30" y="12" width="8" height="306" fill="${primaryColor}" data-color-role="primary"/>
  </g>
  <rect x="44" y="20" width="474" height="290" rx="11" fill="none" stroke="${secondaryColor}" stroke-opacity="0.22" stroke-width="1"/>
  <rect x="60" y="76" width="172" height="172" rx="12" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(52, 68, 188, 188, 14, primaryColor, 1.8, 'primary')}
  <g transform="translate(72, 88)">
    ${qrSvg}
  </g>
  <text data-max-width="160" x="146" y="276" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    امسح لحفظ جهة الاتصال
  </text>
  <text data-field-id="fullName" data-max-width="252" x="380" y="88" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${fullName}
  </text>
  <text data-field-id="jobTitle" data-max-width="252" x="380" y="132" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${jobTitle}
  </text>
  <path d="M 262,158 H 498" stroke="${primaryColor}" stroke-opacity="0.2" stroke-width="1.5"/>
  <rect x="256" y="180" width="248" height="48" rx="24" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="phone" data-max-width="220" x="380" y="204" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(19 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  <text data-field-id="location" data-max-width="252" x="380" y="264" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${location}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_location_maps_baghdad',
    name: 'بطاقة موقعنا على الخريطة',
    nameEn: 'Google Maps Location Pin Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة لمشاركة موقع المحل أو الفرع على الخرائط مع العنوان وساعات العمل',
    defaultWidth: 500,
    defaultHeight: 350,
    aspectRatio: 500 / 350,
    defaultMm: { width: 100, height: 70 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 476, height: 326, rx: 18 },
    defaultColors: {
      primary: '#0E7490',
      secondary: '#1E293B',
      background: '#F0F9FF',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط الخريطة (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'زورونا في فرعنا الرئيسي' },
      {
        id: 'address',
        label: 'العنوان التفصيلي',
        type: 'text',
        defaultValue: 'بغداد — المنصور، شارع 14 رمضان',
      },
      { id: 'hours', label: 'ساعات الدوام', type: 'text', defaultValue: 'مفتوح يومياً 9 ص — 11 م' },
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
      const headline = escapeXml(fields.headline || 'زورونا في فرعنا الرئيسي');
      const address = escapeXml(fields.address || 'بغداد — المنصور، شارع 14 رمضان');
      const hours = escapeXml(fields.hours || 'مفتوح يومياً 9 ص — 11 م');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 154, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350">
  <defs>
    <linearGradient id="cs18-hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cs18-clip">
      <rect x="12" y="12" width="476" height="326" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="476" height="326" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cs18-clip)">
    <rect x="12" y="12" width="476" height="84" fill="url(#cs18-hdr)" data-color-role="primary"/>
    <path d="M 12,12 H 488 V 48 Q 250,68 12,48 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="20" y="20" width="460" height="310" rx="13" fill="none" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1"/>
  ${iconMarkup('pin', 36, 36, 36, backgroundColor)}
  <text data-field-id="headline" data-max-width="368" x="278" y="54" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${headline}
  </text>
  <rect x="34" y="120" width="180" height="180" rx="14" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2"/>
  ${cornerBracketsMarkup(26, 112, 196, 196, 14, secondaryColor, 2, 'secondary')}
  <g transform="translate(47, 133)">
    ${qrSvg}
  </g>
  <rect x="234" y="132" width="234" height="72" rx="12" fill="${primaryColor}" fill-opacity="0.08" stroke="${primaryColor}" stroke-opacity="0.28" stroke-width="1.5"/>
  <text data-field-id="address" data-max-width="210" x="351" y="168" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${address}
  </text>
  <rect x="234" y="226" width="234" height="50" rx="25" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="hours" data-max-width="206" x="351" y="251" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle">
    ${hours}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_vip_loyalty_club',
    name: 'بطاقة نادي الولاء والمكافآت VIP',
    nameEn: 'VIP Loyalty & Rewards QR Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة ولاء فاخرة للعملاء الدائمين لجمع النقاط واستبدال الهدايا عبر QR',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 516, height: 306, rx: 18 },
    defaultColors: {
      primary: '#450A0A',
      secondary: '#B45309',
      background: '#FFFBEB',
    },
    fields: [
      {
        id: 'qrUrl',
        label: 'رابط بطاقة النقاط (QR URL)',
        type: 'text',
        defaultValue: 'https://grido.cloud-ip.cc',
      },
      {
        id: 'clubName',
        label: 'اسم النادي / البراند',
        type: 'text',
        defaultValue: 'نادي عملاء البصرة الذهبي',
      },
      {
        id: 'rewardText',
        label: 'ميزة الولاء',
        type: 'text',
        defaultValue: 'امسح الكود واجمع نقاطك مع كل طلب',
      },
      {
        id: 'memberTier',
        label: 'فئة العضوية',
        type: 'text',
        defaultValue: 'VIP MEMBER • عضوية مميزة',
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
      const clubName = escapeXml(fields.clubName || 'نادي عملاء البصرة الذهبي');
      const rewardText = escapeXml(fields.rewardText || 'امسح الكود واجمع نقاطك مع كل طلب');
      const memberTier = escapeXml(fields.memberTier || 'VIP MEMBER • عضوية مميزة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.cloud-ip.cc', 148, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cs19-hdr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs19-glow" cx="28%" cy="56%" r="54%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cs19-clip">
      <rect x="12" y="12" width="516" height="306" rx="18"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="516" height="306" rx="18" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cs19-clip)">
    <rect x="12" y="96" width="516" height="222" fill="url(#cs19-glow)"/>
    <rect x="12" y="12" width="516" height="84" fill="url(#cs19-hdr)" data-color-role="primary"/>
    <path d="M 12,12 H 528 V 48 Q 270,70 12,48 Z" fill="${backgroundColor}" opacity="0.06"/>
  </g>
  <rect x="18" y="18" width="504" height="294" rx="14" fill="none" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1"/>
  ${cornerBracketsMarkup(24, 106, 492, 200, 14, secondaryColor, 2, 'secondary')}
  <text data-field-id="clubName" data-max-width="460" x="270" y="54" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle">
    ${clubName}
  </text>
  <rect x="330" y="118" width="172" height="172" rx="14" fill="#FFFFFF" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <g transform="translate(342, 130)">
    ${qrSvg}
  </g>
  ${starRowMarkup(174, 138, 5, 34, 12, secondaryColor, 'secondary')}
  <text data-field-id="rewardText" data-max-width="260" x="174" y="186" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${rewardText}
  </text>
  <rect x="44" y="226" width="260" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="memberTier" data-max-width="230" x="174" y="248" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle">
    ${memberTier}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_soc_unboxing_share_tag',
    name: 'بطاقة شاركنا لحظة فتح الطلب',
    nameEn: 'Unboxing & Share Story Card',
    category: 'social',
    shape: 'circle',
    description: 'ملصق دائري يوضع داخل الطرود لتشجيع العملاء على تصوير ومشاركة الطلب',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 80, height: 80 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 228 },
    defaultColors: {
      primary: '#7C2D12',
      secondary: '#0F766E',
      background: '#FFF7ED',
    },
    fields: [
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'صوّر طلبك ومنشنا!' },
      { id: 'handle', label: 'حساب المتجر', type: 'text', defaultValue: '@DijlahCraft.iq' },
      { id: 'hashtag', label: 'الوسم / الهاشتاغ', type: 'text', defaultValue: '#طلبك_من_بغداد' },
      {
        id: 'rewardNote',
        label: 'هدية المشاركة',
        type: 'text',
        defaultValue: 'خصم 15% على طلبك القادم',
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
      const headline = escapeXml(fields.headline || 'صوّر طلبك ومنشنا!');
      const handle = escapeXml(fields.handle || '@DijlahCraft.iq');
      const hashtag = escapeXml(fields.hashtag || '#طلبك_من_بغداد');
      const rewardNote = escapeXml(fields.rewardNote || 'خصم 15% على طلبك القادم');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="cs20-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <radialGradient id="cs20-glow" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="240" cy="240" r="228" fill="${bg}" stroke="url(#cs20-grad)" stroke-width="6" data-color-role="background"/>
  <circle cx="240" cy="240" r="220" fill="url(#cs20-glow)"/>
  <circle cx="240" cy="240" r="219" fill="none" stroke="${primaryColor}" stroke-opacity="0.2" stroke-width="1"/>
  <circle cx="240" cy="240" r="210" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="8 6" data-color-role="secondary"/>
  <circle cx="240" cy="94" r="36" fill="url(#cs20-grad)" data-color-role="primary"/>
  <rect x="220" y="78" width="40" height="32" rx="7" fill="none" stroke="${backgroundColor}" stroke-width="2.5"/>
  <circle cx="240" cy="94" r="8" fill="none" stroke="${backgroundColor}" stroke-width="2.5"/>
  <circle cx="252" cy="85" r="2.2" fill="${backgroundColor}"/>
  <text data-field-id="headline" data-max-width="330" x="240" y="168" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${headline}
  </text>
  <rect x="86" y="206" width="308" height="56" rx="28" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="274" x="240" y="234" dominant-baseline="central" font-family="${fontFamily}, monospace" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <text data-field-id="hashtag" data-max-width="320" x="240" y="294" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${hashtag}
  </text>
  <rect x="106" y="324" width="268" height="44" rx="22" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-width="1.5"/>
  <text data-field-id="rewardNote" data-max-width="238" x="240" y="346" dominant-baseline="central" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${rewardNote}
  </text>
</svg>`;
    },
  },
];
