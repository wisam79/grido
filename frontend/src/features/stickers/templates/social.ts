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
    defaultColors: {
      primary: '#243038',
      secondary: '#25655E',
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
  <rect x="12" y="12" width="476" height="296" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <!-- Payment card and concentric contactless waves, without simulated network logos. -->
  <g fill="none" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary">
    <rect x="44" y="53" width="74" height="50" rx="5"/>
    <path d="M44 68H118M56 87H70"/>
  </g>
  <g fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round" data-color-role="secondary">
    <path d="M132 69Q140 78 132 87M142 61Q157 78 142 95M152 53Q174 78 152 103"/>
  </g>
  <text data-field-id="payTitle" data-max-width="264" x="322" y="88" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <path d="M40 124H460" stroke="${primaryColor}" stroke-width="1" opacity="0.2"/>
  <text data-field-id="payMethods" data-max-width="416" x="250" y="190" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${methods}
  </text>
  <path d="M40 228H460" stroke="${primaryColor}" stroke-width="1" opacity="0.2"/>
  <text data-field-id="note" data-max-width="416" x="250" y="270" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
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
    defaultColors: {
      primary: '#9F4055',
      secondary: '#363038',
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
  <rect x="18" y="18" width="424" height="424" rx="10" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <circle cx="230" cy="112" r="48" fill="none" stroke="${primaryColor}" stroke-width="1.5" data-color-role="primary"/>
  <text data-max-width="74" x="230" y="131" font-family="${fontFamily}, sans-serif" font-size="${Math.round(54 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">@</text>
  <text data-field-id="callToAction" data-max-width="364" x="230" y="219" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${cta}
  </text>
  <!-- The handle is the hero, with room for longer names instead of a tight capsule. -->
  <text data-field-id="handle" data-max-width="368" x="230" y="293" font-family="${fontFamily}, monospace" font-size="${Math.round(32 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <path d="M54 326H406" stroke="${primaryColor}" stroke-width="1" opacity="0.35"/>
  <text data-field-id="platforms" data-max-width="352" x="230" y="379" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
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
    defaultColors: {
      primary: '#28617A',
      secondary: '#26343E',
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
  <rect x="12" y="12" width="476" height="316" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <g fill="none" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round" data-color-role="primary">
    <path d="M47 57Q78 29 109 57M58 68Q78 49 98 68M69 79Q78 71 87 79"/>
    <circle cx="78" cy="90" r="3" fill="${primaryColor}" stroke="none"/>
  </g>
  <text data-field-id="wifiTitle" data-max-width="310" x="302" y="76" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <path d="M40 111H460M40 280H460" stroke="${primaryColor}" stroke-width="1" opacity="0.3"/>
  <!-- Labels sit above full-width values, never competing for the same horizontal space. -->
  <text data-max-width="416" x="250" y="141" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
    الشبكة (SSID):
  </text>
  <text data-field-id="ssid" data-max-width="416" x="250" y="180" font-family="${fontFamily}, monospace" font-size="${Math.round(26 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${ssid}
  </text>
  <text data-max-width="416" x="250" y="220" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="500" fill="${secondaryColor}" text-anchor="middle">
    كلمة المرور:
  </text>
  <text data-field-id="password" data-max-width="416" x="250" y="259" font-family="${fontFamily}, monospace" font-size="${Math.round(26 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${pass}
  </text>
  <text data-max-width="416" x="250" y="307" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1.5">
    FREE HIGH-SPEED GUEST WIFI
  </text>
</svg>`;
    },
  },
];
