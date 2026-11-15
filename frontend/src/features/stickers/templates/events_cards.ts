import {
  cornerBracketsMarkup,
  iconMarkup,
  runningStitchCircle,
  scallopCirclePath,
  starPoints,
  starRowMarkup,
  sunRaysPath,
} from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

function ornamentDivider(
  cx: number,
  y: number,
  halfSpan: number,
  color: string,
  colorRole: 'primary' | 'secondary' = 'secondary',
): string {
  const leftEnd = cx - 10;
  const rightStart = cx + 10;
  return (
    `<path d="M ${cx - halfSpan},${y} H ${leftEnd} M ${rightStart},${y} H ${cx + halfSpan}" stroke="${color}" stroke-width="1.3" stroke-linecap="round" data-color-role="${colorRole}"/>` +
    `<polygon points="${cx},${y - 4.5} ${cx + 4.5},${y} ${cx},${y + 4.5} ${cx - 4.5},${y}" fill="${color}" data-color-role="${colorRole}"/>`
  );
}

export const EVENTS_CARDS: StickerTemplate[] = [
  {
    id: 'card_evt_wedding_gold_arch',
    name: 'دعوة زفاف بقوس ذهبي فاخر',
    nameEn: 'Luxury Gold Arch Wedding Card',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة دعوة زفاف فاخرة بقوس معماري مذهب وزخارف أوراق زيتون وإطار مزدوج',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#1B362D',
      secondary: '#C8A253',
      background: '#FCF8F0',
    },
    fields: [
      { id: 'bismillah', label: 'الاستهلال', type: 'text', defaultValue: 'بسم الله الرحمن الرحيم' },
      {
        id: 'inviteLine',
        label: 'نص الدعوة',
        type: 'text',
        defaultValue: 'نتشرف بدعوتكم لحضور حفل زفاف',
      },
      { id: 'coupleNames', label: 'أسماء العروسين', type: 'text', defaultValue: 'مصطفى وريم' },
      {
        id: 'dateLine',
        label: 'التاريخ والوقت',
        type: 'text',
        defaultValue: 'الجمعة 20 تشرين الثاني 2026',
      },
      { id: 'venue', label: 'المكان', type: 'text', defaultValue: 'قاعة سندباد • بغداد' },
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
      const bismillah = escapeXml(fields.bismillah || 'بسم الله الرحمن الرحيم');
      const inviteLine = escapeXml(fields.inviteLine || 'نتشرف بدعوتكم لحضور حفل زفاف');
      const coupleNames = escapeXml(fields.coupleNames || 'مصطفى وريم');
      const dateLine = escapeXml(fields.dateLine || 'الجمعة 20 تشرين الثاني 2026');
      const venue = escapeXml(fields.venue || 'قاعة سندباد • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <linearGradient id="ce01-gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="${secondaryColor}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
    </linearGradient>
    <radialGradient id="ce01-glow" cx="50%" cy="38%" r="48%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce01-glow)"/>
  <rect x="28" y="28" width="469" height="684" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <rect x="36" y="36" width="453" height="668" rx="10" fill="none" stroke="${primaryColor}" stroke-width="0.9" stroke-opacity="0.35" data-color-role="primary"/>
  ${cornerBracketsMarkup(44, 44, 437, 652, 20, secondaryColor, 2, 'secondary')}
  <!-- Architectural pointed arch -->
  <path d="M 80,646 V 262 C 80,164 168,104 262.5,78 C 357,104 445,164 445,262 V 646 Z" fill="url(#ce01-gold)" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="secondary"/>
  <path d="M 94,634 V 268 C 94,180 176,124 262.5,98 C 349,124 431,180 431,268 V 634 Z" fill="none" stroke="${primaryColor}" stroke-width="1.1" stroke-opacity="0.4" data-color-role="primary"/>
  <!-- Apex 8-point rosette & olive leaves -->
  <polygon points="${starPoints(262.5, 134, 8, 17, 7.5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="262.5" cy="134" r="5" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 192,164 C 210,148 232,144 246,144 M 333,164 C 315,148 293,144 279,144" fill="none" stroke="${primaryColor}" stroke-width="1.6" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 206,154 C 194,140 202,128 216,138 C 218,146 212,152 206,154 Z M 226,147 C 218,133 228,124 238,135 C 238,142 232,146 226,147 Z M 319,154 C 331,140 323,128 309,138 C 307,146 313,152 319,154 Z M 299,147 C 307,133 297,124 287,135 C 287,142 293,146 299,147 Z" fill="${primaryColor}" fill-opacity="0.75" data-color-role="primary"/>
  <text data-field-id="bismillah" data-max-width="265" x="262.5" y="228" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${bismillah}
  </text>
  <text data-field-id="inviteLine" data-max-width="295" x="262.5" y="276" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${inviteLine}
  </text>
  ${ornamentDivider(262.5, 308, 98, secondaryColor, 'secondary')}
  <text data-field-id="coupleNames" data-max-width="300" x="262.5" y="366" font-family="${fontFamily}, sans-serif" font-size="${Math.round(48 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${coupleNames}
  </text>
  ${ornamentDivider(262.5, 424, 98, secondaryColor, 'secondary')}
  ${iconMarkup('heart', 251.5, 444, 22, secondaryColor, 'secondary')}
  <text data-field-id="dateLine" data-max-width="295" x="262.5" y="502" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${dateLine}
  </text>
  <rect x="122.5" y="544" width="280" height="48" rx="24" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="venue" data-max-width="244" x="262.5" y="568" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${venue}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_engagement_aqed_qiran',
    name: 'بطاقة عقد قران وخطوبة مينيمال',
    nameEn: 'Aqed Qiran Minimalist Card',
    category: 'greeting',
    shape: 'rect',
    description: 'دعوة عقد قران عصرية بتصميم مينيمال وخواتم متشابكة وأغصان أوكالبتوس ناعمة',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#3D2B24',
      secondary: '#B98B68',
      background: '#FBF7F2',
    },
    fields: [
      { id: 'headerTag', label: 'عنوان المناسبة', type: 'text', defaultValue: 'عقد قران مبارك' },
      { id: 'coupleNames', label: 'الاسمان', type: 'text', defaultValue: 'زيد وهبة' },
      {
        id: 'blessing',
        label: 'الدعاء',
        type: 'text',
        defaultValue: 'بارك الله لكما وجمع بينكما في خير',
      },
      {
        id: 'dateLine',
        label: 'الموعد',
        type: 'text',
        defaultValue: 'الخميس 12 كانون الأول • 6:00 مساءً',
      },
      { id: 'venue', label: 'المكان', type: 'text', defaultValue: 'المنصور • بغداد' },
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
      const headerTag = escapeXml(fields.headerTag || 'عقد قران مبارك');
      const coupleNames = escapeXml(fields.coupleNames || 'زيد وهبة');
      const blessing = escapeXml(fields.blessing || 'بارك الله لكما وجمع بينكما في خير');
      const dateLine = escapeXml(fields.dateLine || 'الخميس 12 كانون الأول • 6:00 مساءً');
      const venue = escapeXml(fields.venue || 'المنصور • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <radialGradient id="ce02-grad" cx="50%" cy="46%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce02-grad)"/>
  <rect x="28" y="28" width="469" height="684" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.45" data-color-role="secondary"/>
  <!-- Minimalist semicircular double arch -->
  <path d="M 68,660 V 250 A 194.5,194.5 0 0,1 457,250 V 660 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.6" data-color-role="secondary"/>
  <path d="M 80,648 V 254 A 182.5,182.5 0 0,1 445,254 V 648 Z" fill="none" stroke="${primaryColor}" stroke-width="0.9" stroke-opacity="0.32" data-color-role="primary"/>
  <!-- Intertwined engagement rings -->
  <circle cx="247" cy="144" r="22" fill="none" stroke="${secondaryColor}" stroke-width="3" data-color-role="secondary"/>
  <circle cx="278" cy="144" r="22" fill="none" stroke="${primaryColor}" stroke-width="3" data-color-role="primary"/>
  <polygon points="${starPoints(278, 117, 4, 7, 3)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <!-- Eucalyptus botanical corner sprigs (below venue pill) -->
  <path d="M 84,644 C 102,616 122,598 148,586 M 441,644 C 423,616 403,598 377,586" fill="none" stroke="${primaryColor}" stroke-width="1.6" stroke-linecap="round" stroke-opacity="0.58" data-color-role="primary"/>
  <ellipse cx="106" cy="618" rx="10" ry="5.5" transform="rotate(-36 106 618)" fill="${secondaryColor}" fill-opacity="0.48" data-color-role="secondary"/>
  <ellipse cx="130" cy="598" rx="10" ry="5.5" transform="rotate(-22 130 598)" fill="${secondaryColor}" fill-opacity="0.48" data-color-role="secondary"/>
  <ellipse cx="419" cy="618" rx="10" ry="5.5" transform="rotate(36 419 618)" fill="${secondaryColor}" fill-opacity="0.48" data-color-role="secondary"/>
  <ellipse cx="395" cy="598" rx="10" ry="5.5" transform="rotate(22 395 598)" fill="${secondaryColor}" fill-opacity="0.48" data-color-role="secondary"/>
  <text data-field-id="headerTag" data-max-width="290" x="262.5" y="226" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${headerTag}
  </text>
  <text data-field-id="coupleNames" data-max-width="320" x="262.5" y="310" font-family="${fontFamily}, sans-serif" font-size="${Math.round(52 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${coupleNames}
  </text>
  ${ornamentDivider(262.5, 376, 86, secondaryColor, 'secondary')}
  <text data-field-id="blessing" data-max-width="320" x="262.5" y="424" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${blessing}
  </text>
  <text data-field-id="dateLine" data-max-width="310" x="262.5" y="486" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${dateLine}
  </text>
  <rect x="137.5" y="524" width="250" height="44" rx="22" fill="${primaryColor}" fill-opacity="0.08" stroke="${secondaryColor}" stroke-width="1.3" data-color-role="secondary"/>
  <text data-field-id="venue" data-max-width="216" x="262.5" y="546" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${venue}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_newborn_baby_boy',
    name: 'بطاقة استقبال مولود ذكر',
    nameEn: 'Baby Boy Welcome Card',
    category: 'kids',
    shape: 'rect',
    description: 'بطاقة ترحيب بمولود ذكر بسحب ناعمة وهلال ونجوم معلقة وتطريز محيطي',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#1E4E79',
      secondary: '#89B9E6',
      background: '#F4F9FF',
    },
    fields: [
      {
        id: 'welcomeTag',
        label: 'عبارة الترحيب',
        type: 'text',
        defaultValue: 'أهلاً بك في عالمنا',
      },
      { id: 'babyName', label: 'اسم المولود', type: 'text', defaultValue: 'الأمير الصغير كرم' },
      {
        id: 'blessing',
        label: 'التهنئة',
        type: 'text',
        defaultValue: 'أنبته الله نباتاً حسناً وجعله قرة عين لوالديه',
      },
      {
        id: 'birthInfo',
        label: 'المدينة / الحساب',
        type: 'text',
        defaultValue: 'بغداد • @KaramFamily.iq',
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
      const welcomeTag = escapeXml(fields.welcomeTag || 'أهلاً بك في عالمنا');
      const babyName = escapeXml(fields.babyName || 'الأمير الصغير كرم');
      const blessing = escapeXml(
        fields.blessing || 'أنبته الله نباتاً حسناً وجعله قرة عين لوالديه',
      );
      const birthInfo = escapeXml(fields.birthInfo || 'بغداد • @KaramFamily.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <linearGradient id="ce03-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.03"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce03-sky)"/>
  <rect x="26" y="26" width="488" height="308" rx="12" fill="none" stroke="${primaryColor}" stroke-width="1.3" stroke-dasharray="6 5" stroke-opacity="0.45" data-color-role="primary"/>
  <!-- Fluffy cloud & crescent accent (clear of text zone) -->
  <path d="M 56,82 A 14,14 0 0,1 81,74 A 18,18 0 0,1 113,79 A 12,12 0 0,1 115,100 H 56 A 11,11 0 0,1 56,82 Z" fill="${secondaryColor}" fill-opacity="0.48" data-color-role="secondary"/>
  <polygon points="${starPoints(98, 50, 5, 7.5, 3.2)}" fill="${primaryColor}" fill-opacity="0.55" data-color-role="primary"/>
  <path d="M 466,54 A 22,22 0 1,0 486,86 A 17,17 0 1,1 466,54 Z" fill="${primaryColor}" fill-opacity="0.82" data-color-role="primary"/>
  <line x1="432" y1="26" x2="432" y2="68" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <polygon points="${starPoints(432, 76, 5, 10, 4.5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="welcomeTag" data-max-width="245" x="270" y="78" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${welcomeTag}
  </text>
  <text data-field-id="babyName" data-max-width="410" x="270" y="144" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${babyName}
  </text>
  ${starRowMarkup(270, 194, 3, 24, 6.5, secondaryColor, 'secondary')}
  <text data-field-id="blessing" data-max-width="430" x="270" y="236" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${blessing}
  </text>
  <rect x="135" y="272" width="270" height="40" rx="20" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="birthInfo" data-max-width="236" x="270" y="292" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${birthInfo}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_newborn_baby_girl',
    name: 'بطاقة استقبال مولودة أنثى',
    nameEn: 'Baby Girl Welcome Card',
    category: 'kids',
    shape: 'rect',
    description: 'بطاقة ترحيب بمولودة بتدرجات وردية دافئة وبراعم زهور ونجوم معلقة',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#8E3B5E',
      secondary: '#E5A9BC',
      background: '#FFF7FA',
    },
    fields: [
      {
        id: 'welcomeTag',
        label: 'عبارة الترحيب',
        type: 'text',
        defaultValue: 'نورتِ دنيانا بقدومك',
      },
      { id: 'babyName', label: 'اسم المولودة', type: 'text', defaultValue: 'الأميرة الصغيرة تالا' },
      {
        id: 'blessing',
        label: 'التهنئة',
        type: 'text',
        defaultValue: 'اللهم أنبتها نباتاً حسناً واحفظها بعينك',
      },
      {
        id: 'birthInfo',
        label: 'المدينة / الملاحظة',
        type: 'text',
        defaultValue: 'أربيل • أهلاً بالربيع الجديد',
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
      const welcomeTag = escapeXml(fields.welcomeTag || 'نورتِ دنيانا بقدومك');
      const babyName = escapeXml(fields.babyName || 'الأميرة الصغيرة تالا');
      const blessing = escapeXml(fields.blessing || 'اللهم أنبتها نباتاً حسناً واحفظها بعينك');
      const birthInfo = escapeXml(fields.birthInfo || 'أربيل • أهلاً بالربيع الجديد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <radialGradient id="ce04-blush" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce04-blush)"/>
  <rect x="26" y="26" width="488" height="308" rx="12" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <!-- Corner floral blossoms & hanging star accents -->
  <circle cx="62" cy="64" r="14" fill="${secondaryColor}" fill-opacity="0.55" data-color-role="secondary"/>
  <circle cx="80" cy="56" r="10" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <circle cx="66" cy="82" r="9" fill="${primaryColor}" fill-opacity="0.28" data-color-role="primary"/>
  <circle cx="478" cy="64" r="14" fill="${secondaryColor}" fill-opacity="0.55" data-color-role="secondary"/>
  <circle cx="460" cy="56" r="10" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <circle cx="474" cy="82" r="9" fill="${primaryColor}" fill-opacity="0.28" data-color-role="primary"/>
  <circle cx="60" cy="306" r="9" fill="${secondaryColor}" fill-opacity="0.45" data-color-role="secondary"/>
  <circle cx="76" cy="314" r="6" fill="${primaryColor}" fill-opacity="0.25" data-color-role="primary"/>
  <circle cx="480" cy="306" r="9" fill="${secondaryColor}" fill-opacity="0.45" data-color-role="secondary"/>
  <circle cx="464" cy="314" r="6" fill="${primaryColor}" fill-opacity="0.25" data-color-role="primary"/>
  ${iconMarkup('heart', 258, 44, 24, primaryColor, 'primary')}
  <text data-field-id="welcomeTag" data-max-width="310" x="270" y="94" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${welcomeTag}
  </text>
  <text data-field-id="babyName" data-max-width="430" x="270" y="152" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${babyName}
  </text>
  <path d="M 164,198 Q 270,214 376,198" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="blessing" data-max-width="430" x="270" y="238" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${blessing}
  </text>
  <rect x="135" y="272" width="270" height="40" rx="20" fill="${secondaryColor}" fill-opacity="0.32" stroke="${primaryColor}" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="birthInfo" data-max-width="236" x="270" y="292" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${birthInfo}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_graduation_honor',
    name: 'بطاقة تخرج وتفوق أكاديمي',
    nameEn: 'Graduation Honor Editorial Card',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة تهنئة تخرج تحريرية بقبعة التخرج وإكليل الغار ونجوم الشرف الذهبية',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#111D35',
      secondary: '#D4AF37',
      background: '#FDFBF7',
    },
    fields: [
      { id: 'honorBadge', label: 'الدفعة / الشرف', type: 'text', defaultValue: 'دفعة التميز 2026' },
      { id: 'title', label: 'عنوان التهنئة', type: 'text', defaultValue: 'مبارك التخرج' },
      { id: 'graduateName', label: 'اسم الخريج', type: 'text', defaultValue: 'م. سارة علاء الدين' },
      {
        id: 'degree',
        label: 'الدرجة والجامعة',
        type: 'text',
        defaultValue: 'بكالوريوس هندسة معمارية • جامعة بغداد',
      },
      {
        id: 'note',
        label: 'كلمة التهنئة',
        type: 'text',
        defaultValue: 'من جدّ وجد، وإلى أعلى المراتب دائماً',
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
      const honorBadge = escapeXml(fields.honorBadge || 'دفعة التميز 2026');
      const title = escapeXml(fields.title || 'مبارك التخرج');
      const graduateName = escapeXml(fields.graduateName || 'م. سارة علاء الدين');
      const degree = escapeXml(fields.degree || 'بكالوريوس هندسة معمارية • جامعة بغداد');
      const note = escapeXml(fields.note || 'من جدّ وجد، وإلى أعلى المراتب دائماً');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <linearGradient id="ce05-navy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.92"/>
    </linearGradient>
    <clipPath id="ce05-clip">
      <rect x="14" y="14" width="497" height="712" rx="20"/>
    </clipPath>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#ce05-clip)">
    <rect x="14" y="14" width="497" height="236" fill="url(#ce05-navy)"/>
    <path d="M 14,250 H 511" stroke="${secondaryColor}" stroke-width="4" data-color-role="secondary"/>
    <path d="M 14,257 H 511" stroke="${secondaryColor}" stroke-width="1.2" stroke-opacity="0.55" data-color-role="secondary"/>
  </g>
  ${cornerBracketsMarkup(34, 34, 457, 672, 18, secondaryColor, 2, 'secondary')}
  <!-- Mortarboard graduation cap & subtle laurel -->
  <polygon points="262.5,66 338,98 262.5,130 187,98" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 218,116 V 146 C 236,158 289,158 307,146 V 116" fill="${secondaryColor}" fill-opacity="0.85" stroke="${backgroundColor}" stroke-width="1.5" data-color-role="secondary"/>
  <path d="M 326,103 V 142" stroke="${backgroundColor}" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="326" cy="146" r="4.5" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="honorBadge" data-max-width="300" x="262.5" y="204" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${honorBadge}
  </text>
  ${starRowMarkup(262.5, 294, 5, 26, 7.5, secondaryColor, 'secondary')}
  <text data-field-id="title" data-max-width="380" x="262.5" y="356" font-family="${fontFamily}, sans-serif" font-size="${Math.round(46 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${title}
  </text>
  ${ornamentDivider(262.5, 416, 120, secondaryColor, 'secondary')}
  <text data-field-id="graduateName" data-max-width="400" x="262.5" y="466" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${graduateName}
  </text>
  <text data-field-id="degree" data-max-width="405" x="262.5" y="522" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${degree}
  </text>
  <rect x="76.5" y="576" width="372" height="62" rx="14" fill="${primaryColor}" fill-opacity="0.06" stroke="${secondaryColor}" stroke-width="1.3" data-color-role="secondary"/>
  <text data-field-id="note" data-max-width="340" x="262.5" y="607" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_vip_opening_invite',
    name: 'دعوة افتتاح رسمية VIP',
    nameEn: 'Formal VIP Opening Invitation',
    category: 'greeting',
    shape: 'rect',
    description: 'دعوة VIP رسمية داكنة بخطوط ذهبية مزدوجة وشعار هندسي لحفلات الافتتاح والمؤتمرات',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#F8FAFC',
      secondary: '#C9A050',
      background: '#111827',
    },
    fields: [
      { id: 'vipTag', label: 'وسم الدعوة', type: 'text', defaultValue: 'دعوة شخصية • VIP' },
      {
        id: 'headline',
        label: 'العنوان الرئيسي',
        type: 'text',
        defaultValue: 'حفل الافتتاح الكبير',
      },
      {
        id: 'subTitle',
        label: 'نص الترحيب',
        type: 'text',
        defaultValue: 'يسرنا تشريفكم في تدشين صالة العرض الجديدة',
      },
      {
        id: 'dateTime',
        label: 'التاريخ والساعة',
        type: 'text',
        defaultValue: 'السبت 28 تشرين الثاني • 7:00 مساءً',
      },
      {
        id: 'location',
        label: 'الموقع',
        type: 'text',
        defaultValue: 'شارع الأميرات • المنصور، بغداد',
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
      const vipTag = escapeXml(fields.vipTag || 'دعوة شخصية • VIP');
      const headline = escapeXml(fields.headline || 'حفل الافتتاح الكبير');
      const subTitle = escapeXml(fields.subTitle || 'يسرنا تشريفكم في تدشين صالة العرض الجديدة');
      const dateTime = escapeXml(fields.dateTime || 'السبت 28 تشرين الثاني • 7:00 مساءً');
      const location = escapeXml(fields.location || 'شارع الأميرات • المنصور، بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <radialGradient id="ce06-dark" cx="50%" cy="30%" r="65%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ce06-gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
      <stop offset="50%" stop-color="${secondaryColor}" stop-opacity="1"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce06-dark)"/>
  <rect x="30" y="30" width="465" height="680" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1.2" stroke-opacity="0.7" data-color-role="secondary"/>
  ${cornerBracketsMarkup(46, 46, 433, 648, 22, secondaryColor, 2.2, 'secondary')}
  <!-- Geometric diamond crest -->
  <polygon points="${starPoints(262.5, 128, 8, 34, 16)}" fill="none" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <polygon points="${starPoints(262.5, 128, 4, 18, 8)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="152.5" y="194" width="220" height="42" rx="21" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="vipTag" data-max-width="190" x="262.5" y="215" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${vipTag}
  </text>
  <text data-field-id="headline" data-max-width="385" x="262.5" y="306" font-family="${fontFamily}, sans-serif" font-size="${Math.round(42 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  <rect x="102.5" y="362" width="320" height="2" fill="url(#ce06-gold)"/>
  <polygon points="262.5,358 267,363 262.5,368 258,363" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="subTitle" data-max-width="380" x="262.5" y="416" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${subTitle}
  </text>
  <rect x="78" y="482" width="369" height="128" rx="14" fill="${secondaryColor}" fill-opacity="0.1" stroke="${secondaryColor}" stroke-width="1.3" data-color-role="secondary"/>
  <path d="M 124,546 H 401" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.35" data-color-role="secondary"/>
  <text data-field-id="dateTime" data-max-width="335" x="262.5" y="514" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${dateTime}
  </text>
  <text data-field-id="location" data-max-width="335" x="262.5" y="578" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${location}
  </text>
  ${starRowMarkup(262.5, 650, 3, 24, 5, secondaryColor, 'secondary')}
</svg>`;
    },
  },
  {
    id: 'card_evt_birthday_confetti',
    name: 'بطاقة عيد ميلاد بالبالونات والقصاصات',
    nameEn: 'Birthday Party Confetti Card',
    category: 'kids',
    shape: 'rect',
    description: 'بطاقة عيد ميلاد احتفالية ببالونات طائرة وقصاصات زاهية وكعكة عيد ميلاد',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#4A2574',
      secondary: '#F48C06',
      background: '#FFFDF6',
    },
    fields: [
      {
        id: 'celebrationTag',
        label: 'الشعار العلوي',
        type: 'text',
        defaultValue: 'كل عام وأنت بخير',
      },
      { id: 'personName', label: 'الاسم', type: 'text', defaultValue: 'عيد ميلاد سعيد يا يوسف!' },
      {
        id: 'partyNote',
        label: 'الأمنية',
        type: 'text',
        defaultValue: 'نتمنى لك عاماً مليئاً بالبهجة والنجاح',
      },
      {
        id: 'details',
        label: 'الموعد والمكان',
        type: 'text',
        defaultValue: 'الأربعاء 5:00 مساءً • البصرة',
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
      const celebrationTag = escapeXml(fields.celebrationTag || 'كل عام وأنت بخير');
      const personName = escapeXml(fields.personName || 'عيد ميلاد سعيد يا يوسف!');
      const partyNote = escapeXml(fields.partyNote || 'نتمنى لك عاماً مليئاً بالبهجة والنجاح');
      const details = escapeXml(fields.details || 'الأربعاء 5:00 مساءً • البصرة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <radialGradient id="ce07-party" cx="50%" cy="45%" r="60%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce07-party)"/>
  <rect x="24" y="24" width="492" height="312" rx="13" fill="none" stroke="${secondaryColor}" stroke-width="1.2" stroke-opacity="0.45" data-color-role="secondary"/>
  <!-- Floating balloons left & right (positioned outside text safe zone) -->
  <ellipse cx="54" cy="88" rx="19" ry="24" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 54,112 Q 48,142 58,172" fill="none" stroke="${primaryColor}" stroke-width="1.5" data-color-role="primary"/>
  <ellipse cx="80" cy="114" rx="14" ry="19" fill="${primaryColor}" fill-opacity="0.85" data-color-role="primary"/>
  <path d="M 80,133 Q 84,158 76,184" fill="none" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <ellipse cx="486" cy="88" rx="19" ry="24" fill="${primaryColor}" fill-opacity="0.88" data-color-role="primary"/>
  <path d="M 486,112 Q 492,142 482,172" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <ellipse cx="460" cy="114" rx="14" ry="19" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 460,133 Q 456,158 464,184" fill="none" stroke="${primaryColor}" stroke-width="1.4" data-color-role="primary"/>
  <!-- Confetti dots & sparkles -->
  <circle cx="122" cy="52" r="4.5" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="418" cy="52" r="4.5" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="58" cy="278" r="5.5" fill="${secondaryColor}" fill-opacity="0.65" data-color-role="secondary"/>
  <circle cx="482" cy="276" r="5.5" fill="${primaryColor}" fill-opacity="0.55" data-color-role="primary"/>
  <polygon points="${starPoints(148, 52, 4, 8, 3.2)}" fill="${primaryColor}" data-color-role="primary"/>
  <polygon points="${starPoints(392, 52, 4, 8, 3.2)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="175" y="36" width="190" height="38" rx="19" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="celebrationTag" data-max-width="164" x="270" y="55" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${celebrationTag}
  </text>
  <text data-field-id="personName" data-max-width="305" x="270" y="130" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${personName}
  </text>
  ${starRowMarkup(270, 178, 5, 22, 5.5, secondaryColor, 'secondary')}
  <text data-field-id="partyNote" data-max-width="370" x="270" y="224" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${partyNote}
  </text>
  <rect x="125" y="266" width="290" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="details" data-max-width="256" x="270" y="287" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${details}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_anniversary_romantic',
    name: 'بطاقة ذكرى زواج ومودة',
    nameEn: 'Romantic Anniversary Note Card',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة رومانسية لذكرى الزواج والمناسبات العاطفية بإطار مزدوج وقلوب وزهور رقيقة',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#6B1D2F',
      secondary: '#D4A373',
      background: '#FDF6F4',
    },
    fields: [
      { id: 'tag', label: 'المناسبة', type: 'text', defaultValue: 'ذكرى سنوية سعيدة' },
      {
        id: 'headline',
        label: 'العبارة الرئيسية',
        type: 'text',
        defaultValue: 'كل عام وأنتِ أجمل أقداري',
      },
      {
        id: 'message',
        label: 'رسالة المودة',
        type: 'text',
        defaultValue: 'شكراً لكل لحظة دافئة جمعتنا معاً',
      },
      { id: 'signature', label: 'التوقيع', type: 'text', defaultValue: 'بكل الحب • بغداد' },
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
      const tag = escapeXml(fields.tag || 'ذكرى سنوية سعيدة');
      const headline = escapeXml(fields.headline || 'كل عام وأنتِ أجمل أقداري');
      const message = escapeXml(fields.message || 'شكراً لكل لحظة دافئة جمعتنا معاً');
      const signature = escapeXml(fields.signature || 'بكل الحب • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <radialGradient id="ce08-rose" cx="50%" cy="40%" r="58%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce08-rose)"/>
  <rect x="28" y="28" width="484" height="304" rx="12" fill="none" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  ${cornerBracketsMarkup(40, 40, 460, 280, 16, primaryColor, 1.8, 'primary')}
  ${iconMarkup('heart', 246, 48, 22, secondaryColor, 'secondary')}
  ${iconMarkup('heart', 272, 48, 22, primaryColor, 'primary')}
  <text data-field-id="tag" data-max-width="300" x="270" y="100" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${tag}
  </text>
  <text data-field-id="headline" data-max-width="410" x="270" y="154" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${ornamentDivider(270, 198, 94, secondaryColor, 'secondary')}
  <text data-field-id="message" data-max-width="410" x="270" y="238" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${message}
  </text>
  <rect x="155" y="274" width="230" height="34" rx="17" fill="${secondaryColor}" fill-opacity="0.16" stroke="${secondaryColor}" stroke-width="1.1" data-color-role="secondary"/>
  <text data-field-id="signature" data-max-width="202" x="270" y="291" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${signature}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_eid_fitr_crescent',
    name: 'بطاقة تهنئة عيد الفطر بهلال ذهبي',
    nameEn: 'Eid Al-Fitr Gold Crescent Card',
    category: 'seasonal',
    shape: 'rect',
    description: 'بطاقة تهنئة عيد الفطر بسماء ليلية مرصعة بالنجوم وهلال ذهبي وقوس إسلامي فاخر',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#FBF6E8',
      secondary: '#E2B75B',
      background: '#082421',
    },
    fields: [
      { id: 'greetingTop', label: 'الدعاء العلوي', type: 'text', defaultValue: 'تقبل الله طاعتكم' },
      { id: 'mainTitle', label: 'التهنئة الرئيسية', type: 'text', defaultValue: 'عيد فطر مبارك' },
      {
        id: 'subWish',
        label: 'رسالة العيد',
        type: 'text',
        defaultValue: 'أعاده الله عليكم باليُمن والبركات والمسرات',
      },
      { id: 'sender', label: 'المرسل', type: 'text', defaultValue: 'عائلة آل العزاوي • بغداد' },
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
      const greetingTop = escapeXml(fields.greetingTop || 'تقبل الله طاعتكم');
      const mainTitle = escapeXml(fields.mainTitle || 'عيد فطر مبارك');
      const subWish = escapeXml(fields.subWish || 'أعاده الله عليكم باليُمن والبركات والمسرات');
      const sender = escapeXml(fields.sender || 'عائلة آل العزاوي • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <radialGradient id="ce09-night" cx="50%" cy="28%" r="64%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ce09-cres" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce09-night)"/>
  <rect x="26" y="26" width="473" height="688" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.4" data-color-role="secondary"/>
  ${cornerBracketsMarkup(40, 40, 445, 660, 18, secondaryColor, 1.8, 'secondary')}
  <path d="M 68,654 V 256 C 68,154 160,96 262.5,68 C 365,96 457,154 457,256 V 654 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <path d="M 80,642 V 262 C 80,170 166,114 262.5,88 C 359,114 445,170 445,262 V 642 Z" fill="none" stroke="${secondaryColor}" stroke-width="0.9" stroke-opacity="0.45" data-color-role="secondary"/>
  <!-- Starry sky & gold crescent -->
  <circle cx="132" cy="186" r="2.5" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="392" cy="186" r="2.5" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${starPoints(156, 232, 4, 8, 3)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${starPoints(368, 232, 4, 8, 3)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 278,128 A 56,56 0 1,0 326,210 A 45,45 0 1,1 278,128 Z" fill="url(#ce09-cres)"/>
  <line x1="292" y1="158" x2="292" y2="184" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <polygon points="${starPoints(292, 192, 8, 12, 5.5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="greetingTop" data-max-width="310" x="262.5" y="290" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${greetingTop}
  </text>
  <text data-field-id="mainTitle" data-max-width="325" x="262.5" y="364" font-family="${fontFamily}, sans-serif" font-size="${Math.round(48 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${mainTitle}
  </text>
  ${ornamentDivider(262.5, 422, 108, secondaryColor, 'secondary')}
  <text data-field-id="subWish" data-max-width="325" x="262.5" y="470" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${subWish}
  </text>
  <polygon points="${starPoints(262.5, 528, 8, 16, 7)}" fill="none" stroke="${secondaryColor}" stroke-width="1.3" data-color-role="secondary"/>
  <rect x="112.5" y="572" width="300" height="46" rx="23" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="sender" data-max-width="268" x="262.5" y="595" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${sender}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_eid_adha_luxury',
    name: 'بطاقة تهنئة عيد الأضحى المبارك',
    nameEn: 'Eid Al-Adha Luxury Arch Card',
    category: 'seasonal',
    shape: 'rect',
    description: 'بطاقة تهنئة عيد الأضحى بإشراقة شمس ذهبية ونجمة ثمانية وإطار تراثي أنيق',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#2D231C',
      secondary: '#C59B42',
      background: '#FAF4E8',
    },
    fields: [
      {
        id: 'topNote',
        label: 'السطر العلوي',
        type: 'text',
        defaultValue: 'كل عام وأنتم إلى الله أقرب',
      },
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'عيد أضحى مبارك' },
      {
        id: 'wishLine',
        label: 'التهنئة',
        type: 'text',
        defaultValue: 'عساكم من عواده بالخير والعافية',
      },
      { id: 'brandLine', label: 'التوقيع', type: 'text', defaultValue: 'أطيب التهاني من أربيل' },
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
      const topNote = escapeXml(fields.topNote || 'كل عام وأنتم إلى الله أقرب');
      const headline = escapeXml(fields.headline || 'عيد أضحى مبارك');
      const wishLine = escapeXml(fields.wishLine || 'عساكم من عواده بالخير والعافية');
      const brandLine = escapeXml(fields.brandLine || 'أطيب التهاني من أربيل');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <radialGradient id="ce10-sun" cx="50%" cy="24%" r="58%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce10-sun)"/>
  <rect x="28" y="28" width="484" height="304" rx="12" fill="none" stroke="${primaryColor}" stroke-width="1.2" stroke-opacity="0.35" data-color-role="primary"/>
  ${cornerBracketsMarkup(40, 40, 460, 280, 18, secondaryColor, 2, 'secondary')}
  <path d="${sunRaysPath(270, 66, 16, 34, 12, 0.24)}" fill="${secondaryColor}" fill-opacity="0.34" data-color-role="secondary"/>
  <polygon points="${starPoints(270, 66, 8, 15, 6.5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="topNote" data-max-width="340" x="270" y="124" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${topNote}
  </text>
  <text data-field-id="headline" data-max-width="410" x="270" y="178" font-family="${fontFamily}, sans-serif" font-size="${Math.round(42 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${ornamentDivider(270, 224, 106, secondaryColor, 'secondary')}
  <text data-field-id="wishLine" data-max-width="410" x="270" y="258" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${wishLine}
  </text>
  <text data-field-id="brandLine" data-max-width="300" x="270" y="298" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${brandLine}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_ramadan_lantern',
    name: 'بطاقة رمضان كريم بفانوس مضيء',
    nameEn: 'Ramadan Kareem Lantern Card',
    category: 'seasonal',
    shape: 'rect',
    description: 'بطاقة رمضانية فاخرة بفانوس متدلي مضيء وقوس زخرفي ونجوم متلألئة',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#FFF8E7',
      secondary: '#F0B949',
      background: '#12102C',
    },
    fields: [
      { id: 'topTag', label: 'الاستهلال', type: 'text', defaultValue: 'أهلاً بشهر الخير والبركة' },
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'رمضان كريم' },
      {
        id: 'duaLine',
        label: 'الدعاء',
        type: 'text',
        defaultValue: 'اللهم أهله علينا بالأمن والإيمان والسلامة',
      },
      {
        id: 'footerNote',
        label: 'التذييل',
        type: 'text',
        defaultValue: 'مبارك عليكم الشهر • النجف الأشرف',
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
      const topTag = escapeXml(fields.topTag || 'أهلاً بشهر الخير والبركة');
      const headline = escapeXml(fields.headline || 'رمضان كريم');
      const duaLine = escapeXml(fields.duaLine || 'اللهم أهله علينا بالأمن والإيمان والسلامة');
      const footerNote = escapeXml(fields.footerNote || 'مبارك عليكم الشهر • النجف الأشرف');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <linearGradient id="ce11-night" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="ce11-glow" cx="50%" cy="27%" r="36%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce11-night)"/>
  <rect x="26" y="26" width="473" height="688" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.4" data-color-role="secondary"/>
  <circle cx="262.5" cy="196" r="148" fill="url(#ce11-glow)"/>
  <path d="M 62,664 V 240 C 62,146 154,90 262.5,64 C 371,90 463,146 463,240 V 664 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <path d="M 74,652 V 244 C 74,158 160,104 262.5,78 C 365,104 451,158 451,244 V 652 Z" fill="none" stroke="${secondaryColor}" stroke-width="0.9" stroke-opacity="0.42" data-color-role="secondary"/>
  <!-- Hanging Fanous (Lantern) -->
  <line x1="262.5" y1="78" x2="262.5" y2="112" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <circle cx="262.5" cy="118" r="6" fill="none" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <path d="M 244,136 L 262.5,122 L 281,136 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="234,136 291,136 298,150 227,150" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="231,150 294,150 284,226 241,226" fill="${secondaryColor}" fill-opacity="0.22" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="secondary"/>
  <path d="M 262.5,168 C 254,182 254,198 262.5,208 C 271,198 271,182 262.5,168 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="237,226 288,226 278,242 247,242" fill="${secondaryColor}" data-color-role="secondary"/>
  <!-- Twinkling stars -->
  <polygon points="${starPoints(142, 168, 4, 9, 3.5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${starPoints(383, 168, 4, 9, 3.5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="174" cy="128" r="2.5" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="351" cy="128" r="2.5" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="topTag" data-max-width="330" x="262.5" y="298" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${topTag}
  </text>
  <text data-field-id="headline" data-max-width="335" x="262.5" y="374" font-family="${fontFamily}, sans-serif" font-size="${Math.round(52 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${ornamentDivider(262.5, 434, 106, secondaryColor, 'secondary')}
  <text data-field-id="duaLine" data-max-width="335" x="262.5" y="486" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${duaLine}
  </text>
  <rect x="102.5" y="574" width="320" height="46" rx="23" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="footerNote" data-max-width="286" x="262.5" y="597" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${footerNote}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_mothers_day_floral',
    name: 'بطاقة عيد الأم بإكليل أزهار',
    nameEn: 'Mothers Day Floral Bouquet Card',
    category: 'seasonal',
    shape: 'rect',
    description: 'بطاقة عيد الأم بإكليل زهري متناظر وورود وأوراق زيتون مع إطار بيضوي أنيق',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#7D2E46',
      secondary: '#D88C9A',
      background: '#FFF9F7',
    },
    fields: [
      { id: 'badge', label: 'الاستهلال', type: 'text', defaultValue: 'إلى نبع الحنان' },
      { id: 'headline', label: 'الاسم أو اللقب', type: 'text', defaultValue: 'أمي الغالية' },
      {
        id: 'message',
        label: 'رسالة الامتنان',
        type: 'text',
        defaultValue: 'كل عام وأنتِ تاج رؤوسنا ونور بيتنا',
      },
      {
        id: 'signature',
        label: 'التوقيع',
        type: 'text',
        defaultValue: 'بكل الحب والتقدير • أبناؤك',
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
      const badge = escapeXml(fields.badge || 'إلى نبع الحنان');
      const headline = escapeXml(fields.headline || 'أمي الغالية');
      const message = escapeXml(fields.message || 'كل عام وأنتِ تاج رؤوسنا ونور بيتنا');
      const signature = escapeXml(fields.signature || 'بكل الحب والتقدير • أبناؤك');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <radialGradient id="ce12-aura" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce12-aura)"/>
  <rect x="28" y="28" width="469" height="684" rx="14" fill="none" stroke="${primaryColor}" stroke-width="1.1" stroke-opacity="0.35" data-color-role="primary"/>
  ${cornerBracketsMarkup(40, 40, 445, 660, 18, secondaryColor, 1.8, 'secondary')}
  <!-- Oval floral medallion -->
  <ellipse cx="262.5" cy="368" rx="188" ry="266" fill="none" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <ellipse cx="262.5" cy="368" rx="176" ry="254" fill="none" stroke="${primaryColor}" stroke-width="0.9" stroke-dasharray="4 5" stroke-opacity="0.45" data-color-role="primary"/>
  <!-- Top & bottom rosebuds with leaves -->
  <circle cx="262.5" cy="102" r="16" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="240" cy="106" r="11" fill="${primaryColor}" fill-opacity="0.72" data-color-role="primary"/>
  <circle cx="285" cy="106" r="11" fill="${primaryColor}" fill-opacity="0.72" data-color-role="primary"/>
  <path d="M 212,118 C 204,104 218,96 228,110 M 313,118 C 321,104 307,96 297,110" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <circle cx="262.5" cy="634" r="13" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="242" cy="630" r="9" fill="${primaryColor}" fill-opacity="0.65" data-color-role="primary"/>
  <circle cx="283" cy="630" r="9" fill="${primaryColor}" fill-opacity="0.65" data-color-role="primary"/>
  ${iconMarkup('heart', 248.5, 174, 28, primaryColor, 'primary')}
  <text data-field-id="badge" data-max-width="275" x="262.5" y="246" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${badge}
  </text>
  <text data-field-id="headline" data-max-width="310" x="262.5" y="330" font-family="${fontFamily}, sans-serif" font-size="${Math.round(50 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${ornamentDivider(262.5, 386, 98, secondaryColor, 'secondary')}
  <text data-field-id="message" data-max-width="300" x="262.5" y="438" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${message}
  </text>
  <rect x="144.5" y="496" width="236" height="38" rx="19" fill="${secondaryColor}" fill-opacity="0.2" stroke="${secondaryColor}" stroke-width="1.2" data-color-role="secondary"/>
  <text data-field-id="signature" data-max-width="206" x="262.5" y="515" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${signature}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_housewarming_blessing',
    name: 'بطاقة مباركة المنزل الجديد',
    nameEn: 'Housewarming Blessing Card',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة تهنئة بالمنزل الجديد بأيقونة منزل أنيقة وزوايا تأطير وأغصان سلام',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#284B3C',
      secondary: '#C69856',
      background: '#F9F7F1',
    },
    fields: [
      { id: 'topTag', label: 'الدعاء العلوي', type: 'text', defaultValue: 'بيت عامر بذكر الله' },
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'منزل مبارك' },
      {
        id: 'wishText',
        label: 'نص التهنئة',
        type: 'text',
        defaultValue: 'جعله الله عتبة خير وسعادة وبركة عليكم',
      },
      { id: 'sender', label: 'التوقيع', type: 'text', defaultValue: 'تمنياتنا بالسعادة • الموصل' },
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
      const topTag = escapeXml(fields.topTag || 'بيت عامر بذكر الله');
      const headline = escapeXml(fields.headline || 'منزل مبارك');
      const wishText = escapeXml(fields.wishText || 'جعله الله عتبة خير وسعادة وبركة عليكم');
      const sender = escapeXml(fields.sender || 'تمنياتنا بالسعادة • الموصل');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <linearGradient id="ce13-grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce13-grad)"/>
  <rect x="24" y="24" width="492" height="312" rx="13" fill="none" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.4" data-color-role="secondary"/>
  ${cornerBracketsMarkup(32, 32, 476, 296, 18, secondaryColor, 2.2, 'secondary')}
  <!-- Minimalist home emblem & flanking peace olive sprigs -->
  <path d="M 234,82 L 270,52 L 306,82" fill="none" stroke="${primaryColor}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary"/>
  <path d="M 244,76 V 104 H 296 V 76" fill="none" stroke="${secondaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-color-role="secondary"/>
  <path d="M 264,104 V 88 H 276 V 104" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 196,94 C 208,90 218,86 226,80 M 344,94 C 332,90 322,86 314,80" fill="none" stroke="${primaryColor}" stroke-width="1.4" stroke-linecap="round" stroke-opacity="0.6" data-color-role="primary"/>
  <ellipse cx="208" cy="83" rx="6" ry="3.5" transform="rotate(-24 208 83)" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <ellipse cx="332" cy="83" rx="6" ry="3.5" transform="rotate(24 332 83)" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <text data-field-id="topTag" data-max-width="320" x="270" y="134" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${topTag}
  </text>
  <text data-field-id="headline" data-max-width="400" x="270" y="190" font-family="${fontFamily}, sans-serif" font-size="${Math.round(42 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${ornamentDivider(270, 232, 92, secondaryColor, 'secondary')}
  <text data-field-id="wishText" data-max-width="420" x="270" y="262" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${wishText}
  </text>
  <text data-field-id="sender" data-max-width="300" x="270" y="302" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${sender}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_new_year_luxury',
    name: 'بطاقة تهنئة العام الجديد الفاخرة',
    nameEn: 'New Year Luxury Countdown Card',
    category: 'seasonal',
    shape: 'rect',
    description: 'بطاقة احتفالية بالعام الجديد بألعاب نارية ذهبية وإطار آرت ديكو وتدرج ليلي فاخر',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#F9FAFB',
      secondary: '#E5C158',
      background: '#121824',
    },
    fields: [
      {
        id: 'topTag',
        label: 'الشعار العلوي',
        type: 'text',
        defaultValue: 'بداية مشرقة وطموح لا ينتهي',
      },
      { id: 'yearNum', label: 'رقم السنة', type: 'text', defaultValue: '2027' },
      {
        id: 'headline',
        label: 'عبارة التهنئة',
        type: 'text',
        defaultValue: 'عام سعيد ومليء بالإنجاز',
      },
      { id: 'footer', label: 'التوقيع', type: 'text', defaultValue: 'مع أطيب الأمنيات • بغداد' },
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
      const topTag = escapeXml(fields.topTag || 'بداية مشرقة وطموح لا ينتهي');
      const yearNum = escapeXml(fields.yearNum || '2027');
      const headline = escapeXml(fields.headline || 'عام سعيد ومليء بالإنجاز');
      const footer = escapeXml(fields.footer || 'مع أطيب الأمنيات • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <linearGradient id="ce14-gala" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="ce14-spark" cx="50%" cy="44%" r="48%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce14-gala)"/>
  <circle cx="262.5" cy="340" r="190" fill="url(#ce14-spark)"/>
  <rect x="30" y="30" width="465" height="680" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1.2" data-color-role="secondary"/>
  ${cornerBracketsMarkup(46, 46, 433, 648, 26, secondaryColor, 2.5, 'secondary')}
  <!-- Vector firework bursts -->
  <path d="${sunRaysPath(128, 152, 10, 44, 14, 0.16)}" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <path d="${sunRaysPath(397, 152, 10, 44, 14, 0.16)}" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <polygon points="${starPoints(262.5, 118, 8, 18, 7)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="topTag" data-max-width="350" x="262.5" y="206" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${topTag}
  </text>
  <text data-field-id="yearNum" data-max-width="360" x="262.5" y="328" font-family="${fontFamily}, sans-serif" font-size="${Math.round(88 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${yearNum}
  </text>
  ${starRowMarkup(262.5, 414, 5, 26, 6.5, primaryColor, 'primary')}
  ${ornamentDivider(262.5, 444, 120, secondaryColor, 'secondary')}
  <text data-field-id="headline" data-max-width="380" x="262.5" y="492" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  <rect x="122.5" y="572" width="280" height="46" rx="23" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="footer" data-max-width="248" x="262.5" y="595" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${footer}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_teacher_appreciation',
    name: 'بطاقة شكر وتقدير للمعلم',
    nameEn: 'Teacher Appreciation Card',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة وفاء وتقدير للمعلمين والأساتذة برمز الكتاب المفتوح ونجوم التفوق',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#1F4068',
      secondary: '#E08E45',
      background: '#FCFBF6',
    },
    fields: [
      { id: 'tag', label: 'الشعار العلوي', type: 'text', defaultValue: 'رسالة وفاء وتقدير' },
      { id: 'headline', label: 'المخاطب', type: 'text', defaultValue: 'شكراً معلمتي الفاضلة' },
      {
        id: 'message',
        label: 'نص التقدير',
        type: 'text',
        defaultValue: 'من علمني حرفاً كنت له ممتناً مدى الحياة',
      },
      { id: 'sender', label: 'التوقيع', type: 'text', defaultValue: 'تلميذك المخلص • كربلاء' },
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
      const tag = escapeXml(fields.tag || 'رسالة وفاء وتقدير');
      const headline = escapeXml(fields.headline || 'شكراً معلمتي الفاضلة');
      const message = escapeXml(fields.message || 'من علمني حرفاً كنت له ممتناً مدى الحياة');
      const sender = escapeXml(fields.sender || 'تلميذك المخلص • كربلاء');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <radialGradient id="ce15-glow" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce15-glow)"/>
  <rect x="28" y="28" width="484" height="304" rx="12" fill="none" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  ${cornerBracketsMarkup(40, 40, 460, 280, 14, secondaryColor, 1.6, 'secondary')}
  <!-- Open book crest -->
  <path d="M 270,64 C 254,54 234,56 224,62 V 96 C 234,90 254,88 270,98 C 286,88 306,90 316,96 V 62 C 306,56 286,54 270,64 Z" fill="${secondaryColor}" fill-opacity="0.28" stroke="${primaryColor}" stroke-width="2.2" stroke-linejoin="round" data-color-role="primary"/>
  <line x1="270" y1="64" x2="270" y2="98" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <path d="M 234,72 H 256 M 234,80 H 256 M 284,72 H 306 M 284,80 H 306" stroke="${secondaryColor}" stroke-width="1.2" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="tag" data-max-width="320" x="270" y="126" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${tag}
  </text>
  <text data-field-id="headline" data-max-width="415" x="270" y="176" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${starRowMarkup(270, 222, 3, 24, 5.5, secondaryColor, 'secondary')}
  <text data-field-id="message" data-max-width="415" x="270" y="260" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${message}
  </text>
  <text data-field-id="sender" data-max-width="300" x="270" y="302" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${sender}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_thank_you_ribbon',
    name: 'بطاقة شكر بشريط ساتان فاخر',
    nameEn: 'Thank You Satin Ribbon Card',
    category: 'greeting',
    shape: 'rect',
    description: 'بطاقة شكر للضيوف والعملاء بشريط ساتان مذهب وإطار كلاسيكي فاخر',
    defaultWidth: 540,
    defaultHeight: 360,
    aspectRatio: 540 / 360,
    defaultMm: { width: 90, height: 60 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 512, height: 332, rx: 18 },
    defaultColors: {
      primary: '#4A233E',
      secondary: '#C99D66',
      background: '#FFFBF7',
    },
    fields: [
      { id: 'tag', label: 'الوسم العلوي', type: 'text', defaultValue: 'من القلب' },
      { id: 'headline', label: 'عبارة الشكر', type: 'text', defaultValue: 'شكراً جزيلاً لكم' },
      {
        id: 'message',
        label: 'التفاصيل',
        type: 'text',
        defaultValue: 'حضوركم ومشاركتكم زادت فرحتنا جمالاً',
      },
      {
        id: 'handle',
        label: 'التواصل / المتجر',
        type: 'text',
        defaultValue: '@BaghdadBoutique.iq • +964 770 123 4567',
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
      const tag = escapeXml(fields.tag || 'من القلب');
      const headline = escapeXml(fields.headline || 'شكراً جزيلاً لكم');
      const message = escapeXml(fields.message || 'حضوركم ومشاركتكم زادت فرحتنا جمالاً');
      const handle = escapeXml(fields.handle || '@BaghdadBoutique.iq • +964 770 123 4567');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360" width="540" height="360">
  <defs>
    <linearGradient id="ce16-silk" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="${secondaryColor}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="14" y="14" width="512" height="332" rx="18" fill="url(#ce16-silk)"/>
  <rect x="28" y="28" width="484" height="304" rx="12" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  ${cornerBracketsMarkup(40, 40, 460, 280, 16, secondaryColor, 2, 'secondary')}
  <!-- Satin ribbon bow & short tails -->
  <path d="M 265,81 L 252,95 M 275,81 L 288,95" stroke="${secondaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="secondary"/>
  <path d="M 270,74 C 242,46 212,60 224,82 C 232,94 256,88 270,78 C 284,88 308,94 316,82 C 328,60 298,46 270,74 Z" fill="${secondaryColor}" fill-opacity="0.38" stroke="${primaryColor}" stroke-width="2" data-color-role="secondary"/>
  <circle cx="270" cy="77" r="6" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="tag" data-max-width="260" x="270" y="118" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${tag}
  </text>
  <text data-field-id="headline" data-max-width="410" x="270" y="168" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  <text data-field-id="message" data-max-width="410" x="270" y="224" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${message}
  </text>
  <rect x="95" y="262" width="350" height="40" rx="20" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="320" x="270" y="282" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_hajj_umrah_welcome',
    name: 'بطاقة تهنئة حج مبرور وعمرة مقبولة',
    nameEn: 'Hajj & Umrah Welcome Card',
    category: 'seasonal',
    shape: 'rect',
    description:
      'بطاقة استقبال الحجاج والمعتمرين بقوس إسلامي مذهب وشعار الكعبة المشرفة وأغصان النخيل',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#1D352B',
      secondary: '#C9A14A',
      background: '#FAF7EE',
    },
    fields: [
      {
        id: 'topTag',
        label: 'التحية العلوية',
        type: 'text',
        defaultValue: 'حمداً لله على سلامتكم',
      },
      { id: 'headline', label: 'التهنئة', type: 'text', defaultValue: 'عمرة مقبولة وحج مبرور' },
      {
        id: 'subLine',
        label: 'الدعاء',
        type: 'text',
        defaultValue: 'تقبل الله طاعتكم وغفر ذنبكم وأجزل مثوبتكم',
      },
      { id: 'family', label: 'المرسل', type: 'text', defaultValue: 'عائلة الحاج كريم • بغداد' },
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
      const topTag = escapeXml(fields.topTag || 'حمداً لله على سلامتكم');
      const headline = escapeXml(fields.headline || 'عمرة مقبولة وحج مبرور');
      const subLine = escapeXml(fields.subLine || 'تقبل الله طاعتكم وغفر ذنبكم وأجزل مثوبتكم');
      const family = escapeXml(fields.family || 'عائلة الحاج كريم • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <radialGradient id="ce17-halo" cx="50%" cy="28%" r="52%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce17-halo)"/>
  <rect x="28" y="28" width="469" height="684" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1" stroke-opacity="0.4" data-color-role="secondary"/>
  ${cornerBracketsMarkup(40, 40, 445, 660, 18, secondaryColor, 1.8, 'secondary')}
  <path d="M 74,654 V 256 C 74,162 164,104 262.5,78 C 361,104 451,162 451,256 V 654 Z" fill="none" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <path d="M 86,642 V 260 C 86,174 170,118 262.5,94 C 355,118 439,174 439,260 V 642 Z" fill="none" stroke="${primaryColor}" stroke-width="0.9" stroke-opacity="0.35" data-color-role="primary"/>
  <!-- Stylized Kaaba icon & palm fronds -->
  <rect x="234.5" y="144" width="56" height="58" rx="4" fill="${primaryColor}" data-color-role="primary"/>
  <rect x="234.5" y="158" width="56" height="9" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="268" y="176" width="12" height="18" rx="2" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${starPoints(262.5, 118, 8, 12, 5)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 196,196 C 204,178 214,164 226,158 M 329,196 C 321,178 311,164 299,158" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.65" data-color-role="primary"/>
  <ellipse cx="206" cy="176" rx="7" ry="3.5" transform="rotate(-35 206 176)" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <ellipse cx="319" cy="176" rx="7" ry="3.5" transform="rotate(35 319 176)" fill="${secondaryColor}" fill-opacity="0.7" data-color-role="secondary"/>
  <text data-field-id="topTag" data-max-width="300" x="262.5" y="252" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${topTag}
  </text>
  <text data-field-id="headline" data-max-width="315" x="262.5" y="328" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${ornamentDivider(262.5, 382, 98, secondaryColor, 'secondary')}
  <text data-field-id="subLine" data-max-width="315" x="262.5" y="436" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${subLine}
  </text>
  <rect x="112.5" y="554" width="300" height="48" rx="24" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="family" data-max-width="268" x="262.5" y="578" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${family}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_wedding_wax_seal',
    name: 'ختم شمعي ملكي للمناسبات',
    nameEn: 'Royal Wax Seal Crest',
    category: 'greeting',
    shape: 'circle',
    description: 'ختم دائري بمظهر الشمع الملكي والأغصان المذهبة لأظرف الدعوات والهدايا',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 65, height: 65 },
    cutShape: { kind: 'circle', cx: 250, cy: 250, r: 232 },
    defaultColors: {
      primary: '#7B1E26',
      secondary: '#D8B268',
      background: '#FAF5EC',
    },
    fields: [
      { id: 'topArc', label: 'العنوان العلوي', type: 'text', defaultValue: 'زفاف مبارك' },
      { id: 'monogram', label: 'الأحرف / الأسماء', type: 'text', defaultValue: 'ح & ز' },
      { id: 'bottomDate', label: 'التاريخ والمدينة', type: 'text', defaultValue: '2026 • بغداد' },
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
      const topArc = escapeXml(fields.topArc || 'زفاف مبارك');
      const monogram = escapeXml(fields.monogram || 'ح & ز');
      const bottomDate = escapeXml(fields.bottomDate || '2026 • بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const waxEdge = scallopCirclePath(250, 250, 198, 22, 1.07);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <radialGradient id="ce18-wax" cx="42%" cy="38%" r="60%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.88"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <circle cx="250" cy="250" r="232" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="${waxEdge}" fill="url(#ce18-wax)" stroke="${secondaryColor}" stroke-width="2.5" data-color-role="secondary"/>
  ${runningStitchCircle(250, 250, 174, secondaryColor, 2.2, '6 6')}
  <circle cx="250" cy="250" r="158" fill="none" stroke="${secondaryColor}" stroke-width="1.3" data-color-role="secondary"/>
  <!-- Top star & gilded laurel sprigs -->
  <polygon points="${starPoints(250, 114, 5, 11, 4.8)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 206,124 C 216,116 226,114 234,114 M 294,124 C 284,116 274,114 266,114" fill="none" stroke="${secondaryColor}" stroke-width="1.4" stroke-linecap="round" data-color-role="secondary"/>
  <ellipse cx="218" cy="116" rx="5.5" ry="3" transform="rotate(-22 218 116)" fill="${secondaryColor}" fill-opacity="0.8" data-color-role="secondary"/>
  <ellipse cx="282" cy="116" rx="5.5" ry="3" transform="rotate(22 282 116)" fill="${secondaryColor}" fill-opacity="0.8" data-color-role="secondary"/>
  <text data-field-id="topArc" data-max-width="220" x="250" y="170" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${topArc}
  </text>
  <text data-field-id="monogram" data-max-width="265" x="250" y="250" font-family="${fontFamily}, sans-serif" font-size="${Math.round(58 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${monogram}
  </text>
  ${ornamentDivider(250, 312, 84, secondaryColor, 'secondary')}
  <text data-field-id="bottomDate" data-max-width="205" x="250" y="344" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${bottomDate}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_evt_kids_first_birthday',
    name: 'ملصق وبطاقة عامي الأول للأطفال',
    nameEn: 'First Birthday Milestone Seal',
    category: 'kids',
    shape: 'circle',
    description: 'ختم دائري مرح بمناسبة إتمام الطفل عامه الأول مع تاج ذهبي وبالونات ونجوم',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 65, height: 65 },
    cutShape: { kind: 'circle', cx: 250, cy: 250, r: 232 },
    defaultColors: {
      primary: '#2B5B84',
      secondary: '#F2A65A',
      background: '#FFFDF7',
    },
    fields: [
      { id: 'topTag', label: 'الشعار العلوي', type: 'text', defaultValue: 'عامي الأول' },
      { id: 'numberBadge', label: 'العمر', type: 'text', defaultValue: '1' },
      { id: 'kidName', label: 'اسم الطفل', type: 'text', defaultValue: 'ليان الحلوة' },
      {
        id: 'dateLine',
        label: 'التاريخ والمدينة',
        type: 'text',
        defaultValue: 'تشرين الثاني 2026 • أربيل',
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
      const topTag = escapeXml(fields.topTag || 'عامي الأول');
      const numberBadge = escapeXml(fields.numberBadge || '1');
      const kidName = escapeXml(fields.kidName || 'ليان الحلوة');
      const dateLine = escapeXml(fields.dateLine || 'تشرين الثاني 2026 • أربيل');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const rim = scallopCirclePath(250, 250, 206, 20, 1.07);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <radialGradient id="ce19-sun" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="250" cy="250" r="232" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="${rim}" fill="url(#ce19-sun)" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  ${runningStitchCircle(250, 250, 186, secondaryColor, 2.2, '7 6')}
  <!-- Little crown vector -->
  <path d="M 218,124 L 226,92 L 244,108 L 250,86 L 256,108 L 274,92 L 282,124 Z" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="1.8" stroke-linejoin="round" data-color-role="secondary"/>
  <text data-field-id="topTag" data-max-width="230" x="250" y="154" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${topTag}
  </text>
  <circle cx="250" cy="236" r="46" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="250" cy="236" r="40" fill="none" stroke="${backgroundColor}" stroke-width="1.3" stroke-opacity="0.7"/>
  <text data-field-id="numberBadge" data-max-width="68" x="250" y="236" font-family="${fontFamily}, sans-serif" font-size="${Math.round(54 * fs)}" font-weight="900" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" dominant-baseline="central">
    ${numberBadge}
  </text>
  <text data-field-id="kidName" data-max-width="270" x="250" y="316" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${kidName}
  </text>
  <text data-field-id="dateLine" data-max-width="240" x="250" y="362" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${dateLine}
  </text>
  ${starRowMarkup(250, 398, 3, 22, 6, secondaryColor, 'secondary')}
</svg>`;
    },
  },
  {
    id: 'card_evt_henna_night_arch',
    name: 'دعوة ليلة الحنة بقوس تراثي',
    nameEn: 'Laylat Al-Hena Heritage Arch Card',
    category: 'greeting',
    shape: 'rect',
    description: 'دعوة ليلة الحنة العراقية بقوس تراثي مفصص وزخارف نباتية وفوانيس جانبية مذهبة',
    defaultWidth: 525,
    defaultHeight: 740,
    aspectRatio: 525 / 740,
    defaultMm: { width: 105, height: 148 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 497, height: 712, rx: 20 },
    defaultColors: {
      primary: '#5E1728',
      secondary: '#D4A24E',
      background: '#FDF6EC',
    },
    fields: [
      {
        id: 'topTag',
        label: 'التحية العلوية',
        type: 'text',
        defaultValue: 'أهلاً بالأحبة في ليلة الفرح',
      },
      { id: 'headline', label: 'العنوان', type: 'text', defaultValue: 'ليلة الحنة' },
      { id: 'brideName', label: 'اسم العروس', type: 'text', defaultValue: 'العروس الجميلة مريم' },
      {
        id: 'details',
        label: 'الموعد والمكان',
        type: 'text',
        defaultValue: 'الخميس 8:00 مساءً • الكرادة، بغداد',
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
      const topTag = escapeXml(fields.topTag || 'أهلاً بالأحبة في ليلة الفرح');
      const headline = escapeXml(fields.headline || 'ليلة الحنة');
      const brideName = escapeXml(fields.brideName || 'العروس الجميلة مريم');
      const details = escapeXml(fields.details || 'الخميس 8:00 مساءً • الكرادة، بغداد');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 525 740" width="525" height="740">
  <defs>
    <radialGradient id="ce20-hena" cx="50%" cy="38%" r="54%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2.2" data-color-role="background"/>
  <rect x="14" y="14" width="497" height="712" rx="20" fill="url(#ce20-hena)"/>
  <rect x="28" y="28" width="469" height="684" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  ${cornerBracketsMarkup(42, 42, 441, 656, 20, primaryColor, 2, 'primary')}
  <!-- Heritage Baghdadi cusped arch -->
  <path d="M 76,650 V 252 Q 76,204 114,192 Q 124,152 162,146 Q 178,108 218,108 Q 238,82 262.5,72 Q 287,82 307,108 Q 347,108 363,146 Q 401,152 411,192 Q 449,204 449,252 V 650 Z" fill="${primaryColor}" fill-opacity="0.06" stroke="${secondaryColor}" stroke-width="2.2" data-color-role="secondary"/>
  <!-- Hanging decorative drops (above topTag safe zone) -->
  <line x1="146" y1="168" x2="146" y2="218" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <circle cx="146" cy="224" r="6" fill="${primaryColor}" data-color-role="primary"/>
  <line x1="379" y1="168" x2="379" y2="218" stroke="${secondaryColor}" stroke-width="1.4" data-color-role="secondary"/>
  <circle cx="379" cy="224" r="6" fill="${primaryColor}" data-color-role="primary"/>
  <polygon points="${starPoints(262.5, 134, 8, 16, 7)}" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="topTag" data-max-width="310" x="262.5" y="266" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="secondary">
    ${topTag}
  </text>
  <text data-field-id="headline" data-max-width="325" x="262.5" y="346" font-family="${fontFamily}, sans-serif" font-size="${Math.round(56 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${headline}
  </text>
  ${ornamentDivider(262.5, 414, 98, secondaryColor, 'secondary')}
  <text data-field-id="brideName" data-max-width="325" x="262.5" y="464" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central" data-color-role="primary">
    ${brideName}
  </text>
  <rect x="92.5" y="536" width="340" height="48" rx="24" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="details" data-max-width="304" x="262.5" y="560" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="rtl" unicode-bidi="embed" dominant-baseline="central">
    ${details}
  </text>
  <polygon points="${starPoints(262.5, 616, 8, 10, 4.5)}" fill="${secondaryColor}" fill-opacity="0.75" data-color-role="secondary"/>
</svg>`;
    },
  },
];
