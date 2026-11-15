import { cornerBracketsMarkup, iconMarkup, starRowMarkup } from './svg-elements';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

/** حاوية أيقونة موحدة التمركز رأسياً على المحور cy لضمان محاذاة دقيقة مع النص */
function iconBadge(
  name: string,
  cx: number,
  cy: number,
  color: string,
  colorRole?: string,
  options?: {
    boxSize?: number;
    iconSize?: number;
    fill?: string;
    fillOpacity?: number;
    strokeOpacity?: number;
  },
): string {
  const boxSize = options?.boxSize ?? 26;
  const iconSize = options?.iconSize ?? 14;
  const fill = options?.fill ?? color;
  const fillOpacity = options?.fillOpacity ?? 0.12;
  const strokeOpacity = options?.strokeOpacity ?? 0.24;
  const role = colorRole ? ` data-color-role="${colorRole}"` : '';
  const halfBox = boxSize / 2;
  const halfIcon = iconSize / 2;

  return (
    `<rect x="${cx - halfBox}" y="${cy - halfBox}" width="${boxSize}" height="${boxSize}" rx="7" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-opacity="${strokeOpacity}" stroke-width="1"${role}/>` +
    iconMarkup(name, cx - halfIcon, cy - halfIcon, iconSize, color, colorRole)
  );
}

/** حاوية أيقونة الكرة الأرضية للموقع والبريد متمركزة تماماً عند (cx, cy) */
function globeBadge(
  cx: number,
  cy: number,
  color: string,
  colorRole?: string,
  options?: { boxSize?: number; fill?: string; fillOpacity?: number; strokeOpacity?: number },
): string {
  const boxSize = options?.boxSize ?? 26;
  const fill = options?.fill ?? color;
  const fillOpacity = options?.fillOpacity ?? 0.12;
  const strokeOpacity = options?.strokeOpacity ?? 0.24;
  const role = colorRole ? ` data-color-role="${colorRole}"` : '';
  const halfBox = boxSize / 2;

  return (
    `<rect x="${cx - halfBox}" y="${cy - halfBox}" width="${boxSize}" height="${boxSize}" rx="7" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-opacity="${strokeOpacity}" stroke-width="1"${role}/>` +
    `<g fill="none" stroke="${color}"${role}>` +
    `<circle cx="${cx}" cy="${cy}" r="6.5" stroke-width="1.5"/>` +
    `<path d="M ${cx - 6.5},${cy} H ${cx + 6.5} M ${cx},${cy - 6.5} A 3.4,6.5 0 0,1 ${cx},${cy + 6.5} M ${cx},${cy - 6.5} A 3.4,6.5 0 0,0 ${cx},${cy + 6.5}" stroke-width="1.15"/>` +
    `</g>`
  );
}

/** حاوية أيقونة البريد الإلكتروني متمركزة تماماً عند (cx, cy) */
function mailBadge(
  cx: number,
  cy: number,
  color: string,
  colorRole?: string,
  options?: { boxSize?: number; fill?: string; fillOpacity?: number; strokeOpacity?: number },
): string {
  const boxSize = options?.boxSize ?? 26;
  const fill = options?.fill ?? color;
  const fillOpacity = options?.fillOpacity ?? 0.12;
  const strokeOpacity = options?.strokeOpacity ?? 0.24;
  const role = colorRole ? ` data-color-role="${colorRole}"` : '';
  const halfBox = boxSize / 2;

  return (
    `<rect x="${cx - halfBox}" y="${cy - halfBox}" width="${boxSize}" height="${boxSize}" rx="7" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-opacity="${strokeOpacity}" stroke-width="1"${role}/>` +
    `<g fill="none" stroke="${color}" stroke-linecap="round" stroke-linejoin="round"${role}>` +
    `<rect x="${cx - 7}" y="${cy - 5}" width="14" height="10" rx="2" stroke-width="1.5"/>` +
    `<path d="M ${cx - 6.5},${cy - 4} L ${cx},${cy + 1} L ${cx + 6.5},${cy - 4}" stroke-width="1.4"/>` +
    `</g>`
  );
}

