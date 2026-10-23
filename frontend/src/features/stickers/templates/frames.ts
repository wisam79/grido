import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

// Mirror a single engraved corner without duplicating its vector geometry.
function frameCorners(width: number, height: number, inset: number, artwork: string): string {
  return [
    `translate(${inset} ${inset})`,
    `translate(${width - inset} ${inset}) scale(-1 1)`,
    `translate(${inset} ${height - inset}) scale(1 -1)`,
    `translate(${width - inset} ${height - inset}) scale(-1 -1)`,
  ]
    .map((transform) => `<g transform="${transform}">${artwork}</g>`)
    .join('');
}

export const FRAME_TEMPLATES: StickerTemplate[] = [
  {
    id: 'frame_royal_certificate',
    name: 'إطار الشهادات الملكي',
    nameEn: 'Royal Certificate Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار ذهبي رسمي فخم للشهادات والوثائق التقديرية مع نقوش وزوايا ملكية',
    defaultWidth: 600,
    defaultHeight: 450,
    aspectRatio: 600 / 450,
    defaultMm: { width: 150, height: 112 },
    defaultColors: {
      primary: '#23384E',
      secondary: '#B8995D',
      background: '#FFFCF5',
    },
    fields: [
      {
        id: 'headerText',
        label: 'عنوان الإطار / الشهادة',
        type: 'text',
        defaultValue: 'شهادة شكر وتقدير',
      },
      { id: 'footerText', label: 'النص السفلي', type: 'text', defaultValue: 'معتمد وموثق رسمي' },
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
      const header = escapeXml(fields.headerText || '');
      const footer = escapeXml(fields.footerText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const corners = frameCorners(
        600,
        450,
        30,
        `<path d="M0 62V0H62 M7 51V7H51 M0 42C26 42 42 26 42 0" fill="none" stroke="${secondaryColor}" stroke-width="1.3"/>
        <path d="M12 36C12 19 19 12 36 12C29 17 24 20 22 27C18 29 15 32 12 36Z M8 48C18 46 23 41 26 34C15 34 10 40 8 48Z M48 8C46 18 41 23 34 26C34 15 40 10 48 8Z" fill="${secondaryColor}" data-color-role="secondary"/>
        <path d="M13 31C16 20 21 16 31 13 M0 0L8 8" fill="none" stroke="${primaryColor}" stroke-width="1.2"/>
        <path d="M17 17L21 14L25 17L21 21Z" fill="${primaryColor}"/>`,
      );

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <rect x="12" y="12" width="576" height="426" fill="${bg}" data-color-role="background"/>
  <rect x="12" y="12" width="576" height="426" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <rect x="20" y="20" width="560" height="410" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <!-- Engraved rules break around the lettering, even on transparent backgrounds. -->
  <path d="M130 36H36V414H138 M470 36H564V414H462" fill="none" stroke="${primaryColor}" stroke-width="1.3"/>
  ${corners}
  <path d="M300 24L305 29L300 34L295 29Z M154 76H231 M369 76H446" fill="${secondaryColor}" stroke="${secondaryColor}" stroke-width="1.2"/>
  <path d="M276 77Q288 70 300 77Q312 84 324 77 M286 77Q293 82 300 77Q307 72 314 77" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <text data-field-id="headerText" data-max-width="330" data-color-role="primary" x="300" y="61" font-family="${fontFamily}, serif" font-size="${Math.round(24 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">${header}</text>
  <path d="M145 405H168 M432 405H455" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <text data-field-id="footerText" data-max-width="252" data-color-role="primary" x="300" y="414" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${footer}</text>
</svg>`;
    },
  },
  {
    id: 'frame_vintage_victorian',
    name: 'إطار فيكتوري عتيق',
    nameEn: 'Victorian Vintage Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار كلاسيكي عتيق بنقوش فيليجري متناظرة للصور التذكارية والبورتريه',
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: '#5B414C',
      secondary: '#8A6B4F',
      background: '#FCF7EE',
    },
    fields: [
      { id: 'titleText', label: 'عنوان اللوحة', type: 'text', defaultValue: 'ذكريات أصيلة' },
      {
        id: 'subtitleText',
        label: 'النص الفرعي',
        type: 'text',
        defaultValue: 'VINTAGE COLLECTION',
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
      const title = escapeXml(fields.titleText || '');
      const sub = escapeXml(fields.subtitleText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const corners = frameCorners(
        500,
        650,
        28,
        `<path d="M0 70C2 44 5 7 39 7C55 7 61 23 50 30C39 38 28 24 36 19C40 16 45 18 44 22 M7 39C7 12 21 0 46 0 M7 60C24 58 30 45 25 35C20 26 10 29 11 37C12 43 19 44 21 39" fill="none" stroke="${secondaryColor}" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M7 51C8 39 18 34 25 35C20 44 15 48 7 51Z M24 8C26 19 21 24 15 26C13 18 16 11 24 8Z M50 7C58 8 63 14 64 22C56 20 51 15 50 7Z" fill="${secondaryColor}" opacity="0.65"/>
        <path d="M6 5L10 1L14 5L10 9Z" fill="${primaryColor}"/>`,
      );

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <path d="M52 16H448Q448 40 482 40V610Q448 610 448 634H52Q52 610 18 610V40Q52 40 52 16Z" fill="${bg}" data-color-role="background"/>
  <path d="M52 16H448Q448 40 482 40V610Q448 610 448 634H52Q52 610 18 610V40Q52 40 52 16Z" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
  <path d="M99 30H401 M30 115V535 M470 115V535 M99 620H401" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  ${corners}
  <!-- A soft, portrait-sized opening with engraved spandrels. -->
  <rect x="49" y="101" width="402" height="451" rx="47" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
  <path d="M58 159V145Q58 110 93 110H110 M390 110H407Q442 110 442 145V159 M58 494V508Q58 543 93 543H110 M390 543H407Q442 543 442 508V494" fill="none" stroke="${secondaryColor}" stroke-width="1.1"/>
  <text data-field-id="subtitleText" data-max-width="292" data-color-role="secondary" x="250" y="60" font-family="${fontFamily}, serif" font-size="${Math.round(14 * fs)}" font-weight="600" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">${sub}</text>
  <path d="M216 81Q231 73 244 81L250 86L256 81Q269 73 284 81 M239 79L250 74L261 79" fill="none" stroke="${secondaryColor}" stroke-width="1.3"/>
  <text data-field-id="titleText" data-max-width="300" data-color-role="primary" x="250" y="590" font-family="${fontFamily}, serif" font-size="${Math.round(24 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${title}</text>
  <path d="M221 607H239L250 612L261 607H279" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
</svg>`;
    },
  },
  {
    id: 'frame_islamic_arabesque',
    name: 'إطار أرابيسك إسلامي',
    nameEn: 'Islamic Arabesque Frame',
    category: 'frames',
    shape: 'square',
    description: 'إطار تراثي إسلامي بنجوم ثمانية هندسية وزخارف زاوية بديعة',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 100, height: 100 },
    defaultColors: {
      primary: '#1F5E56',
      secondary: '#B89759',
      background: '#FCF9EF',
    },
    fields: [
      {
        id: 'topBar',
        label: 'العبارة العلوية',
        type: 'text',
        defaultValue: 'بسم الله الرحمن الرحيم',
      },
      { id: 'bottomBar', label: 'العبارة السفلية', type: 'text', defaultValue: 'بارك الله لكم' },
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
      const top = escapeXml(fields.topBar || '');
      const btm = escapeXml(fields.bottomBar || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const rosettes = frameCorners(
        500,
        500,
        44,
        `<path d="M0 -23L7 -16L16 -16L16 -7L23 0L16 7L16 16L7 16L0 23L-7 16L-16 16L-16 7L-23 0L-16 -7L-16 -16L-7 -16Z" fill="${primaryColor}" data-color-role="primary"/>
        <path d="M0 -16L5 -11H11V-5L16 0L11 5V11H5L0 16L-5 11H-11V5L-16 0L-11 -5V-11H-5Z M0 -8L8 0L0 8L-8 0Z" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
        <circle r="2" fill="${secondaryColor}"/>`,
      );
      const lattice = [128, 189, 250, 311, 372]
        .map(
          (y) =>
            `M24 ${y - 20}L35 ${y}L24 ${y + 20}L13 ${y}Z M476 ${y - 20}L487 ${y}L476 ${y + 20}L465 ${y}Z`,
        )
        .join(' ');

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect x="12" y="12" width="476" height="476" fill="${bg}" data-color-role="background"/>
  <rect x="12" y="12" width="476" height="476" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
  <path d="M80 22H420 M80 478H420 M43 83V417 M457 83V417" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <path d="${lattice}" fill="none" stroke="${primaryColor}" stroke-width="1.3"/>
  <path d="M24 88V412 M476 88V412" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  ${rosettes}
  <path d="M62 114V94L76 80H222L236 72L250 80L264 72L278 80H424L438 94V114 M62 386V406L76 420H222L236 428L250 420L264 428L278 420H424L438 406V386" fill="none" stroke="${primaryColor}" stroke-width="1.3"/>
  <text data-field-id="topBar" data-max-width="322" data-color-role="primary" x="250" y="55" font-family="${fontFamily}, serif" font-size="${Math.round(22 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${top}</text>
  <text data-field-id="bottomBar" data-max-width="310" data-color-role="primary" x="250" y="459" font-family="${fontFamily}, serif" font-size="${Math.round(21 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${btm}</text>
</svg>`;
    },
  },
  {
    id: 'frame_modern_minimal_corners',
    name: 'إطار ستوديو مينيمال',
    nameEn: 'Modern Studio Minimal Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار عصري أنيق بخطوط رفيعة وزوايا L هندسية متداخلة للتصاميم المعاصرة',
    defaultWidth: 500,
    defaultHeight: 600,
    aspectRatio: 500 / 600,
    defaultMm: { width: 100, height: 120 },
    defaultColors: {
      primary: '#273337',
      secondary: '#A37454',
      background: '#F8F7F3',
    },
    fields: [
      { id: 'studioName', label: 'اسم الاستوديو', type: 'text', defaultValue: 'GRIDO STUDIO' },
      {
        id: 'collection',
        label: 'المجموعة / الأرشيف',
        type: 'text',
        defaultValue: 'ARCHIVE // 2026',
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
      const studio = escapeXml(fields.studioName || 'STUDIO');
      const col = escapeXml(fields.collection || 'COLLECTION');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600">
  <rect x="20" y="20" width="460" height="560" fill="${bg}" data-color-role="background"/>
  <path d="M20 118V20H116 M384 20H480V116 M20 484V580H116 M384 580H480V484" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <path d="M11 148V452 M489 148V452" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <!-- Asymmetric editorial rules and a quiet, uninterrupted photo area. -->
  <path d="M38 78H462 M38 518H462" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <path d="M38 78H108 M392 518H462" fill="none" stroke="${primaryColor}" stroke-width="4"/>
  <path d="M38 111V97H52 M448 97H462V111 M38 485V499H52 M448 499H462V485" fill="none" stroke="${primaryColor}" stroke-width="1.2"/>
  <rect x="38" y="42" width="8" height="8" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="studioName" data-max-width="374" data-color-role="primary" x="258" y="55" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" letter-spacing="2" fill="${primaryColor}" text-anchor="middle">${studio}</text>
  <text data-field-id="collection" data-max-width="382" data-color-role="primary" x="250" y="551" font-family="${fontFamily}, monospace" font-size="${Math.round(15 * fs)}" font-weight="500" letter-spacing="1.6" fill="${primaryColor}" text-anchor="middle">${col}</text>
  <path d="M236 566H246 M250 566H264" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
</svg>`;
    },
  },
  {
    id: 'frame_floral_botanical',
    name: 'إطار أزهار ونباتات ناعم',
    nameEn: 'Botanical Floral Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار أزهار وأوراق شجر رقيقة لمناسبات الزفاف والمواليد والبطاقات',
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: '#9D5264',
      secondary: '#526B55',
      background: '#FCF7F2',
    },
    fields: [
      { id: 'topText', label: 'العبارة العلوية', type: 'text', defaultValue: 'أجمل اللحظات' },
      { id: 'dateText', label: 'التاريخ أو المناسبة', type: 'text', defaultValue: 'SAVE THE DATE' },
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
      const top = escapeXml(fields.topText || '');
      const date = escapeXml(fields.dateText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const petals = [0, 72, 144, 216, 288]
        .map(
          (angle) =>
            `<path transform="rotate(${angle})" d="M0 1C-15 -2 -16 -19 -5 -21C7 -24 14 -8 0 1Z" fill="${primaryColor}" fill-opacity="0.28" stroke="${primaryColor}" stroke-width="1.1"/>`,
        )
        .join('');
      const spray = `<path d="M5 149C15 118 6 71 42 37C57 23 73 16 92 10 M15 96C41 83 59 64 74 42 M25 58C10 44 9 26 12 12" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M12 121C-2 113 -4 101 1 92C12 96 17 108 12 121Z M15 101C29 100 39 88 38 77C24 79 16 88 15 101Z M17 79C3 73 1 60 6 50C17 56 21 67 17 79Z M35 64C48 65 56 55 58 45C44 45 37 53 35 64Z M48 32C43 18 48 9 57 5C61 17 56 27 48 32Z M66 22C80 27 91 22 96 14C84 11 74 13 66 22Z" fill="${secondaryColor}" fill-opacity="0.7"/>
        <path d="M12 35C0 30 -2 18 4 11C13 16 16 24 12 35Z M55 66C69 68 79 61 82 51C68 49 59 56 55 66Z M76 40C69 29 71 19 79 15C86 24 83 33 76 40Z" fill="${secondaryColor}" fill-opacity="0.4"/>
        <path d="M9 111L2 99 M22 91L33 82 M22 65L9 57 M42 56L53 49 M51 24L55 11 M74 19L90 16" fill="none" stroke="${secondaryColor}" stroke-width="0.9"/>
        <g transform="translate(32 43)">${petals}<circle r="4" fill="${secondaryColor}"/><path d="M-2 -1L1 2 M-1 2L2 -1" stroke="${primaryColor}" stroke-width="1.2"/></g>
        <path d="M13 13C4 8 7 -1 12 0C19 -2 23 8 13 13Z" fill="${primaryColor}" fill-opacity="0.55"/>`;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <rect x="20" y="20" width="460" height="610" rx="3" fill="${bg}" data-color-role="background"/>
  <path d="M137 35H383Q465 35 465 117V483 M35 167V533Q35 615 117 615H363" fill="none" stroke="${secondaryColor}" stroke-width="1.2" opacity="0.7"/>
  <g transform="translate(24 24)">${spray}</g>
  <g transform="translate(476 626) rotate(180)">${spray}</g>
  <g transform="translate(472 28) scale(-0.65 0.65)">${spray}</g>
  <g transform="translate(28 622) scale(0.65 -0.65)">${spray}</g>
  <text data-field-id="topText" data-max-width="250" data-color-role="primary" x="250" y="73" font-family="${fontFamily}, serif" font-size="${Math.round(24 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${top}</text>
  <path d="M221 94Q236 88 250 94Q264 100 279 94" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <text data-field-id="dateText" data-max-width="256" data-color-role="secondary" x="250" y="591" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" letter-spacing="1.8" fill="${secondaryColor}" text-anchor="middle">${date}</text>
</svg>`;
    },
  },
  {
    id: 'frame_polaroid_retro',
    name: 'إطار بولارويد كلاسيكي',
    nameEn: 'Retro Polaroid Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار صور بولارويد الفورية الكلاسيكي مع مساحة للتعليق اليدوي وتاريخ الصورة',
    defaultWidth: 460,
    defaultHeight: 560,
    aspectRatio: 460 / 560,
    defaultMm: { width: 92, height: 112 },
    defaultColors: {
      primary: '#393C3D',
      secondary: '#B59B76',
      background: '#FFFDF7',
    },
    fields: [
      {
        id: 'caption',
        label: 'التعليق المكتوب',
        type: 'text',
        defaultValue: 'ذكريات جميلة لا تُنسى ♡',
      },
      { id: 'dateText', label: 'تاريخ الالتقاط', type: 'text', defaultValue: '2026.09.14' },
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
      const caption = escapeXml(fields.caption || '');
      const date = escapeXml(fields.dateText || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 560" width="460" height="560">
  <!-- A bevel along two edges gives the paper depth without a raster filter. -->
  <path d="M20 548H448V29" fill="none" stroke="${primaryColor}" stroke-width="3" opacity="0.12"/>
  <rect x="15" y="23" width="430" height="522" rx="2" fill="${bg}" data-color-role="background"/>
  <rect x="15" y="23" width="430" height="522" rx="2" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <rect x="35" y="52" width="390" height="390" fill="none" stroke="${secondaryColor}" stroke-width="1.4"/>
  <path d="M38 440V55H422" fill="none" stroke="${primaryColor}" stroke-width="1" opacity="0.16"/>
  <!-- Translucent torn washi, with sparse paper-fibre strokes. -->
  <g transform="rotate(-4 230 26)">
    <path d="M161 13L169 15L177 12L185 14L193 12H300L296 19L301 25L296 31L299 40L291 38L283 41H160L164 34L160 27L164 20Z" fill="${secondaryColor}" fill-opacity="0.48" data-color-role="secondary"/>
    <path d="M175 19L185 35 M194 18L205 35 M215 18L226 35 M236 18L247 35 M257 18L268 35 M278 18L289 35" fill="none" stroke="${primaryColor}" stroke-width="0.8" opacity="0.14"/>
    <path d="M171 16H291 M170 37H281" fill="none" stroke="${secondaryColor}" stroke-width="0.8" opacity="0.6"/>
  </g>
  <text data-field-id="caption" data-max-width="366" data-color-role="primary" x="230" y="485" font-family="${fontFamily}, cursive, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${caption}</text>
  <text data-field-id="dateText" data-max-width="330" data-color-role="primary" x="230" y="522" font-family="${fontFamily}, monospace" font-size="${Math.round(15 * fs)}" font-weight="500" letter-spacing="2" fill="${primaryColor}" opacity="0.75" text-anchor="middle">${date}</text>
</svg>`;
    },
  },
  {
    id: 'frame_serrated_postage_stamp',
    name: 'إطار طابع بريدي مسنن',
    nameEn: 'Postage Stamp Frame',
    category: 'frames',
    shape: 'square',
    description: 'إطار طابع بريدي مسنن الحواف للصور التذكارية والمراسلات الفاخرة',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 100, height: 100 },
    defaultColors: {
      primary: '#345B50',
      secondary: '#A35740',
      background: '#FAF5E9',
    },
    fields: [
      {
        id: 'postTitle',
        label: 'عنوان الطابع',
        type: 'text',
        defaultValue: 'POSTAGE • طابع تذكاري',
      },
      { id: 'priceTag', label: 'القيمة الاسمية', type: 'text', defaultValue: '250 د.ع' },
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
      const title = escapeXml(fields.postTitle || '');
      const price = escapeXml(fields.priceTag || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      // One compound mask path punches real alpha holes through paper AND ink.
      const hole = (x: number, y: number) => `M${x - 6} ${y}a6 6 0 1 0 12 0a6 6 0 1 0 -12 0Z`;
      let holes = '';
      for (let i = 0; i <= 20; i++) {
        const position = 30 + i * 22;
        holes += hole(position, 20) + hole(position, 480);
        holes += hole(20, position) + hole(480, position);
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <mask id="postage-perforations" x="0" y="0" width="500" height="500" maskUnits="userSpaceOnUse" mask-type="luminance">
      <rect x="20" y="20" width="460" height="460" fill="#FFFFFF"/>
      <path d="${holes}" fill="#000000"/>
    </mask>
  </defs>
  <g mask="url(#postage-perforations)">
    <rect x="20" y="20" width="460" height="460" fill="${bg}" data-color-role="background"/>
    <rect x="20" y="20" width="460" height="460" fill="none" stroke="${primaryColor}" stroke-width="22"/>
    <rect x="41" y="41" width="418" height="418" fill="none" stroke="${primaryColor}" stroke-width="1.4"/>
    <path d="M41 94H459 M41 411H459" fill="none" stroke="${primaryColor}" stroke-width="2"/>
    <path d="M54 112V106H70 M430 106H446V112 M54 393V399H70 M430 399H446V393" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
    <text data-field-id="postTitle" data-max-width="382" data-color-role="primary" x="250" y="75" font-family="${fontFamily}, serif" font-size="${Math.round(21 * fs)}" font-weight="700" letter-spacing="1.3" fill="${primaryColor}" text-anchor="middle">${title}</text>
    <text data-field-id="priceTag" data-max-width="256" data-color-role="secondary" x="250" y="442" font-family="${fontFamily}, serif" font-size="${Math.round(24 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">${price}</text>
    <g fill="none" stroke="${secondaryColor}" stroke-width="1.2">
      <circle cx="74" cy="435" r="14"/>
      <path d="M74 425L77 431L84 432L79 437L80 444L74 441L68 444L69 437L64 432L71 431Z M403 428Q414 422 425 428T447 428 M403 435Q414 429 425 435T447 435 M403 442Q414 436 425 442T447 442"/>
    </g>
  </g>
</svg>`;
    },
  },
  {
    id: 'frame_art_deco_luxury',
    name: 'إطار آرت ديكو ذهبي',
    nameEn: 'Art Deco Luxury Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار آرت ديكو هندسي راقٍ بزوايا متدرجة وخطوط متوازية للتصاميم الفاخرة',
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: '#BC995B',
      secondary: '#E6D3AA',
      background: '#171E25',
    },
    fields: [
      { id: 'topLabel', label: 'الشارة العليا', type: 'text', defaultValue: 'EXCELLENCE & LUXURY' },
      { id: 'bottomLabel', label: 'الشارة السفلى', type: 'text', defaultValue: 'VIP EDITION' },
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
      const top = escapeXml(fields.topLabel || '');
      const btm = escapeXml(fields.bottomLabel || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const fans = frameCorners(
        500,
        650,
        28,
        `<path d="M0 62V0H62A62 62 0 0 1 0 62Z" fill="${primaryColor}" fill-opacity="0.12"/>
        <path d="M0 62A62 62 0 0 0 62 0 M0 49A49 49 0 0 0 49 0 M0 35A35 35 0 0 0 35 0 M0 0L60 16 M0 0L54 31 M0 0L44 44 M0 0L31 54 M0 0L16 60" fill="none" stroke="${primaryColor}" stroke-width="1.3"/>
        <path d="M0 21A21 21 0 0 0 21 0 M0 0H62 M0 0V62" fill="none" stroke="${secondaryColor}" stroke-width="1.6"/>
        <path d="M0 0H9L15 15L0 9Z" fill="${secondaryColor}"/>`,
      );

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <rect x="14" y="14" width="472" height="622" fill="${bg}" data-color-role="background"/>
  <rect x="14" y="14" width="472" height="622" fill="none" stroke="${primaryColor}" stroke-width="1.4"/>
  <path d="M110 28H390 M110 622H390 M28 111V539 M472 111V539" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <!-- Radiating shell fans replace flat triangular corner blocks. -->
  ${fans}
  <path d="M49 126V110H65V96H95 M405 96H435V110H451V126 M49 524V540H65V554H95 M405 554H435V540H451V524 M49 143V507 M451 143V507" fill="none" stroke="${primaryColor}" stroke-width="1.1"/>
  <path d="M204 89H236L250 99L264 89H296 M204 561H236L250 551L264 561H296" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <path d="M250 83L256 89L250 95L244 89Z M250 555L256 561L250 567L244 561Z" fill="${primaryColor}"/>
  <text data-field-id="topLabel" data-max-width="294" data-color-role="secondary" x="250" y="63" font-family="${fontFamily}, serif" font-size="${Math.round(18 * fs)}" font-weight="600" letter-spacing="1.8" fill="${secondaryColor}" text-anchor="middle">${top}</text>
  <text data-field-id="bottomLabel" data-max-width="294" data-color-role="secondary" x="250" y="604" font-family="${fontFamily}, serif" font-size="${Math.round(18 * fs)}" font-weight="600" letter-spacing="2.4" fill="${secondaryColor}" text-anchor="middle">${btm}</text>
</svg>`;
    },
  },
  {
    id: 'frame_cyber_neon_glow',
    name: 'إطار سايبر نيون تقني',
    nameEn: 'Cyber Neon Tech Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار تكنولوجي عصري بزوايا مقطوعة ومؤشرات رقمية متوهجة',
    defaultWidth: 500,
    defaultHeight: 600,
    aspectRatio: 500 / 600,
    defaultMm: { width: 100, height: 120 },
    defaultColors: {
      primary: '#59D8D0',
      secondary: '#A4A1F4',
      background: '#121C2B',
    },
    fields: [
      { id: 'hudTitle', label: 'عنوان النظام', type: 'text', defaultValue: 'SYSTEM // ONLINE' },
      { id: 'tag', label: 'الوسم التقني', type: 'text', defaultValue: 'ID: #2026-X' },
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
      const title = escapeXml(fields.hudTitle || '');
      const tag = escapeXml(fields.tag || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const p = 'M 40,15 L 460,15 L 485,40 L 485,560 L 460,585 L 40,585 L 15,560 L 15,40 Z';

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600">
  <path d="${p}" fill="${bg}" data-color-role="background"/>
  <!-- Layered vector strokes suggest light without a blur/filter allocation. -->
  <path d="${p}" fill="none" stroke="${primaryColor}" stroke-width="10" opacity="0.08"/>
  <path d="${p}" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <path d="M15 118V40L40 15H126 M374 585H460L485 560V482" fill="none" stroke="${secondaryColor}" stroke-width="4"/>
  <path d="M39 33H403L420 50V76H39Z" fill="${primaryColor}" opacity="0.1"/>
  <path d="M39 76H420 M45 110V99H64L76 87H384L396 99H455V110" fill="none" stroke="${primaryColor}" stroke-width="1.3"/>
  <path d="M30 134V249L38 257V334L30 342V466 M470 134V217L462 225V372L470 380V466" fill="none" stroke="${primaryColor}" stroke-width="1.2"/>
  <path d="M23 153V203 M477 397V447 M45 490V501H115 M385 501H455V490" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
  <path d="M130 517H451L465 531V563H130Z" fill="${secondaryColor}" opacity="0.1"/>
  <path d="M130 563H465 M41 529L51 539L41 549 M56 529L66 539L56 549 M71 529L81 539L71 549" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
  <g fill="${primaryColor}" data-color-role="primary">
    <rect x="437" y="40" width="17" height="4"/>
    <rect x="437" y="49" width="12" height="4"/>
    <rect x="437" y="58" width="7" height="4"/>
    <circle cx="38" cy="296" r="3"/>
    <circle cx="462" cy="300" r="3"/>
  </g>
  <text data-field-id="hudTitle" data-max-width="346" data-color-role="primary" x="231" y="61" font-family="${fontFamily}, monospace" font-size="${Math.round(21 * fs)}" font-weight="700" letter-spacing="1" fill="${primaryColor}" text-anchor="middle">${title}</text>
  <text data-field-id="tag" data-max-width="302" data-color-role="secondary" x="292" y="548" font-family="${fontFamily}, monospace" font-size="${Math.round(19 * fs)}" font-weight="600" letter-spacing="1.3" fill="${secondaryColor}" text-anchor="middle">${tag}</text>
</svg>`;
    },
  },
  {
    id: 'frame_double_gold_filigree',
    name: 'إطار تكريم وفيليجري ملكي',
    nameEn: 'Double Gold Filigree Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار شرفي فاخر مزدوج بزوايا فيليجري متموجة للشهادات والتكريمات الكبرى',
    defaultWidth: 600,
    defaultHeight: 480,
    aspectRatio: 600 / 480,
    defaultMm: { width: 150, height: 120 },
    defaultColors: {
      primary: '#AF884B',
      secondary: '#66513A',
      background: '#FCF8EE',
    },
    fields: [
      { id: 'header', label: 'عنوان التكريم', type: 'text', defaultValue: 'وسام الإبداع والتميز' },
      {
        id: 'award',
        label: 'الدرجة أو المرتبة',
        type: 'text',
        defaultValue: 'المرتبة الأولى ★★★★★',
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
      const header = escapeXml(fields.header || '');
      const award = escapeXml(fields.award || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const filigree = frameCorners(
        600,
        480,
        25,
        `<path d="M4 79C12 49 23 32 47 25C67 19 76 5 58 2C45 0 42 15 52 18C59 20 62 11 56 10 M4 79C30 73 51 57 53 40C55 25 38 26 37 36C36 44 46 48 49 40 M18 63C38 54 39 48 34 43" fill="none" stroke="${primaryColor}" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M8 63C9 38 4 28 5 11C23 20 30 31 22 43C23 33 19 27 15 24C18 42 16 52 8 63Z M26 28C20 13 24 5 37 3C39 15 34 24 26 28Z M27 64C45 59 60 58 69 44C70 60 58 70 46 66C40 65 35 64 27 64Z" fill="${primaryColor}"/>
        <path d="M10 24Q20 39 11 55 M28 22L33 9 M39 64Q55 65 64 53" fill="none" stroke="${secondaryColor}" stroke-width="1"/>
        <circle cx="5" cy="5" r="2.5" fill="${secondaryColor}"/>`,
      );

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 480" width="600" height="480">
  <rect x="12" y="12" width="576" height="456" rx="3" fill="${bg}" data-color-role="background"/>
  <rect x="12" y="12" width="576" height="456" rx="3" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <rect x="19" y="19" width="562" height="442" rx="2" fill="none" stroke="${primaryColor}" stroke-width="1"/>
  <path d="M119 36H145 M455 36H481 M36 121V359 M564 121V359 M110 444H122 M478 444H490" fill="none" stroke="${secondaryColor}" stroke-width="1.3"/>
  ${filigree}
  <path d="M63 132V116Q63 92 87 92H130 M470 92H513Q537 92 537 116V132 M63 348V364Q63 388 87 388H130 M470 388H513Q537 388 537 364V348" fill="none" stroke="${primaryColor}" stroke-width="1.1"/>
  <text data-field-id="header" data-max-width="336" data-color-role="secondary" x="300" y="62" font-family="${fontFamily}, serif" font-size="${Math.round(24 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">${header}</text>
  <path d="M218 84H265Q279 72 293 84L300 89L307 84Q321 72 335 84H382 M282 83Q293 78 300 83Q307 88 318 83" fill="none" stroke="${primaryColor}" stroke-width="1.2"/>
  <path d="M122 405H478L467 426L478 450H122L133 426Z" fill="${primaryColor}" fill-opacity="0.1" stroke="${primaryColor}" stroke-width="1"/>
  <text data-field-id="award" data-max-width="308" data-color-role="secondary" x="300" y="435" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">${award}</text>
</svg>`;
    },
  },
  {
    id: 'frame_diploma_scroll',
    name: 'إطار شهادة الدبلوم والوثيقة الأكاديمية',
    nameEn: 'Academic Diploma Scroll Frame',
    category: 'frames',
    shape: 'rect',
    description: 'إطار تخرج وشهادات أكاديمية مع نقوش أركان يونانية مذهبة وتسمية جامعية',
    defaultWidth: 600,
    defaultHeight: 450,
    aspectRatio: 600 / 450,
    defaultMm: { width: 150, height: 112 },
    defaultColors: {
      primary: '#233D59',
      secondary: '#A48B5B',
      background: '#FDFBF3',
    },
    fields: [
      {
        id: 'title',
        label: 'عنوان الوثيقة',
        type: 'text',
        defaultValue: 'وثيقة تخرج جامعية معتمدة',
      },
      {
        id: 'institution',
        label: 'اسم الجامعة / المؤسسة',
        type: 'text',
        defaultValue: 'جامعة الرافدين الأكاديمية',
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
      const title = escapeXml(fields.title || '');
      const inst = escapeXml(fields.institution || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const meanders = frameCorners(
        600,
        450,
        25,
        `<path d="M0 66V0H66 M7 59V7H59 M17 48V17H48V48H29V29H38V38" fill="none" stroke="${primaryColor}" stroke-width="1.8"/>
        <path d="M0 75H17V58H58V17H75V0" fill="none" stroke="${secondaryColor}" stroke-width="1.3"/>`,
      );

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <rect x="12" y="12" width="576" height="426" fill="${bg}" data-color-role="background"/>
  <rect x="12" y="12" width="576" height="426" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <path d="M110 25H490 M110 425H490 M25 112V338 M575 112V338" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  ${meanders}
  <path d="M45 115V335 M555 115V335 M111 91H237 M363 91H489 M111 375H270 M330 375H489" fill="none" stroke="${primaryColor}" stroke-width="1.1"/>
  <text data-field-id="title" data-max-width="352" data-color-role="primary" x="300" y="59" font-family="${fontFamily}, serif" font-size="${Math.round(24 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">${title}</text>
  <!-- Open book and botanical laurels, kept entirely within the header. -->
  <g transform="translate(300 97)" stroke="${secondaryColor}" stroke-width="1.2">
    <path d="M0 7V-7Q-8 -12 -15 -8V5Q-7 2 0 7 M0 -7Q8 -12 15 -8V5Q7 2 0 7 M-23 8Q-33 -2 -27 -15 M23 8Q33 -2 27 -15" fill="none"/>
    <path d="M-28 2Q-39 -1 -35 -9Q-28 -7 -28 2Z M-29 -8Q-34 -17 -27 -21Q-24 -13 -29 -8Z M28 2Q39 -1 35 -9Q28 -7 28 2Z M29 -8Q34 -17 27 -21Q24 -13 29 -8Z" fill="${secondaryColor}" stroke="none"/>
  </g>
  <path d="M300 369L306 375L300 381L294 375Z" fill="${secondaryColor}"/>
  <text data-field-id="institution" data-max-width="368" data-color-role="primary" x="300" y="409" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${inst}</text>
</svg>`;
    },
  },
  {
    id: 'frame_baroque_ornate',
    name: 'إطار الباروك الأوروبي العتيق',
    nameEn: 'Baroque Ornate Vintage Frame',
    category: 'frames',
    shape: 'square',
    description: 'إطار فني كلاسيكي مذهب ومستوحى من قصور الباروك للوحات الفنية والصور التذكارية',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#AE884D',
      secondary: '#5D4637',
      background: '#FAF3E4',
    },
    fields: [
      { id: 'header', label: 'عنوان اللوحة', type: 'text', defaultValue: 'لوحة تذكارية تراثية' },
      { id: 'sub', label: 'الوصف الفني', type: 'text', defaultValue: 'فن وأصالة عريقة' },
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
      const header = escapeXml(fields.header || '');
      const sub = escapeXml(fields.sub || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const acanthus = frameCorners(
        500,
        500,
        29,
        `<path d="M7 75C1 52 25 43 37 38C58 30 70 17 60 7C51 -1 36 7 40 18C43 27 55 24 53 16 M11 66C27 73 45 66 50 56C56 45 68 45 72 53C77 65 62 72 60 62" fill="none" stroke="${primaryColor}" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M9 61C16 50 14 38 8 29C20 30 28 40 25 47C31 33 20 20 20 8C35 10 42 20 35 34C48 22 59 26 61 36C47 35 46 45 35 51C24 55 16 59 9 61Z" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="0.8"/>
        <path d="M14 57Q37 41 29 19 M22 51Q24 40 15 35 M30 47Q44 31 53 32 M18 70Q35 71 45 60" fill="none" stroke="${secondaryColor}" stroke-width="1.1"/>
        <path d="M1 18C-3 8 3 -2 13 1C10 10 7 14 1 18Z" fill="${primaryColor}"/>`,
      );

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect x="18" y="18" width="464" height="464" rx="8" fill="${bg}" data-color-role="background"/>
  <rect x="13" y="13" width="474" height="474" rx="11" fill="none" stroke="${secondaryColor}" stroke-width="1.1"/>
  <rect x="20" y="20" width="460" height="460" rx="6" fill="none" stroke="${primaryColor}" stroke-width="5"/>
  <path d="M43 123C35 171 48 202 40 250C48 298 35 329 43 377 M457 123C465 171 452 202 460 250C452 298 465 329 457 377" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  ${acanthus}
  <path d="M70 126Q70 99 97 99H140 M360 99H403Q430 99 430 126 M70 374Q70 401 97 401H140 M360 401H403Q430 401 430 374" fill="none" stroke="${primaryColor}" stroke-width="1.4"/>
  <!-- Scallop-shell crest, drawn as engraved lobes rather than a text pill. -->
  <path d="M250 36L229 25Q227 16 235 18Q239 11 245 17Q250 10 255 17Q261 11 265 18Q273 16 271 25Z" fill="${primaryColor}"/>
  <path d="M250 34L237 21 M250 34L245 19 M250 34L255 19 M250 34L263 21" fill="none" stroke="${secondaryColor}" stroke-width="1"/>
  <text data-field-id="header" data-max-width="280" data-color-role="secondary" x="250" y="69" font-family="${fontFamily}, serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">${header}</text>
  <path d="M197 87H235L250 93L265 87H303 M197 421H235L250 415L265 421H303" fill="none" stroke="${primaryColor}" stroke-width="1.2"/>
  <text data-field-id="sub" data-max-width="278" data-color-role="secondary" x="250" y="455" font-family="${fontFamily}, serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">${sub}</text>
</svg>`;
    },
  },
  {
    id: 'frame_wooden_rustic',
    name: 'إطار الخشب الريفي الطبيعي',
    nameEn: 'Rustic Wooden Craft Frame',
    category: 'frames',
    shape: 'rect',
    description:
      'إطار خشبي دافئ للصور العائلية ومطاعم الأكلات التراثية مع محاكاة عقد الخشب الطبيعية',
    defaultWidth: 560,
    defaultHeight: 420,
    aspectRatio: 560 / 420,
    defaultColors: {
      primary: '#513A2B',
      secondary: '#BFA17E',
      background: '#FBF7EE',
    },
    fields: [
      { id: 'label', label: 'عنوان الذكرى', type: 'text', defaultValue: 'ذكريات دافئة لا تُنسى' },
      { id: 'year', label: 'سنة التأسيس / المناسبة', type: 'text', defaultValue: 'EST. 2026' },
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
      const label = escapeXml(fields.label || '');
      const yr = escapeXml(fields.year || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 420" width="560" height="420">
  <rect x="14" y="14" width="532" height="392" fill="${bg}" data-color-role="background"/>
  <!-- Four mitred boards; the grain follows each board, not the photo area. -->
  <g fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="1.2" data-color-role="secondary">
    <path d="M14 14H546L510 55H50Z"/>
    <path d="M546 14V406L510 360V55Z"/>
    <path d="M14 406H546L510 360H50Z"/>
    <path d="M14 14V406L50 360V55Z"/>
  </g>
  <path d="M14 14V406L50 360V55Z M14 406H546L510 360H50Z" fill="${primaryColor}" opacity="0.08"/>
  <g fill="none" stroke="${primaryColor}" stroke-linecap="round">
    <path d="M30 22C73 27 115 17 168 24 M44 34C85 28 125 38 169 33 M56 46C99 42 135 50 173 44 M388 23C435 18 473 28 530 22 M391 35C437 31 482 38 519 33 M390 46C437 42 471 49 504 44 M33 397Q58 393 83 398 M477 398Q503 394 528 397 M43 384Q63 379 83 384 M477 383Q498 377 518 384 M56 371H81 M479 371H504" stroke-width="1.1" opacity="0.5"/>
    <path d="M23 49C29 97 17 117 24 146C32 177 18 201 23 232S20 312 25 379 M39 57C46 93 33 125 41 149C49 177 35 203 41 237S36 315 42 357 M32 211C27 259 37 294 31 341 M520 67C527 115 517 169 521 220C526 246 514 269 521 298S515 341 523 377 M537 45C531 103 542 154 536 212C529 253 543 278 536 316S541 358 534 389" stroke-width="1.1" opacity="0.55"/>
    <path d="M33 144C22 157 24 185 33 193C43 180 42 157 33 144Z M33 156C28 164 29 179 33 183C37 175 37 164 33 156Z M528 251C519 264 521 287 528 296C537 282 537 264 528 251Z M528 263Q522 277 528 286Q534 275 528 263Z" stroke-width="1" opacity="0.7"/>
  </g>
  <rect x="50" y="55" width="460" height="305" fill="none" stroke="${primaryColor}" stroke-width="2.2"/>
  <rect x="56" y="61" width="448" height="293" fill="none" stroke="${secondaryColor}" stroke-width="1"/>
  <!-- Smooth portions of the boards are reserved for the carved lettering. -->
  <text data-field-id="year" data-max-width="192" data-color-role="primary" x="280" y="39" font-family="${fontFamily}, monospace" font-size="${Math.round(15 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" letter-spacing="2">${yr}</text>
  <text data-field-id="label" data-max-width="374" data-color-role="primary" x="280" y="390" font-family="${fontFamily}, serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">${label}</text>
</svg>`;
    },
  },
  {
    id: 'frame_hexagonal_geometric',
    name: 'إطار هندسي عصري سداسي',
    nameEn: 'Modern Hexagonal Geometric Frame',
    category: 'frames',
    shape: 'square',
    description: 'إطار هندسي مائل ذو خطوط سداسية وزوايا متداخلة ذهبية للمناسبات العصرية والمصممين',
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: '#2B6D68',
      secondary: '#BB915B',
      background: '#F6F8F3',
    },
    fields: [
      {
        id: 'centerNote',
        label: 'العبارة الإرشادية',
        type: 'text',
        defaultValue: 'لحظات إبداعية مميزة',
      },
      { id: 'tagline', label: 'الشعار السفلي', type: 'text', defaultValue: 'MODERN GEOMETRIC' },
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
      const note = escapeXml(fields.centerNote || '');
      const tag = escapeXml(fields.tagline || '');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Six-sided perimeter: no diagonal artwork crosses the photo opening. -->
  <path d="M105 18H395L484 250L395 482H105L16 250Z" fill="${bg}" data-color-role="background"/>
  <path d="M105 18H395L484 250L395 482H105L16 250Z" fill="none" stroke="${primaryColor}" stroke-width="2.5"/>
  <path d="M113 31H387L470 250L387 469H113L30 250Z" fill="none" stroke="${secondaryColor}" stroke-width="1.2"/>
  <path d="M105 18H159L113 31L30 250H16Z M395 482H341L387 469L470 250H484Z" fill="${primaryColor}" opacity="0.12"/>
  <path d="M39 190L105 18H204 M296 482H395L461 310" fill="none" stroke="${secondaryColor}" stroke-width="4"/>
  <path d="M120 112L128 91H181 M319 91H372L380 112 M120 388L128 409H181 M319 409H372L380 388" fill="none" stroke="${primaryColor}" stroke-width="1.4"/>
  <path d="M28 236L40 243V257L28 264L16 257V243Z M472 236L484 243V257L472 264L460 257V243Z" fill="${primaryColor}"/>
  <path d="M28 243L34 246V254L28 257L22 254V246Z M472 243L478 246V254L472 257L466 254V246Z" fill="none" stroke="${secondaryColor}" stroke-width="1.1"/>
  <text data-field-id="centerNote" data-max-width="274" data-color-role="primary" x="250" y="70" font-family="${fontFamily}, sans-serif" font-size="${Math.round(23 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">${note}</text>
  <text data-field-id="tagline" data-max-width="270" data-color-role="primary" x="250" y="446" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" letter-spacing="1.5">${tag}</text>
</svg>`;
    },
  },
];