export const BUSINESS_CARDS: StickerTemplate[] = [
  {
    id: 'card_biz_corporate_split',
    name: 'بطاقة شركة مقسمة احترافية',
    nameEn: 'Corporate Dual-Split Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة أعمال عصرية بتصميم ثنائي اللون مع لوحة هوية جانبية وأيقونات تواصل واضحة',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#0284C7',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'company', label: 'اسم الشركة', type: 'text', defaultValue: 'مجموعة النخيل' },
      { id: 'tagline', label: 'التخصص', type: 'text', defaultValue: 'للتجارة والمقاولات' },
      { id: 'personName', label: 'الاسم الكامل', type: 'text', defaultValue: 'عمر عبد الكريم' },
      { id: 'jobTitle', label: 'المنصب الوظيفي', type: 'text', defaultValue: 'المدير التنفيذي' },
      { id: 'phone', label: 'رقم الهاتف', type: 'text', defaultValue: '+964 770 412 8890' },
      { id: 'email', label: 'البريد والموقع', type: 'text', defaultValue: 'info@alnakheel.iq' },
      { id: 'address', label: 'العنوان', type: 'text', defaultValue: 'بغداد - الكرادة الشرقية' },
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
      const company = escapeXml(fields.company || 'مجموعة النخيل');
      const tagline = escapeXml(fields.tagline || 'للتجارة والمقاولات');
      const personName = escapeXml(fields.personName || 'عمر عبد الكريم');
      const jobTitle = escapeXml(fields.jobTitle || 'المدير التنفيذي');
      const phone = escapeXml(fields.phone || '+964 770 412 8890');
      const email = escapeXml(fields.email || 'info@alnakheel.iq');
      const address = escapeXml(fields.address || 'بغداد - الكرادة الشرقية');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb01-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cb01-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb01-clip)">
    <path d="M 332,10 H 530 V 320 H 304 Z" fill="url(#cb01-g)" data-color-role="primary"/>
    <path d="M 326,10 H 332 L 304,320 H 298 Z" fill="${secondaryColor}" opacity="0.35"/>
    <circle cx="495" cy="55" r="74" fill="${backgroundColor}" opacity="0.08"/>
    <circle cx="345" cy="298" r="56" fill="${backgroundColor}" opacity="0.07"/>
  </g>
  <rect x="24" y="24" width="268" height="282" rx="10" fill="none" stroke="${primaryColor}" stroke-opacity="0.1" stroke-width="1"/>
  ${cornerBracketsMarkup(24, 24, 268, 282, 12, secondaryColor, 1.8, 'secondary')}
  <g transform="translate(398, 56)" fill="none" stroke="${backgroundColor}" stroke-width="2.5" stroke-linejoin="round">
    <polygon points="26,0 52,14 52,42 26,56 0,42 0,14" fill="${backgroundColor}" fill-opacity="0.14"/>
    <path d="M 0,14 L 26,28 L 52,14 M 26,28 V 56"/>
  </g>
  <text data-field-id="company" data-max-width="176" x="424" y="152" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${company}
  </text>
  <rect x="342" y="182" width="164" height="30" rx="15" fill="${backgroundColor}" fill-opacity="0.16" stroke="${backgroundColor}" stroke-opacity="0.26" stroke-width="1"/>
  <text data-field-id="tagline" data-max-width="144" x="424" y="197" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="600" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${tagline}
  </text>
  <text data-field-id="personName" data-max-width="224" x="276" y="68" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="primary">
    ${personName}
  </text>
  <rect x="128" y="96" width="148" height="28" rx="14" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1" data-color-role="secondary"/>
  <text data-field-id="jobTitle" data-max-width="130" x="202" y="110" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${jobTitle}
  </text>
  <line x1="44" y1="142" x2="276" y2="142" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1.5"/>
  ${iconBadge('phone', 262, 170, secondaryColor, 'secondary')}
  <text data-field-id="phone" data-max-width="190" x="240" y="170" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${globeBadge(262, 208, secondaryColor, 'secondary')}
  <text data-field-id="email" data-max-width="190" x="240" y="208" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${email}
  </text>
  ${iconBadge('pin', 262, 246, secondaryColor, 'secondary')}
  <text data-field-id="address" data-max-width="190" x="240" y="246" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${address}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_exec_dark_gold',
    name: 'بطاقة تنفيذية فاخرة أسود وذهبي',
    nameEn: 'Executive Dark-Gold Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة كبار الشخصيات والمدراء التنفيذيين بخلفية داكنة وزوايا ذهبية لامعة',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 14 },
    defaultColors: {
      primary: '#D4AF37',
      secondary: '#F8FAFC',
      background: '#0F172A',
    },
    fields: [
      { id: 'brand', label: 'اسم المؤسسة', type: 'text', defaultValue: 'دجلة القابضة' },
      { id: 'personName', label: 'الاسم التنفيذي', type: 'text', defaultValue: 'طارق الهاشمي' },
      { id: 'role', label: 'الصفة الرسمية', type: 'text', defaultValue: 'رئيس مجلس الإدارة' },
      { id: 'phone', label: 'الهاتف المباشر', type: 'text', defaultValue: '+964 780 115 0099' },
      {
        id: 'website',
        label: 'الموقع الإلكتروني',
        type: 'text',
        defaultValue: 'www.dijlah-group.iq',
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
      const brand = escapeXml(fields.brand || 'دجلة القابضة');
      const personName = escapeXml(fields.personName || 'طارق الهاشمي');
      const role = escapeXml(fields.role || 'رئيس مجلس الإدارة');
      const phone = escapeXml(fields.phone || '+964 780 115 0099');
      const website = escapeXml(fields.website || 'www.dijlah-group.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb02-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.22"/>
      <stop offset="50%" stop-color="${primaryColor}" stop-opacity="0.03"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.16"/>
    </linearGradient>
    <clipPath id="cb02-clip">
      <rect x="10" y="10" width="520" height="310" rx="14"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb02-clip)">
    <rect x="10" y="10" width="520" height="310" fill="url(#cb02-g)"/>
    <path d="M 10,272 L 155,320 H 10 Z" fill="${primaryColor}" opacity="0.16" data-color-role="primary"/>
    <path d="M 385,10 L 530,68 V 10 Z" fill="${primaryColor}" opacity="0.14"/>
  </g>
  <rect x="24" y="24" width="492" height="282" rx="10" fill="none" stroke="${primaryColor}" stroke-opacity="0.32" stroke-width="1"/>
  ${cornerBracketsMarkup(24, 24, 492, 282, 18, primaryColor, 2.5, 'primary')}
  <g transform="translate(432, 46)">
    <polygon points="24,0 48,20 24,40 0,20" fill="none" stroke="${primaryColor}" stroke-width="2"/>
    <polygon points="24,7 39,20 24,33 9,20" fill="${primaryColor}" fill-opacity="0.25" data-color-role="primary"/>
  </g>
  <text data-field-id="brand" data-max-width="320" x="416" y="66" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${brand}
  </text>
  <text data-field-id="personName" data-max-width="430" x="270" y="144" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="secondary">
    ${personName}
  </text>
  <rect x="150" y="176" width="240" height="32" rx="16" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="role" data-max-width="216" x="270" y="192" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${role}
  </text>
  <line x1="68" y1="230" x2="256" y2="230" stroke="${primaryColor}" stroke-opacity="0.38" stroke-width="1"/>
  <polygon points="270,225 275,230 270,235 265,230" fill="${primaryColor}" opacity="0.7"/>
  <line x1="284" y1="230" x2="472" y2="230" stroke="${primaryColor}" stroke-opacity="0.38" stroke-width="1"/>
  ${iconBadge('phone', 457, 268, primaryColor, 'primary', { fillOpacity: 0.14, strokeOpacity: 0.35 })}
  <text data-field-id="phone" data-max-width="150" x="436" y="268" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${globeBadge(83, 268, primaryColor, 'primary', { fillOpacity: 0.14, strokeOpacity: 0.35 })}
  <text data-field-id="website" data-max-width="150" x="104" y="268" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${website}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_medical_clinic',
    name: 'بطاقة عيادة ومركز طبي',
    nameEn: 'Medical Clinic & Doctor Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة أطباء وعيادات طبية بتصميم نظيف وشعار نبض القلب والصليب الطبي',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#0284C7',
      secondary: '#0F172A',
      background: '#F8FAFC',
    },
    fields: [
      {
        id: 'clinicName',
        label: 'اسم العيادة / المركز',
        type: 'text',
        defaultValue: 'عيادة الشفاء التخصصية',
      },
      { id: 'doctorName', label: 'اسم الطبيب', type: 'text', defaultValue: 'د. زيدون الربيعي' },
      {
        id: 'specialty',
        label: 'الاختصاص',
        type: 'text',
        defaultValue: 'استشاري الأمراض الباطنية',
      },
      {
        id: 'hours',
        label: 'أوقات الدوام',
        type: 'text',
        defaultValue: 'السبت - الخميس: 4:00 م - 9:00 م',
      },
      { id: 'phone', label: 'هاتف الحجز', type: 'text', defaultValue: '+964 771 330 2211' },
      {
        id: 'address',
        label: 'العنوان',
        type: 'text',
        defaultValue: 'بغداد - المنصور - شارع الأميرات',
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
      const clinicName = escapeXml(fields.clinicName || 'عيادة الشفاء التخصصية');
      const doctorName = escapeXml(fields.doctorName || 'د. زيدون الربيعي');
      const specialty = escapeXml(fields.specialty || 'استشاري الأمراض الباطنية');
      const hours = escapeXml(fields.hours || 'السبت - الخميس: 4:00 م - 9:00 م');
      const phone = escapeXml(fields.phone || '+964 771 330 2211');
      const address = escapeXml(fields.address || 'بغداد - المنصور - شارع الأميرات');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb03-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="cb03-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.28" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb03-clip)">
    <path d="M 10,10 H 530 V 94 Q 380,114 250,94 T 10,100 Z" fill="url(#cb03-g)" data-color-role="primary"/>
    <rect x="10" y="296" width="520" height="24" fill="${primaryColor}" fill-opacity="0.1"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.12" stroke-width="1"/>
  <g transform="translate(36, 26)">
    <rect x="0" y="0" width="50" height="50" rx="12" fill="${backgroundColor}" fill-opacity="0.18" stroke="${backgroundColor}" stroke-width="1.8"/>
    <path d="M 21,11 H 29 V 21 H 39 V 29 H 29 V 39 H 21 V 29 H 11 V 21 H 21 Z" fill="${backgroundColor}"/>
  </g>
  <path d="M 102,51 H 126 L 134,35 L 143,65 L 152,41 L 159,51 H 184" fill="none" stroke="${backgroundColor}" stroke-opacity="0.68" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <text data-field-id="clinicName" data-max-width="290" x="498" y="51" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${clinicName}
  </text>
  <text data-field-id="doctorName" data-max-width="450" x="498" y="142" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="secondary">
    ${doctorName}
  </text>
  <rect x="278" y="170" width="220" height="32" rx="16" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="1.2"/>
  <text data-field-id="specialty" data-max-width="198" x="388" y="186" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${specialty}
  </text>
  <text data-field-id="hours" data-max-width="224" x="42" y="186" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${hours}
  </text>
  <line x1="42" y1="218" x2="498" y2="218" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1.5"/>
  ${iconBadge('phone', 485, 254, primaryColor, 'primary')}
  <text data-field-id="phone" data-max-width="175" x="462" y="254" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 250, 254, primaryColor, 'primary')}
  <text data-field-id="address" data-max-width="184" x="228" y="254" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${address}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_law_consulting',
    name: 'بطاقة محاماة واستشارات قانونية',
    nameEn: 'Law & Legal Consulting Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة مكتب محاماة رصينة برمز ميزان العدالة وإطار كلاسيكي متدرج',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 12 },
    defaultColors: {
      primary: '#92400E',
      secondary: '#1C1917',
      background: '#FFFBEB',
    },
    fields: [
      { id: 'firmName', label: 'اسم المكتب', type: 'text', defaultValue: 'مكتب الميزان للمحاماة' },
      {
        id: 'lawyerName',
        label: 'اسم المحامي',
        type: 'text',
        defaultValue: 'المحامي حيدر الجبوري',
      },
      {
        id: 'license',
        label: 'الدرجة القانونية',
        type: 'text',
        defaultValue: 'محامٍ أمام محكمة التمييز',
      },
      { id: 'phone', label: 'رقم الهاتف', type: 'text', defaultValue: '+964 770 890 1122' },
      {
        id: 'address',
        label: 'العنوان',
        type: 'text',
        defaultValue: 'بغداد - الكرادة - ساحة كهرمانة',
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
      const firmName = escapeXml(fields.firmName || 'مكتب الميزان للمحاماة');
      const lawyerName = escapeXml(fields.lawyerName || 'المحامي حيدر الجبوري');
      const license = escapeXml(fields.license || 'محامٍ أمام محكمة التمييز');
      const phone = escapeXml(fields.phone || '+964 770 890 1122');
      const address = escapeXml(fields.address || 'بغداد - الكرادة - ساحة كهرمانة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb04-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="cb04-clip">
      <rect x="10" y="10" width="520" height="310" rx="12"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb04-clip)">
    <rect x="10" y="10" width="28" height="310" fill="url(#cb04-g)" data-color-role="secondary"/>
    <rect x="502" y="10" width="28" height="310" fill="url(#cb04-g)"/>
  </g>
  <rect x="52" y="26" width="436" height="278" rx="8" fill="none" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1"/>
  ${cornerBracketsMarkup(52, 26, 436, 278, 16, primaryColor, 2, 'primary')}
  <g transform="translate(246, 36)" fill="none" stroke="${primaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <path d="M 24,4 V 44 M 12,44 H 36 M 8,14 H 40"/>
    <path d="M 8,14 L 2,28 H 14 Z M 40,14 L 34,28 H 46 Z"/>
    <circle cx="24" cy="4" r="2.5" fill="${primaryColor}"/>
  </g>
  <text data-field-id="firmName" data-max-width="380" x="270" y="104" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${firmName}
  </text>
  <text data-field-id="lawyerName" data-max-width="400" x="270" y="148" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="secondary">
    ${lawyerName}
  </text>
  <rect x="145" y="178" width="250" height="30" rx="15" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="license" data-max-width="224" x="270" y="193" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${license}
  </text>
  <line x1="76" y1="228" x2="464" y2="228" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="1.2"/>
  ${iconBadge('phone', 455, 264, primaryColor, 'primary')}
  <text data-field-id="phone" data-max-width="156" x="434" y="264" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 85, 264, primaryColor, 'primary')}
  <text data-field-id="address" data-max-width="156" x="106" y="264" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${address}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_arch_studio',
    name: 'بطاقة مكتب هندسي ومعماري',
    nameEn: 'Architecture & Engineering Studio Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة استوديو معماري وهندسي بخطوط المخططات ولمسة هندسية قطرية',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 14 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#EA580C',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'studioName',
        label: 'اسم المكتب الهندسي',
        type: 'text',
        defaultValue: 'أركان للتصميم المعماري',
      },
      { id: 'engineerName', label: 'اسم المهندس', type: 'text', defaultValue: 'م. مصطفى النعيمي' },
      { id: 'specialty', label: 'التخصص', type: 'text', defaultValue: 'تصميم معماري وإشراف هندسي' },
      { id: 'phone', label: 'رقم الهاتف', type: 'text', defaultValue: '+964 750 622 4400' },
      { id: 'website', label: 'الموقع الإلكتروني', type: 'text', defaultValue: 'arkan-arch.iq' },
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
      const studioName = escapeXml(fields.studioName || 'أركان للتصميم المعماري');
      const engineerName = escapeXml(fields.engineerName || 'م. مصطفى النعيمي');
      const specialty = escapeXml(fields.specialty || 'تصميم معماري وإشراف هندسي');
      const phone = escapeXml(fields.phone || '+964 750 622 4400');
      const website = escapeXml(fields.website || 'arkan-arch.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb05-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cb05-clip">
      <rect x="10" y="10" width="520" height="310" rx="14"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb05-clip)">
    <g stroke="${primaryColor}" stroke-opacity="0.06" stroke-width="1">
      <path d="M 60,10 V 320 M 120,10 V 320 M 180,10 V 320 M 240,10 V 320 M 300,10 V 320 M 360,10 V 320 M 420,10 V 320 M 480,10 V 320"/>
      <path d="M 10,70 H 530 M 10,130 H 530 M 10,190 H 530 M 10,250 H 530"/>
    </g>
    <path d="M 10,10 H 206 L 138,320 H 10 Z" fill="${primaryColor}" data-color-role="primary"/>
    <path d="M 190,10 H 210 L 142,320 H 122 Z" fill="url(#cb05-g)" data-color-role="secondary"/>
  </g>
  <rect x="24" y="24" width="492" height="282" rx="10" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(56, 62)" fill="none" stroke="${backgroundColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 28,2 L 6,52 M 28,2 L 50,52 M 13,34 H 43"/>
    <circle cx="28" cy="8" r="4" fill="${secondaryColor}" stroke="${backgroundColor}"/>
    <rect x="2" y="52" width="52" height="8" rx="2" fill="${backgroundColor}" fill-opacity="0.22"/>
  </g>
  <text data-field-id="studioName" data-max-width="124" x="82" y="176" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${studioName}
  </text>
  <text data-field-id="engineerName" data-max-width="278" x="498" y="88" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${engineerName}
  </text>
  <rect x="252" y="120" width="246" height="32" rx="6" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.26" stroke-width="1" data-color-role="secondary"/>
  <rect x="494" y="120" width="4" height="32" rx="2" fill="${secondaryColor}"/>
  <text data-field-id="specialty" data-max-width="216" x="482" y="136" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${specialty}
  </text>
  <line x1="210" y1="178" x2="498" y2="178" stroke="${primaryColor}" stroke-opacity="0.16" stroke-width="1.5"/>
  ${iconBadge('phone', 485, 218, secondaryColor, 'secondary')}
  <text data-field-id="phone" data-max-width="240" x="462" y="218" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${globeBadge(485, 258, secondaryColor, 'secondary')}
  <text data-field-id="website" data-max-width="240" x="462" y="258" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${website}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_photo_studio',
    name: 'بطاقة استوديو تصوير فوتوغرافي',
    nameEn: 'Photography Studio Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة مصورين واستوديوهات تصوير بإطار عدسة الكاميرا ومحدد المنظر',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#18181B',
      secondary: '#E11D48',
      background: '#FAFAFA',
    },
    fields: [
      { id: 'studioName', label: 'اسم الاستوديو', type: 'text', defaultValue: 'عدسة بابل' },
      { id: 'photographer', label: 'المصور', type: 'text', defaultValue: 'ليث المعموري' },
      {
        id: 'genre',
        label: 'مجال التصوير',
        type: 'text',
        defaultValue: 'تصوير بورتريه وفعاليات ومنتجات',
      },
      { id: 'handle', label: 'حساب انستغرام', type: 'text', defaultValue: '@BabilLens.iq' },
      { id: 'phone', label: 'للحجز والاستفسار', type: 'text', defaultValue: '+964 772 510 7788' },
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
      const studioName = escapeXml(fields.studioName || 'عدسة بابل');
      const photographer = escapeXml(fields.photographer || 'ليث المعموري');
      const genre = escapeXml(fields.genre || 'تصوير بورتريه وفعاليات ومنتجات');
      const handle = escapeXml(fields.handle || '@BabilLens.iq');
      const phone = escapeXml(fields.phone || '+964 772 510 7788');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <radialGradient id="cb06-rad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cb06-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb06-clip)">
    <rect x="10" y="10" width="188" height="310" fill="${primaryColor}" data-color-role="primary"/>
    <circle cx="104" cy="140" r="88" fill="url(#cb06-rad)"/>
  </g>
  ${cornerBracketsMarkup(26, 26, 156, 278, 14, backgroundColor, 1.8)}
  ${cornerBracketsMarkup(216, 26, 298, 278, 12, primaryColor, 1.4)}
  <g transform="translate(104, 124)">
    <circle cx="0" cy="0" r="46" fill="none" stroke="${backgroundColor}" stroke-width="2.5"/>
    <circle cx="0" cy="0" r="34" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="6 4" data-color-role="secondary"/>
    <circle cx="0" cy="0" r="18" fill="${secondaryColor}" data-color-role="secondary"/>
    <circle cx="-6" cy="-6" r="5" fill="${backgroundColor}" opacity="0.8"/>
    <circle cx="38" cy="-36" r="5" fill="${secondaryColor}"/>
  </g>
  <text data-field-id="studioName" data-max-width="144" x="104" y="224" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${studioName}
  </text>
  <text data-field-id="photographer" data-max-width="268" x="498" y="80" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${photographer}
  </text>
  <text data-field-id="genre" data-max-width="268" x="498" y="118" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="secondary">
    ${genre}
  </text>
  <line x1="230" y1="150" x2="498" y2="150" stroke="${primaryColor}" stroke-opacity="0.16" stroke-width="1.5"/>
  <rect x="238" y="174" width="260" height="40" rx="20" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="handle" data-max-width="226" x="368" y="194" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  ${iconBadge('phone', 485, 254, secondaryColor, 'secondary')}
  <text data-field-id="phone" data-max-width="224" x="462" y="254" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_real_estate',
    name: 'بطاقة شركة عقارات واستثمار',
    nameEn: 'Real Estate Agency Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة مكاتب العقارات والاستثمار العمراني بأيقونة البناية والتفاصيل الأنيقة',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#065F46',
      secondary: '#D97706',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'agency',
        label: 'اسم الشركة العقارية',
        type: 'text',
        defaultValue: 'روابي دجلة العقارية',
      },
      { id: 'agentName', label: 'المستشار العقاري', type: 'text', defaultValue: 'سرمد العاني' },
      {
        id: 'services',
        label: 'الخدمات',
        type: 'text',
        defaultValue: 'بيع • شراء • استثمار سكني وتجاري',
      },
      { id: 'phone', label: 'رقم التواصل', type: 'text', defaultValue: '+964 750 881 9090' },
      { id: 'city', label: 'المقر', type: 'text', defaultValue: 'أربيل - إمباير بيزنس تاور' },
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
      const agency = escapeXml(fields.agency || 'روابي دجلة العقارية');
      const agentName = escapeXml(fields.agentName || 'سرمد العاني');
      const services = escapeXml(fields.services || 'بيع • شراء • استثمار سكني وتجاري');
      const phone = escapeXml(fields.phone || '+964 750 881 9090');
      const city = escapeXml(fields.city || 'أربيل - إمباير بيزنس تاور');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb07-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.86"/>
    </linearGradient>
    <clipPath id="cb07-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb07-clip)">
    <path d="M 10,10 H 530 V 104 L 380,104 L 340,124 H 10 Z" fill="url(#cb07-g)" data-color-role="primary"/>
    <path d="M 380,104 L 530,104 V 112 L 340,124 Z" fill="${secondaryColor}" opacity="0.28"/>
    <rect x="10" y="302" width="520" height="18" fill="${secondaryColor}" data-color-role="secondary"/>
  </g>
  <rect x="22" y="22" width="496" height="270" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(38, 26)" fill="none" stroke="${backgroundColor}" stroke-width="2.2" stroke-linejoin="round">
    <path d="M 4,48 H 58 M 10,48 V 18 L 28,6 L 46,18 V 48"/>
    <path d="M 28,6 V 48 M 36,24 H 54 V 48" stroke="${secondaryColor}" stroke-width="2.2"/>
    <rect x="16" y="24" width="6" height="6" fill="${backgroundColor}"/>
    <rect x="16" y="34" width="6" height="6" fill="${backgroundColor}"/>
  </g>
  <text data-field-id="agency" data-max-width="350" x="498" y="54" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${agency}
  </text>
  <text data-field-id="agentName" data-max-width="446" x="498" y="156" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="primary">
    ${agentName}
  </text>
  <rect x="218" y="184" width="280" height="30" rx="15" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1" data-color-role="secondary"/>
  <text data-field-id="services" data-max-width="256" x="358" y="199" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${services}
  </text>
  ${iconBadge('phone', 485, 252, primaryColor, 'primary')}
  <text data-field-id="phone" data-max-width="180" x="462" y="252" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 247, 252, secondaryColor, 'secondary')}
  <text data-field-id="city" data-max-width="184" x="224" y="252" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${city}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_car_showroom',
    name: 'بطاقة معرض سيارات وتجارة',
    nameEn: 'Car Showroom & Auto Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة معارض السيارات وخدمات المركبات بخطوط سرعة ديناميكية وشعار سيارة رياضي',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 14 },
    defaultColors: {
      primary: '#DC2626',
      secondary: '#0F172A',
      background: '#F8FAFC',
    },
    fields: [
      { id: 'showroom', label: 'اسم المعرض', type: 'text', defaultValue: 'معرض السرعة للسيارات' },
      {
        id: 'tagline',
        label: 'الخدمات',
        type: 'text',
        defaultValue: 'بيع • شراء • استبدال • تقسيط',
      },
      { id: 'manager', label: 'إدارة المعرض', type: 'text', defaultValue: 'بإشراف: علي قاسم' },
      { id: 'phone', label: 'رقم المبيعات', type: 'text', defaultValue: '+964 770 901 3456' },
      { id: 'location', label: 'العنوان', type: 'text', defaultValue: 'بغداد - معارض النهضة' },
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
      const showroom = escapeXml(fields.showroom || 'معرض السرعة للسيارات');
      const tagline = escapeXml(fields.tagline || 'بيع • شراء • استبدال • تقسيط');
      const manager = escapeXml(fields.manager || 'بإشراف: علي قاسم');
      const phone = escapeXml(fields.phone || '+964 770 901 3456');
      const location = escapeXml(fields.location || 'بغداد - معارض النهضة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb08-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}"/>
    </linearGradient>
    <clipPath id="cb08-clip">
      <rect x="10" y="10" width="520" height="310" rx="14"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="14" fill="${bg}" stroke="${secondaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb08-clip)">
    <path d="M 10,10 H 530 V 118 L 410,148 H 10 Z" fill="${secondaryColor}" data-color-role="secondary"/>
    <path d="M 10,130 L 140,10 H 168 L 38,130 Z" fill="${primaryColor}" opacity="0.9" data-color-role="primary"/>
    <path d="M 60,130 L 190,10 H 206 L 76,130 Z" fill="${primaryColor}" opacity="0.45"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="10" fill="none" stroke="${secondaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(46, 36)" fill="none" stroke="${backgroundColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 6,30 L 18,14 H 46 L 62,24 H 74 L 78,34 H 6 Z" fill="${backgroundColor}" fill-opacity="0.14"/>
    <circle cx="22" cy="36" r="7" fill="${primaryColor}" stroke="${backgroundColor}"/>
    <circle cx="60" cy="36" r="7" fill="${primaryColor}" stroke="${backgroundColor}"/>
  </g>
  <text data-field-id="showroom" data-max-width="290" x="498" y="56" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${showroom}
  </text>
  <text data-field-id="tagline" data-max-width="290" x="498" y="92" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" opacity="0.9" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${tagline}
  </text>
  <rect x="284" y="174" width="214" height="34" rx="17" fill="url(#cb08-g)" data-color-role="primary"/>
  <text data-field-id="manager" data-max-width="190" x="391" y="191" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${manager}
  </text>
  <line x1="42" y1="226" x2="498" y2="226" stroke="${secondaryColor}" stroke-opacity="0.14" stroke-width="1.2"/>
  ${iconBadge('phone', 485, 258, primaryColor, 'primary')}
  <text data-field-id="phone" data-max-width="180" x="462" y="258" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 247, 258, secondaryColor, 'secondary')}
  <text data-field-id="location" data-max-width="184" x="224" y="258" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${location}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_salon_vip',
    name: 'بطاقة صالون تجميل وسبا VIP',
    nameEn: 'Salon & Spa VIP Card',
    category: 'beauty',
    shape: 'rect',
    description: 'بطاقة أنثوية ناعمة لصالونات التجميل ومراكز العناية بالبشرة بلمسة ذهبية وردية',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 20 },
    defaultColors: {
      primary: '#9D174D',
      secondary: '#B45309',
      background: '#FFF5F7',
    },
    fields: [
      {
        id: 'salonName',
        label: 'اسم الصالون / المركز',
        type: 'text',
        defaultValue: 'لافيلا بيوتي لاونج',
      },
      {
        id: 'services',
        label: 'الخدمات',
        type: 'text',
        defaultValue: 'عناية بالبشرة • تصفيف • مكياج',
      },
      { id: 'vipTag', label: 'شارة العميلة', type: 'text', defaultValue: 'VIP GUEST PASS' },
      { id: 'phone', label: 'للحجز', type: 'text', defaultValue: '+964 771 605 4433' },
      { id: 'handle', label: 'انستغرام', type: 'text', defaultValue: '@LaVillaBeauty.iq' },
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
      const salonName = escapeXml(fields.salonName || 'لافيلا بيوتي لاونج');
      const services = escapeXml(fields.services || 'عناية بالبشرة • تصفيف • مكياج');
      const vipTag = escapeXml(fields.vipTag || 'VIP GUEST PASS');
      const phone = escapeXml(fields.phone || '+964 771 605 4433');
      const handle = escapeXml(fields.handle || '@LaVillaBeauty.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <radialGradient id="cb09-rad" cx="50%" cy="22%" r="65%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cb09-clip">
      <rect x="10" y="10" width="520" height="310" rx="20"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="20" fill="${bg}" stroke="${secondaryColor}" stroke-opacity="0.45" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb09-clip)">
    <rect x="10" y="10" width="520" height="310" fill="url(#cb09-rad)"/>
    <circle cx="480" cy="40" r="80" fill="${secondaryColor}" opacity="0.08"/>
    <circle cx="60" cy="290" r="70" fill="${primaryColor}" opacity="0.07"/>
  </g>
  <rect x="24" y="24" width="492" height="282" rx="14" fill="none" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1.2"/>
  <circle cx="270" cy="48" r="20" fill="${primaryColor}" fill-opacity="0.08" stroke="${secondaryColor}" stroke-opacity="0.35" stroke-width="1.2"/>
  ${iconMarkup('leaf', 253, 37, 20, primaryColor, 'primary')}
  ${iconMarkup('sparkle', 271, 40, 15, secondaryColor, 'secondary')}
  <rect x="185" y="78" width="170" height="26" rx="13" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="vipTag" data-max-width="150" x="270" y="91" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${vipTag}
  </text>
  <text data-field-id="salonName" data-max-width="440" x="270" y="144" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="primary">
    ${salonName}
  </text>
  <text data-field-id="services" data-max-width="420" x="270" y="184" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${services}
  </text>
  <line x1="90" y1="214" x2="450" y2="214" stroke="${secondaryColor}" stroke-opacity="0.3" stroke-width="1.2"/>
  <rect x="52" y="236" width="206" height="40" rx="20" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="180" x="155" y="256" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <rect x="282" y="236" width="206" height="40" rx="20" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="1.5"/>
  <text data-field-id="phone" data-max-width="180" x="385" y="256" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_it_software',
    name: 'بطاقة شركة تقنية وبرمجيات',
    nameEn: 'IT & Software Solutions Card',
    category: 'social',
    shape: 'rect',
    description: 'بطاقة عصرية لشركات البرمجة والحلول التقنية بخلفية داكنة وتدرج سحابي',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#38BDF8',
      secondary: '#F1F5F9',
      background: '#0F172A',
    },
    fields: [
      {
        id: 'company',
        label: 'اسم الشركة التقنية',
        type: 'text',
        defaultValue: 'كود بغداد للحلول الذكية',
      },
      { id: 'person', label: 'الاسم', type: 'text', defaultValue: 'د. سيف الدين طه' },
      { id: 'role', label: 'التخصص', type: 'text', defaultValue: 'Software Architect & Cloud' },
      { id: 'phone', label: 'الهاتف', type: 'text', defaultValue: '+964 781 200 5544' },
      { id: 'website', label: 'الموقع والبريد', type: 'text', defaultValue: 'dev@baghdadcode.iq' },
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
      const company = escapeXml(fields.company || 'كود بغداد للحلول الذكية');
      const person = escapeXml(fields.person || 'د. سيف الدين طه');
      const role = escapeXml(fields.role || 'Software Architect & Cloud');
      const phone = escapeXml(fields.phone || '+964 781 200 5544');
      const website = escapeXml(fields.website || 'dev@baghdadcode.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb10-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.04"/>
    </linearGradient>
    <clipPath id="cb10-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.45" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb10-clip)">
    <rect x="10" y="10" width="520" height="310" fill="url(#cb10-g)"/>
    <circle cx="96" cy="70" r="95" fill="${primaryColor}" opacity="0.08"/>
    <rect x="10" y="10" width="520" height="8" fill="${primaryColor}" data-color-role="primary"/>
  </g>
  <rect x="24" y="28" width="492" height="278" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.16" stroke-width="1"/>
  <g transform="translate(38, 42)" fill="none" stroke="${primaryColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" data-color-role="primary">
    <rect x="0" y="0" width="54" height="44" rx="10" fill="${primaryColor}" fill-opacity="0.14"/>
    <path d="M 18,15 L 10,22 L 18,29 M 36,15 L 44,22 L 36,29 M 30,12 L 24,32"/>
  </g>
  <text data-field-id="company" data-max-width="350" x="498" y="64" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${company}
  </text>
  <text data-field-id="person" data-max-width="446" x="498" y="136" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="secondary">
    ${person}
  </text>
  <rect x="208" y="166" width="290" height="32" rx="8" fill="${primaryColor}" fill-opacity="0.18" stroke="${primaryColor}" stroke-opacity="0.4" stroke-width="1"/>
  <text data-field-id="role" data-max-width="268" x="353" y="182" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${role}
  </text>
  <line x1="38" y1="216" x2="498" y2="216" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1"/>
  <circle cx="48" cy="260" r="5" fill="${primaryColor}"/>
  <circle cx="66" cy="260" r="5" fill="${primaryColor}" opacity="0.55"/>
  <circle cx="84" cy="260" r="5" fill="${primaryColor}" opacity="0.25"/>
  ${iconBadge('phone', 485, 242, primaryColor, 'primary', { fillOpacity: 0.16, strokeOpacity: 0.35 })}
  <text data-field-id="phone" data-max-width="240" x="462" y="242" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${globeBadge(485, 278, primaryColor, 'primary', { fillOpacity: 0.16, strokeOpacity: 0.35 })}
  <text data-field-id="website" data-max-width="240" x="462" y="278" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${website}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_academy_training',
    name: 'بطاقة معهد ومركز تدريب',
    nameEn: 'Academy & Training Center Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة معاهد التدريب والتطوير والأكاديميات التعليمية بأيقونة التخرج',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#1D4ED8',
      secondary: '#F59E0B',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'academy',
        label: 'اسم الأكاديمية',
        type: 'text',
        defaultValue: 'أكاديمية الرواد للتدريب',
      },
      {
        id: 'programs',
        label: 'البرامج',
        type: 'text',
        defaultValue: 'لغات • برمجة • إدارة مشاريع معتمدة',
      },
      { id: 'director', label: 'مدير التدريب', type: 'text', defaultValue: 'أ. رغد العبيدي' },
      { id: 'phone', label: 'للتسجيل والاستفسار', type: 'text', defaultValue: '+964 770 314 7070' },
      {
        id: 'address',
        label: 'العنوان',
        type: 'text',
        defaultValue: 'بغداد - الجادرية - قرب الجامعة',
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
      const academy = escapeXml(fields.academy || 'أكاديمية الرواد للتدريب');
      const programs = escapeXml(fields.programs || 'لغات • برمجة • إدارة مشاريع معتمدة');
      const director = escapeXml(fields.director || 'أ. رغد العبيدي');
      const phone = escapeXml(fields.phone || '+964 770 314 7070');
      const address = escapeXml(fields.address || 'بغداد - الجادرية - قرب الجامعة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb11-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.82"/>
    </linearGradient>
    <clipPath id="cb11-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb11-clip)">
    <path d="M 10,10 H 530 V 108 C 400,134 160,88 10,116 Z" fill="url(#cb11-g)" data-color-role="primary"/>
    <circle cx="485" cy="28" r="54" fill="${secondaryColor}" opacity="0.22"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(42, 30)" fill="none" stroke="${backgroundColor}" stroke-width="2.2" stroke-linejoin="round">
    <polygon points="30,4 58,18 30,32 2,18" fill="${backgroundColor}" fill-opacity="0.2"/>
    <path d="M 14,25 V 40 C 14,45 46,45 46,40 V 25"/>
    <path d="M 54,20 V 38" stroke="${secondaryColor}" stroke-width="2.5"/>
  </g>
  <text data-field-id="academy" data-max-width="350" x="498" y="56" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${academy}
  </text>
  <text data-field-id="director" data-max-width="446" x="498" y="154" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${director}
  </text>
  <rect x="148" y="182" width="350" height="32" rx="16" fill="${secondaryColor}" fill-opacity="0.16" stroke="${secondaryColor}" stroke-opacity="0.32" stroke-width="1" data-color-role="secondary"/>
  <text data-field-id="programs" data-max-width="324" x="323" y="198" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${programs}
  </text>
  <line x1="42" y1="232" x2="498" y2="232" stroke="${primaryColor}" stroke-opacity="0.18" stroke-width="1.5"/>
  ${iconBadge('phone', 485, 266, secondaryColor, 'secondary')}
  <text data-field-id="phone" data-max-width="180" x="462" y="266" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 249, 266, primaryColor, 'primary')}
  <text data-field-id="address" data-max-width="184" x="226" y="266" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${address}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_vip_membership',
    name: 'بطاقة عضوية VIP ذهبية',
    nameEn: 'VIP Membership Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة عضوية مميزة بمقاس مصرفي 85×55 ملم مع شارة النجوم الذهبية والرقم التسلسلي',
    defaultWidth: 510,
    defaultHeight: 330,
    aspectRatio: 510 / 330,
    defaultMm: { width: 85, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 490, height: 310, rx: 18 },
    defaultColors: {
      primary: '#D97706',
      secondary: '#FEF3C7',
      background: '#18181B',
    },
    fields: [
      { id: 'clubName', label: 'اسم النادي / المتجر', type: 'text', defaultValue: 'نخبة بغداد' },
      { id: 'tier', label: 'مستوى العضوية', type: 'text', defaultValue: 'VIP MEMBERSHIP' },
      { id: 'memberName', label: 'اسم العضو', type: 'text', defaultValue: 'ياسر عبد الرزاق' },
      {
        id: 'perk',
        label: 'الميزة الحصرية',
        type: 'text',
        defaultValue: 'خصم دائم 15% وأولوية الحجز',
      },
      { id: 'memberId', label: 'رقم البطاقة', type: 'text', defaultValue: 'ID: IQ-8840' },
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
      const clubName = escapeXml(fields.clubName || 'نخبة بغداد');
      const tier = escapeXml(fields.tier || 'VIP MEMBERSHIP');
      const memberName = escapeXml(fields.memberName || 'ياسر عبد الرزاق');
      const perk = escapeXml(fields.perk || 'خصم دائم 15% وأولوية الحجز');
      const memberId = escapeXml(fields.memberId || 'ID: IQ-8840');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 330" width="510" height="330">
  <defs>
    <linearGradient id="cb12-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.28"/>
      <stop offset="55%" stop-color="${primaryColor}" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.22"/>
    </linearGradient>
    <clipPath id="cb12-clip">
      <rect x="10" y="10" width="490" height="310" rx="18"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="490" height="310" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb12-clip)">
    <rect x="10" y="10" width="490" height="310" fill="url(#cb12-g)"/>
    <path d="M 320,10 L 500,190 V 10 Z" fill="${primaryColor}" opacity="0.1"/>
  </g>
  <rect x="24" y="24" width="462" height="282" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.28" stroke-width="1"/>
  <g transform="translate(38, 36)" fill="none" stroke="${primaryColor}" stroke-width="2.2" stroke-linejoin="round" data-color-role="primary">
    <path d="M 4,30 L 8,10 L 18,20 L 26,6 L 34,20 L 44,10 L 48,30 Z" fill="${primaryColor}" fill-opacity="0.24"/>
    <rect x="4" y="34" width="44" height="5" rx="2" fill="${primaryColor}"/>
  </g>
  <text data-field-id="clubName" data-max-width="340" x="470" y="45" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="secondary">
    ${clubName}
  </text>
  <text data-field-id="tier" data-max-width="240" x="470" y="83" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${tier}
  </text>
  ${starRowMarkup(255, 126, 5, 28, 9, primaryColor, 'primary')}
  <text data-field-id="memberName" data-max-width="430" x="255" y="172" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${memberName}
  </text>
  <rect x="115" y="202" width="280" height="34" rx="17" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="perk" data-max-width="256" x="255" y="219" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${perk}
  </text>
  <rect x="175" y="258" width="160" height="28" rx="14" fill="${primaryColor}" fill-opacity="0.14" stroke="${primaryColor}" stroke-opacity="0.38" stroke-width="1"/>
  <text data-field-id="memberId" data-max-width="140" x="255" y="272" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${memberId}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_minimal_vertical',
    name: 'بطاقة شخصية عمودية أنيقة',
    nameEn: 'Minimal Vertical Name Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة أعمال طولية (55×90 ملم) بتخطيط معماري نظيف وتدرج علوي هادئ',
    defaultWidth: 330,
    defaultHeight: 540,
    aspectRatio: 330 / 540,
    defaultMm: { width: 55, height: 90 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 310, height: 520, rx: 16 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#0D9488',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'brand', label: 'العلامة التجارية', type: 'text', defaultValue: 'إستوديو رصانة' },
      { id: 'personName', label: 'الاسم الكامل', type: 'text', defaultValue: 'نور الهدى كريم' },
      { id: 'jobTitle', label: 'المسمى الوظيفي', type: 'text', defaultValue: 'مستشارة هوية بصرية' },
      { id: 'phone', label: 'رقم الهاتف', type: 'text', defaultValue: '+964 771 992 1030' },
      { id: 'email', label: 'البريد الإلكتروني', type: 'text', defaultValue: 'noor@rasana.iq' },
      { id: 'city', label: 'المدينة', type: 'text', defaultValue: 'بغداد، العراق' },
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
      const brand = escapeXml(fields.brand || 'إستوديو رصانة');
      const personName = escapeXml(fields.personName || 'نور الهدى كريم');
      const jobTitle = escapeXml(fields.jobTitle || 'مستشارة هوية بصرية');
      const phone = escapeXml(fields.phone || '+964 771 992 1030');
      const email = escapeXml(fields.email || 'noor@rasana.iq');
      const city = escapeXml(fields.city || 'بغداد، العراق');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 330 540" width="330" height="540">
  <defs>
    <linearGradient id="cb13-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cb13-clip">
      <rect x="10" y="10" width="310" height="520" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="310" height="520" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb13-clip)">
    <path d="M 10,10 H 320 V 158 Q 165,198 10,158 Z" fill="url(#cb13-g)" data-color-role="primary"/>
    <rect x="10" y="512" width="310" height="18" fill="${secondaryColor}" data-color-role="secondary"/>
  </g>
  <rect x="22" y="22" width="286" height="482" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <text data-field-id="brand" data-max-width="260" x="165" y="42" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${brand}
  </text>
  <circle cx="165" cy="108" r="38" fill="${backgroundColor}" fill-opacity="0.16" stroke="${backgroundColor}" stroke-width="2"/>
  <polygon points="165,82 188,108 165,134 142,108" fill="none" stroke="${backgroundColor}" stroke-width="2.4"/>
  <text data-field-id="personName" data-max-width="270" x="165" y="228" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="primary">
    ${personName}
  </text>
  <rect x="55" y="254" width="220" height="32" rx="16" fill="${secondaryColor}" fill-opacity="0.14" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1" data-color-role="secondary"/>
  <text data-field-id="jobTitle" data-max-width="200" x="165" y="270" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${jobTitle}
  </text>
  <line x1="60" y1="310" x2="270" y2="310" stroke="${primaryColor}" stroke-opacity="0.16" stroke-width="1.5"/>
  ${iconBadge('phone', 165, 340, secondaryColor, 'secondary', { boxSize: 28, iconSize: 15 })}
  <text data-field-id="phone" data-max-width="250" x="165" y="372" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  <text data-field-id="email" data-max-width="250" x="165" y="406" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${email}
  </text>
  ${iconBadge('pin', 165, 442, primaryColor, 'primary', { boxSize: 28, iconSize: 15 })}
  <text data-field-id="city" data-max-width="250" x="165" y="474" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${city}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_appointment_clinic',
    name: 'بطاقة تذكير بالموعد القادم',
    nameEn: 'Appointment Reminder Card',
    category: 'beauty',
    shape: 'rect',
    description: 'بطاقة عملية للعيادات ومراكز التجميل لتدوين تاريخ ووقت الموعد القادم للعميل',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#0F766E',
      secondary: '#334155',
      background: '#F0FDFA',
    },
    fields: [
      { id: 'centerName', label: 'اسم المركز', type: 'text', defaultValue: 'مركز النور التخصصي' },
      {
        id: 'heading',
        label: 'عنوان البطاقة',
        type: 'text',
        defaultValue: 'بطاقة تذكير بموعدك القادم',
      },
      {
        id: 'dateLabel',
        label: 'خانة التاريخ',
        type: 'text',
        defaultValue: 'التاريخ: .... / .... / 2026',
      },
      {
        id: 'timeLabel',
        label: 'خانة الوقت',
        type: 'text',
        defaultValue: 'الساعة: ........ صباحاً / مساءً',
      },
      {
        id: 'phone',
        label: 'هاتف التأكيد',
        type: 'text',
        defaultValue: 'للتأكيد: +964 770 223 9988',
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
      const centerName = escapeXml(fields.centerName || 'مركز النور التخصصي');
      const heading = escapeXml(fields.heading || 'بطاقة تذكير بموعدك القادم');
      const dateLabel = escapeXml(fields.dateLabel || 'التاريخ: .... / .... / 2026');
      const timeLabel = escapeXml(fields.timeLabel || 'الساعة: ........ صباحاً / مساءً');
      const phone = escapeXml(fields.phone || 'للتأكيد: +964 770 223 9988');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb14-g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cb14-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb14-clip)">
    <rect x="10" y="10" width="520" height="84" fill="url(#cb14-g)" data-color-role="primary"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(36, 28)" fill="none" stroke="${backgroundColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="0" y="6" width="44" height="40" rx="6" fill="${backgroundColor}" fill-opacity="0.16"/>
    <path d="M 0,18 H 44 M 12,0 V 10 M 32,0 V 10"/>
    <circle cx="22" cy="31" r="7"/>
    <path d="M 22,27 V 31 L 25,33"/>
  </g>
  <text data-field-id="centerName" data-max-width="360" x="498" y="34" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${centerName}
  </text>
  <text data-field-id="heading" data-max-width="360" x="498" y="70" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${backgroundColor}" opacity="0.9" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${heading}
  </text>
  <rect x="42" y="116" width="456" height="50" rx="12" fill="${backgroundColor}" stroke="${primaryColor}" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="6 4"/>
  <rect x="486" y="126" width="4" height="30" rx="2" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="dateLabel" data-max-width="416" x="474" y="141" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="secondary">
    ${dateLabel}
  </text>
  <rect x="42" y="180" width="456" height="50" rx="12" fill="${backgroundColor}" stroke="${primaryColor}" stroke-opacity="0.45" stroke-width="1.5" stroke-dasharray="6 4"/>
  <rect x="486" y="190" width="4" height="30" rx="2" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="timeLabel" data-max-width="416" x="474" y="205" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${timeLabel}
  </text>
  <rect x="95" y="250" width="350" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="phone" data-max-width="318" x="270" y="271" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_dental_care',
    name: 'بطاقة مركز أسنان وتجميل',
    nameEn: 'Dental Clinic & Smile Studio Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة عيادات طب وتجميل الأسنان بشعار السن البراق وتدرج سماوي مشرق',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#0EA5E9',
      secondary: '#0369A1',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'clinic',
        label: 'اسم العيادة',
        type: 'text',
        defaultValue: 'عيادة اللؤلؤة لطب الأسنان',
      },
      { id: 'doctor', label: 'الطبيب', type: 'text', defaultValue: 'د. مريم السامرائي' },
      {
        id: 'services',
        label: 'الخدمات',
        type: 'text',
        defaultValue: 'تجميل الابتسامة • تقويم • زراعة الأسنان',
      },
      { id: 'phone', label: 'رقم الحجز', type: 'text', defaultValue: '+964 780 554 1234' },
      { id: 'address', label: 'الموقع', type: 'text', defaultValue: 'البصرة - شارع الجزائر' },
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
      const clinic = escapeXml(fields.clinic || 'عيادة اللؤلؤة لطب الأسنان');
      const doctor = escapeXml(fields.doctor || 'د. مريم السامرائي');
      const services = escapeXml(fields.services || 'تجميل الابتسامة • تقويم • زراعة الأسنان');
      const phone = escapeXml(fields.phone || '+964 780 554 1234');
      const address = escapeXml(fields.address || 'البصرة - شارع الجزائر');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <radialGradient id="cb15-rad" cx="22%" cy="45%" r="48%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="cb15-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb15-clip)">
    <rect x="10" y="10" width="520" height="310" fill="url(#cb15-rad)"/>
    <path d="M 10,254 Q 160,236 310,258 T 530,248 V 320 H 10 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(52, 74)">
    <circle cx="48" cy="48" r="46" fill="${primaryColor}" fill-opacity="0.12" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
    <path d="M 32,28 C 24,28 22,38 24,48 C 26,60 30,72 36,72 C 40,72 42,58 48,58 C 54,58 56,72 60,72 C 66,72 70,60 72,48 C 74,38 72,28 64,28 C 56,28 53,33 48,33 C 43,33 40,28 32,28 Z" fill="${primaryColor}" data-color-role="primary"/>
    ${iconMarkup('sparkle', 64, 14, 22, secondaryColor, 'secondary')}
  </g>
  <text data-field-id="clinic" data-max-width="320" x="498" y="68" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${clinic}
  </text>
  <text data-field-id="doctor" data-max-width="320" x="498" y="118" font-family="${fontFamily}, sans-serif" font-size="${Math.round(27 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${doctor}
  </text>
  <rect x="198" y="150" width="300" height="32" rx="16" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-opacity="0.25" stroke-width="1" data-color-role="primary"/>
  <text data-field-id="services" data-max-width="276" x="348" y="166" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${services}
  </text>
  ${iconBadge('phone', 485, 290, backgroundColor, undefined, { fill: backgroundColor, fillOpacity: 0.18, strokeOpacity: 0.35 })}
  <text data-field-id="phone" data-max-width="190" x="464" y="290" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 55, 290, backgroundColor, undefined, { fill: backgroundColor, fillOpacity: 0.18, strokeOpacity: 0.35 })}
  <text data-field-id="address" data-max-width="184" x="76" y="290" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="end" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${address}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_interior_design',
    name: 'بطاقة مربعة لتصميم الديكور',
    nameEn: 'Interior Design Square Card',
    category: 'retail',
    shape: 'square',
    description: 'بطاقة مربعة (70×70 ملم) لمصممي الديكور والأثاث الراقي بأسلوب تحريري هادئ',
    defaultWidth: 420,
    defaultHeight: 420,
    aspectRatio: 1,
    defaultMm: { width: 70, height: 70 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 396, height: 396, rx: 22 },
    defaultColors: {
      primary: '#44403C',
      secondary: '#B45309',
      background: '#FAF7F2',
    },
    fields: [
      { id: 'studio', label: 'اسم الاستوديو', type: 'text', defaultValue: 'دار الفنون للديكور' },
      { id: 'designer', label: 'المصممة', type: 'text', defaultValue: 'تبارك الزبيدي' },
      { id: 'tagline', label: 'الوصف', type: 'text', defaultValue: 'تصميم داخلي وتنفيذ متكامل' },
      { id: 'phone', label: 'رقم التواصل', type: 'text', defaultValue: '+964 771 450 8822' },
      { id: 'handle', label: 'انستغرام', type: 'text', defaultValue: '@DarAlfunoon.iq' },
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
      const studio = escapeXml(fields.studio || 'دار الفنون للديكور');
      const designer = escapeXml(fields.designer || 'تبارك الزبيدي');
      const tagline = escapeXml(fields.tagline || 'تصميم داخلي وتنفيذ متكامل');
      const phone = escapeXml(fields.phone || '+964 771 450 8822');
      const handle = escapeXml(fields.handle || '@DarAlfunoon.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 420" width="420" height="420">
  <defs>
    <linearGradient id="cb16-g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </linearGradient>
    <clipPath id="cb16-clip">
      <rect x="12" y="12" width="396" height="396" rx="22"/>
    </clipPath>
  </defs>
  <rect x="12" y="12" width="396" height="396" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.35" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb16-clip)">
    <rect x="12" y="12" width="396" height="170" fill="url(#cb16-g)"/>
    <rect x="12" y="346" width="396" height="62" fill="${primaryColor}" data-color-role="primary"/>
  </g>
  <rect x="28" y="28" width="364" height="304" rx="14" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  ${cornerBracketsMarkup(28, 28, 364, 304, 14, secondaryColor, 2, 'secondary')}
  <g transform="translate(178, 42)" fill="none" stroke="${secondaryColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" data-color-role="secondary">
    <path d="M 32,0 V 14"/>
    <path d="M 10,38 C 10,20 54,20 54,38 Z" fill="${secondaryColor}" fill-opacity="0.18"/>
    <path d="M 26,38 A 6,6 0 0,0 38,38"/>
    <path d="M 8,54 H 56" stroke="${primaryColor}" stroke-width="2"/>
  </g>
  <text data-field-id="studio" data-max-width="330" x="210" y="134" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${studio}
  </text>
  <text data-field-id="designer" data-max-width="320" x="210" y="186" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${designer}
  </text>
  <rect x="85" y="218" width="250" height="32" rx="16" fill="${secondaryColor}" fill-opacity="0.12" stroke="${secondaryColor}" stroke-opacity="0.26" stroke-width="1"/>
  <text data-field-id="tagline" data-max-width="230" x="210" y="234" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${tagline}
  </text>
  <line x1="120" y1="268" x2="300" y2="268" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1.2"/>
  <text data-field-id="phone" data-max-width="280" x="210" y="294" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  <text data-field-id="handle" data-max-width="320" x="210" y="377" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_bakery_catering',
    name: 'بطاقة مطعم ومخبز وضيافة',
    nameEn: 'Restaurant & Catering Card',
    category: 'retail',
    shape: 'rect',
    description: 'بطاقة دافئة للمطاعم والمخابز وشركات الضيافة بأيقونة طبق التقديم ومعلومات الطلب',
    defaultWidth: 510,
    defaultHeight: 330,
    aspectRatio: 510 / 330,
    defaultMm: { width: 85, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 490, height: 310, rx: 18 },
    defaultColors: {
      primary: '#7C2D12',
      secondary: '#D97706',
      background: '#FFFBEB',
    },
    fields: [
      {
        id: 'brand',
        label: 'اسم المطعم / المخبز',
        type: 'text',
        defaultValue: 'مطبخ الرشيد للضيافة',
      },
      {
        id: 'specialty',
        label: 'التخصص',
        type: 'text',
        defaultValue: 'ولائم • معجنات طازجة • تموين شركات',
      },
      { id: 'phone', label: 'هاتف الطلبات', type: 'text', defaultValue: '+964 780 712 3344' },
      { id: 'handle', label: 'انستغرام', type: 'text', defaultValue: '@AlRasheedKitchen.iq' },
      {
        id: 'address',
        label: 'الفرع الرئيسي',
        type: 'text',
        defaultValue: 'بغداد - المنصور - 14 رمضان',
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
      const brand = escapeXml(fields.brand || 'مطبخ الرشيد للضيافة');
      const specialty = escapeXml(fields.specialty || 'ولائم • معجنات طازجة • تموين شركات');
      const phone = escapeXml(fields.phone || '+964 780 712 3344');
      const handle = escapeXml(fields.handle || '@AlRasheedKitchen.iq');
      const address = escapeXml(fields.address || 'بغداد - المنصور - 14 رمضان');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 510 330" width="510" height="330">
  <defs>
    <linearGradient id="cb17-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cb17-clip">
      <rect x="10" y="10" width="490" height="310" rx="18"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="490" height="310" rx="18" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb17-clip)">
    <path d="M 10,10 H 165 Q 200,165 165,320 H 10 Z" fill="url(#cb17-g)" data-color-role="primary"/>
    <circle cx="90" cy="124" r="44" fill="${backgroundColor}" fill-opacity="0.16" stroke="${backgroundColor}" stroke-width="1.8"/>
  </g>
  <rect x="22" y="22" width="466" height="286" rx="14" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(62, 98)" fill="none" stroke="${backgroundColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 6,36 H 50 M 10,36 C 10,20 46,20 46,36"/>
    <circle cx="28" cy="18" r="3.5" fill="${backgroundColor}"/>
    <path d="M 4,42 H 52"/>
  </g>
  <text data-field-id="handle" data-max-width="136" x="90" y="212" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <text data-field-id="brand" data-max-width="268" x="474" y="78" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${brand}
  </text>
  <rect x="204" y="106" width="270" height="32" rx="16" fill="${secondaryColor}" fill-opacity="0.15" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1" data-color-role="secondary"/>
  <text data-field-id="specialty" data-max-width="246" x="339" y="122" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${specialty}
  </text>
  <line x1="204" y1="160" x2="474" y2="160" stroke="${secondaryColor}" stroke-opacity="0.3" stroke-width="1.5"/>
  ${iconBadge('phone', 461, 196, secondaryColor, 'secondary')}
  <text data-field-id="phone" data-max-width="226" x="438" y="196" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 461, 244, primaryColor, 'primary')}
  <text data-field-id="address" data-max-width="226" x="438" y="244" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${address}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_freelance_creative',
    name: 'بطاقة مصمم ومبدع مستقل',
    nameEn: 'Creative Designer Portfolio Card',
    category: 'social',
    shape: 'rect',
    description:
      'بطاقة جريئة للمصممين المستقلين وصناع المحتوى بأشكال هندسية متداخلة ورمز أداة القلم',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 16 },
    defaultColors: {
      primary: '#6D28D9',
      secondary: '#EC4899',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'name', label: 'اسم المصمم', type: 'text', defaultValue: 'شهد العزاوي' },
      { id: 'role', label: 'التخصص', type: 'text', defaultValue: 'Brand & UI Designer' },
      {
        id: 'bio',
        label: 'نبذة سريعة',
        type: 'text',
        defaultValue: 'تصميم هويات بصرية وواجهات رقمية حديثة',
      },
      {
        id: 'portfolio',
        label: 'رابط الأعمال',
        type: 'text',
        defaultValue: 'behance.net/shahad-iq',
      },
      { id: 'phone', label: 'للتواصل', type: 'text', defaultValue: '+964 773 840 9900' },
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
      const name = escapeXml(fields.name || 'شهد العزاوي');
      const role = escapeXml(fields.role || 'Brand & UI Designer');
      const bio = escapeXml(fields.bio || 'تصميم هويات بصرية وواجهات رقمية حديثة');
      const portfolio = escapeXml(fields.portfolio || 'behance.net/shahad-iq');
      const phone = escapeXml(fields.phone || '+964 773 840 9900');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb18-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cb18-clip">
      <rect x="10" y="10" width="520" height="310" rx="16"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-opacity="0.28" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb18-clip)">
    <circle cx="72" cy="70" r="115" fill="url(#cb18-g)" data-color-role="primary"/>
    <circle cx="496" cy="296" r="84" fill="${secondaryColor}" opacity="0.12" data-color-role="secondary"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="12" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(46, 44)" fill="none" stroke="${backgroundColor}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 26,4 L 44,32 L 34,48 H 18 L 8,32 Z" fill="${backgroundColor}" fill-opacity="0.18"/>
    <path d="M 26,4 V 26"/>
    <circle cx="26" cy="28" r="4" fill="${backgroundColor}"/>
  </g>
  <text data-field-id="name" data-max-width="290" x="498" y="76" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${name}
  </text>
  <rect x="278" y="106" width="220" height="30" rx="15" fill="url(#cb18-g)"/>
  <text data-field-id="role" data-max-width="196" x="388" y="121" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${role}
  </text>
  <text data-field-id="bio" data-max-width="330" x="498" y="164" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${bio}
  </text>
  <line x1="170" y1="198" x2="498" y2="198" stroke="${secondaryColor}" stroke-opacity="0.28" stroke-width="1.5"/>
  ${globeBadge(485, 238, secondaryColor, 'secondary')}
  <text data-field-id="portfolio" data-max-width="260" x="462" y="238" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${portfolio}
  </text>
  ${iconBadge('phone', 485, 276, primaryColor, 'primary')}
  <text data-field-id="phone" data-max-width="260" x="462" y="276" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_logistics_cargo',
    name: 'بطاقة شركة شحن ولوجستيات',
    nameEn: 'Logistics & Express Cargo Card',
    category: 'badges',
    shape: 'rect',
    description: 'بطاقة شركات النقل السريع واللوجستيات بشارات السرعة وخريطة تغطية المحافظات',
    defaultWidth: 540,
    defaultHeight: 330,
    aspectRatio: 540 / 330,
    defaultMm: { width: 90, height: 55 },
    cutShape: { kind: 'roundedRect', x: 10, y: 10, width: 520, height: 310, rx: 14 },
    defaultColors: {
      primary: '#1E3A8A',
      secondary: '#F97316',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'company', label: 'اسم الشركة', type: 'text', defaultValue: 'بوابة الرافدين للشحن' },
      {
        id: 'routes',
        label: 'نطاق التغطية',
        type: 'text',
        defaultValue: 'بغداد • البصرة • أربيل • كافة المحافظات',
      },
      {
        id: 'service',
        label: 'نوع الخدمة',
        type: 'text',
        defaultValue: 'شحن جوي وبري سريع وتخليص جمركي',
      },
      { id: 'phone', label: 'الخط الساخن', type: 'text', defaultValue: '+964 770 004 5566' },
      { id: 'email', label: 'البريد الرسمي', type: 'text', defaultValue: 'cargo@rafidain-exp.iq' },
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
      const company = escapeXml(fields.company || 'بوابة الرافدين للشحن');
      const routes = escapeXml(fields.routes || 'بغداد • البصرة • أربيل • كافة المحافظات');
      const service = escapeXml(fields.service || 'شحن جوي وبري سريع وتخليص جمركي');
      const phone = escapeXml(fields.phone || '+964 770 004 5566');
      const email = escapeXml(fields.email || 'cargo@rafidain-exp.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 330" width="540" height="330">
  <defs>
    <linearGradient id="cb19-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${primaryColor}" stop-opacity="0.84"/>
    </linearGradient>
    <clipPath id="cb19-clip">
      <rect x="10" y="10" width="520" height="310" rx="14"/>
    </clipPath>
  </defs>
  <rect x="10" y="10" width="520" height="310" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <g clip-path="url(#cb19-clip)">
    <path d="M 10,10 H 158 L 194,165 L 158,320 H 10 Z" fill="url(#cb19-g)" data-color-role="primary"/>
    <path d="M 164,10 H 184 L 220,165 L 184,320 H 164 L 200,165 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  </g>
  <rect x="22" y="22" width="496" height="286" rx="10" fill="none" stroke="${primaryColor}" stroke-opacity="0.14" stroke-width="1"/>
  <g transform="translate(56, 128)" fill="none" stroke="${backgroundColor}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="36,2 68,18 68,54 36,70 4,54 4,18" fill="${backgroundColor}" fill-opacity="0.16"/>
    <path d="M 4,18 L 36,34 L 68,18 M 36,34 V 70"/>
    <path d="M 20,10 L 52,26" stroke="${secondaryColor}" stroke-width="3"/>
  </g>
  <text data-field-id="company" data-max-width="266" x="498" y="72" font-family="${fontFamily}, sans-serif" font-size="${Math.round(25 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${company}
  </text>
  <text data-field-id="service" data-max-width="266" x="498" y="110" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="start" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${service}
  </text>
  <rect x="230" y="140" width="268" height="34" rx="17" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1" data-color-role="primary"/>
  <text data-field-id="routes" data-max-width="244" x="364" y="157" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${routes}
  </text>
  <line x1="230" y1="196" x2="498" y2="196" stroke="${primaryColor}" stroke-opacity="0.16" stroke-width="1.5"/>
  ${iconBadge('phone', 485, 230, secondaryColor, 'secondary')}
  <text data-field-id="phone" data-max-width="224" x="462" y="230" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${mailBadge(485, 268, primaryColor, 'primary')}
  <text data-field-id="email" data-max-width="224" x="462" y="268" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="end" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${email}
  </text>
</svg>`;
    },
  },
  {
    id: 'card_biz_round_emblem',
    name: 'بطاقة دائرية فاخرة للعلامة',
    nameEn: 'Round Executive Brand Card',
    category: 'badges',
    shape: 'circle',
    description: 'بطاقة تعريف دائرية مقصوصة (75×75 ملم) للعلامات التجارية والهدايا التنفيذية',
    defaultWidth: 450,
    defaultHeight: 450,
    aspectRatio: 1,
    defaultMm: { width: 75, height: 75 },
    cutShape: { kind: 'circle', cx: 225, cy: 225, r: 213 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#C2410C',
      background: '#FFFDF9',
    },
    fields: [
      { id: 'brand', label: 'اسم العلامة', type: 'text', defaultValue: 'تراث بغداد' },
      { id: 'owner', label: 'الاسم والصفة', type: 'text', defaultValue: 'مؤسسة الحرف اليدوية' },
      { id: 'phone', label: 'للتواصل', type: 'text', defaultValue: '+964 771 334 9000' },
      { id: 'city', label: 'المدينة', type: 'text', defaultValue: 'بغداد - شارع المتنبي' },
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
      const brand = escapeXml(fields.brand || 'تراث بغداد');
      const owner = escapeXml(fields.owner || 'مؤسسة الحرف اليدوية');
      const phone = escapeXml(fields.phone || '+964 771 334 9000');
      const city = escapeXml(fields.city || 'بغداد - شارع المتنبي');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 450" width="450" height="450">
  <defs>
    <linearGradient id="cb20-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}"/>
    </linearGradient>
    <clipPath id="cb20-clip">
      <circle cx="225" cy="225" r="213"/>
    </clipPath>
  </defs>
  <circle cx="225" cy="225" r="213" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <g clip-path="url(#cb20-clip)">
    <path d="M 10,10 H 440 V 142 Q 225,180 10,142 Z" fill="url(#cb20-g)" data-color-role="primary"/>
  </g>
  <circle cx="225" cy="225" r="196" fill="none" stroke="${secondaryColor}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="6 5" data-color-role="secondary"/>
  <circle cx="225" cy="64" r="22" fill="${backgroundColor}" fill-opacity="0.16" stroke="${backgroundColor}" stroke-opacity="0.4" stroke-width="1.2"/>
  ${iconMarkup('star', 211, 50, 28, backgroundColor)}
  <text data-field-id="brand" data-max-width="280" x="225" y="118" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${brand}
  </text>
  <text data-field-id="owner" data-max-width="330" x="225" y="206" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed" data-color-role="primary">
    ${owner}
  </text>
  <rect x="95" y="238" width="260" height="40" rx="20" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="phone" data-max-width="224" x="225" y="258" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${backgroundColor}" text-anchor="middle" dominant-baseline="central" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
  ${iconBadge('pin', 225, 310, secondaryColor, 'secondary', { boxSize: 28, iconSize: 15 })}
  <text data-field-id="city" data-max-width="250" x="225" y="344" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" dominant-baseline="central" direction="rtl" unicode-bidi="embed">
    ${city}
  </text>
</svg>`;
    },
  },
];
