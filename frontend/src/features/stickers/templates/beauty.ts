import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const BEAUTY_TEMPLATES: StickerTemplate[] = [
  {
    id: 'beauty_organic_leaf',
    name: 'منتج طبيعي وعضوي',
    nameEn: 'Organic Natural Product',
    category: 'beauty',
    shape: 'rect',
    description: 'ملصق مستحضرات طبيعية بورقة نباتية لمنتجات التجميل والبشرة',
    defaultWidth: 520,
    defaultHeight: 320,
    aspectRatio: 520 / 320,
    defaultMm: { width: 65, height: 40 },
    cutShape: { kind: 'roundedRect', x: 12, y: 12, width: 496, height: 296, rx: 16 },
    defaultColors: {
      primary: '#344F43',
      secondary: '#8DA58C',
      background: '#F5F3E9',
    },
    fields: [
      { id: 'productName', label: 'اسم المنتج', type: 'text', defaultValue: 'زيت الأرض الطبيعي' },
      { id: 'benefit', label: 'الفائدة', type: 'text', defaultValue: 'ترطيب عميق للبشرة' },
      { id: 'volume', label: 'الحجم', type: 'text', defaultValue: '30 مل' },
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
      const name = escapeXml(fields.productName || 'زيت الأرض الطبيعي');
      const benefit = escapeXml(fields.benefit || 'ترطيب عميق للبشرة');
      const volume = escapeXml(fields.volume || '30 مل');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="520" height="320">
  <rect x="12" y="12" width="496" height="296" rx="16" fill="${bg}" data-color-role="background"/>
  <path d="M 42,276 V 110 A 68,68 0 0,1 178,110 V 276 Z" fill="${secondaryColor}" fill-opacity="0.14" data-color-role="secondary"/>
  <path d="M 57,257 C 84,213 74,126 123,67 M 78,166 Q 111,145 137,110" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 82,190 C 54,182 49,163 54,152 C 77,155 88,172 82,190 Z M 81,159 C 60,144 60,124 68,116 C 86,127 90,145 81,159 Z M 93,123 C 75,105 80,86 91,79 C 104,94 103,110 93,123 Z M 104,103 C 103,78 119,60 133,58 C 137,77 122,96 104,103 Z M 99,148 C 100,127 122,119 135,121 C 130,141 116,151 99,148 Z M 123,129 C 123,105 141,94 153,95 C 153,114 138,128 123,129 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="104" y="182" width="47" height="70" rx="9" fill="${secondaryColor}" fill-opacity="0.22" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <rect x="114" y="169" width="27" height="14" rx="3" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 122,169 V 157 a 5.5,5.5 0 0,1 11,0 V 169 M 112,198 H 143 M 112,236 H 143" fill="none" stroke="${primaryColor}" stroke-width="2" data-color-role="primary"/>
  <path d="M 127,207 C 117,220 117,226 127,228 C 137,226 137,220 127,207 Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="productName" data-max-width="278" x="334" y="130" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="benefit" data-max-width="268" x="334" y="177" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${benefit}
  </text>
  <path d="M 304,207 H 364" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="volume" data-max-width="170" x="334" y="245" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${volume}
  </text>
</svg>`;
    },
  },
  {
    id: 'beauty_glow_star',
    name: 'توهج ولمعان',
    nameEn: 'Glow & Shine',
    category: 'beauty',
    shape: 'circle',
    description: 'ملصق توهج بلمسات نجوم للمستحضرات البراقة والعناية الفاخرة',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#794B53',
      secondary: '#CE9E92',
      background: '#FCF4EF',
    },
    fields: [
      { id: 'productName', label: 'اسم المنتج', type: 'text', defaultValue: 'سيروم التوهج' },
      { id: 'claim', label: 'الوعد أو النتيجة', type: 'text', defaultValue: 'إشراقة فورية للبشرة' },
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
      const name = escapeXml(fields.productName || 'سيروم التوهج');
      const claim = escapeXml(fields.claim || 'إشراقة فورية للبشرة');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <linearGradient id="glow-serum" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${secondaryColor}" stop-opacity="0.12"/>
      <stop offset="1" stop-color="${secondaryColor}" stop-opacity="0.6"/>
    </linearGradient>
  </defs>
  <circle cx="240" cy="240" r="226" fill="${bg}" data-color-role="background"/>
  <path d="M 156,230 V 151 a 84,84 0 0,1 168,0 V 230" fill="none" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <rect x="202" y="139" width="76" height="94" rx="15" fill="url(#glow-serum)" stroke="${primaryColor}" stroke-width="2.5" data-color-role="secondary"/>
  <rect x="213" y="118" width="54" height="23" rx="4" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 228,118 V 98 C 228,82 252,82 252,98 V 118 M 218,126 V 134 M 228,126 V 134 M 238,126 V 134 M 248,126 V 134 M 258,126 V 134" fill="none" stroke="${secondaryColor}" stroke-width="2" data-color-role="secondary"/>
  <path d="M 212,161 V 211 M 240,161 C 221,183 222,197 240,199 C 258,197 259,183 240,161 Z" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 293,157 Q 302,160 306,173 Q 309,161 319,157 Q 309,154 306,142 Q 303,154 293,157 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 180,219 Q 184,227 181,233 C 177,239 168,235 171,228 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="productName" data-max-width="352" x="240" y="299" font-family="${fontFamily}, sans-serif" font-size="${Math.round(39 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="claim" data-max-width="320" x="240" y="345" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${claim}
  </text>
  <path d="M 208,379 H 272" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
</svg>`;
    },
  },
  {
    id: 'beauty_handmade_pink',
    name: 'صناعة يدوية وردية',
    nameEn: 'Handmade Pink Craft',
    category: 'beauty',
    shape: 'circle',
    description: 'شارة ورقية بطابع الصناعة المنزلية للصابون والشموع والهدايا',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#854A56',
      secondary: '#CCA39A',
      background: '#FBF2E9',
    },
    fields: [
      {
        id: 'craftName',
        label: 'اسم المنتج اليدوي',
        type: 'text',
        defaultValue: 'صابون مغربي يدوي',
      },
      {
        id: 'ingredient',
        label: 'المكون الأساسي',
        type: 'text',
        defaultValue: 'زيت أركان وورد دمشقي',
      },
      { id: 'maker', label: 'الصانعة أو العلامة', type: 'text', defaultValue: 'ورشة ليان الحرفية' },
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
      const name = escapeXml(fields.craftName || 'صابون مغربي يدوي');
      const ingredient = escapeXml(fields.ingredient || 'زيت أركان وورد دمشقي');
      const maker = escapeXml(fields.maker || 'ورشة ليان الحرفية');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="226" fill="${bg}" data-color-role="background"/>
  <path d="M 174,212 C 148,190 154,153 144,128 M 298,212 Q 331,161 316,121" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-linecap="round" data-color-role="primary"/>
  <path d="M 153,169 C 132,165 128,145 133,139 C 150,140 160,154 153,169 Z M 150,145 C 151,129 165,118 177,123 C 173,140 162,146 150,145 Z M 312,177 C 332,174 341,157 337,147 C 320,147 310,162 312,177 Z M 319,146 C 299,140 295,124 300,116 C 317,121 324,132 319,146 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <g transform="rotate(-8 240 172)">
    <rect x="173" y="126" width="134" height="91" rx="26" fill="${secondaryColor}" fill-opacity="0.3" stroke="${primaryColor}" stroke-width="2.5" data-color-role="secondary"/>
    <path d="M 181,188 Q 181,209 206,209 H 279 Q 297,208 300,194 M 188,143 Q 195,134 205,135" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-linecap="round" data-color-role="primary"/>
    <path d="M 232,126 V 217 M 250,126 V 217" stroke="${primaryColor}" stroke-width="1.5" stroke-opacity="0.5" data-color-role="primary"/>
  </g>
  <path d="M 239,139 C 216,139 207,121 216,109 C 208,94 224,82 238,89 C 251,77 269,88 267,102 C 283,109 275,131 258,132 C 255,140 247,143 239,139 Z" fill="${secondaryColor}" stroke="${primaryColor}" stroke-width="2" data-color-role="secondary"/>
  <path d="M 240,119 C 225,117 224,102 237,100 C 251,93 263,110 251,119 C 240,130 222,121 221,111 M 239,111 Q 251,103 254,115 M 246,127 Q 260,128 267,117" fill="none" stroke="${primaryColor}" stroke-width="1.8" stroke-linecap="round" data-color-role="primary"/>
  <text data-field-id="craftName" data-max-width="354" x="240" y="282" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="ingredient" data-max-width="324" x="240" y="329" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle">
    ${ingredient}
  </text>
  <path d="M 213,353 H 267" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="maker" data-max-width="286" x="240" y="390" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${maker}
  </text>
</svg>`;
    },
  },
  {
    id: 'beauty_luxury_perfume',
    name: 'ملصق عطر فاخر',
    nameEn: 'Luxury Perfume Bottle Label',
    category: 'beauty',
    shape: 'rect',
    description: 'ملصق عمودي فخم لزجاجات العطور والعود والتركيبات الخاصة',
    defaultWidth: 440,
    defaultHeight: 520,
    aspectRatio: 440 / 520,
    defaultMm: { width: 55, height: 65 },
    cutShape: { kind: 'roundedRect', x: 14, y: 14, width: 412, height: 492, rx: 16 },
    defaultColors: {
      primary: '#1C1917',
      secondary: '#B48844',
      background: '#FAF6EE',
    },
    fields: [
      { id: 'brand', label: 'دار العطور', type: 'text', defaultValue: 'دار العنبر الملكي' },
      { id: 'scentName', label: 'اسم العطر', type: 'text', defaultValue: 'عود بغداد المعتّق' },
      {
        id: 'concentration',
        label: 'التركيز والحجم',
        type: 'text',
        defaultValue: 'EXTRAIT DE PARFUM • 100 ML',
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
      const brand = escapeXml(fields.brand || 'دار العنبر الملكي');
      const scentName = escapeXml(fields.scentName || 'عود بغداد المعتّق');
      const conc = escapeXml(fields.concentration || 'EXTRAIT DE PARFUM • 100 ML');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 520" width="440" height="520">
  <defs>
    <linearGradient id="blp-gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.25"/>
      <stop offset="50%" stop-color="${secondaryColor}"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.25"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="412" height="492" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <rect x="28" y="28" width="384" height="464" rx="10" fill="none" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <rect x="38" y="38" width="364" height="444" rx="6" fill="none" stroke="${primaryColor}" stroke-opacity="0.22" stroke-width="1"/>
  <!-- Minimal flacon crest -->
  <rect x="206" y="76" width="28" height="18" rx="3" fill="${secondaryColor}" data-color-role="secondary"/>
  <rect x="190" y="98" width="60" height="72" rx="10" fill="${secondaryColor}" fill-opacity="0.16" stroke="${primaryColor}" stroke-width="2.2" data-color-role="primary"/>
  <polygon points="220,116 232,134 220,152 208,134" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="brand" data-max-width="320" x="220" y="226" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${brand}
  </text>
  <rect x="86" y="250" width="268" height="2.5" fill="url(#blp-gold)"/>
  <text data-field-id="scentName" data-max-width="332" x="220" y="326" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${scentName}
  </text>
  <rect x="86" y="356" width="268" height="2.5" fill="url(#blp-gold)"/>
  <text data-field-id="concentration" data-max-width="332" x="220" y="424" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="1.8" direction="ltr" unicode-bidi="embed">
    ${conc}
  </text>
</svg>`;
    },
  },
  {
    id: 'beauty_skincare_jar',
    name: 'ختم عبوة العناية بالبشرة',
    nameEn: 'Skincare Jar Lid Seal',
    category: 'beauty',
    shape: 'circle',
    description: 'ختم غطاء دائري لعلب الكريمات والمرطبات الطبيعية والماسكات',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#2F483E',
      secondary: '#94B09A',
      background: '#F4F7F4',
    },
    fields: [
      { id: 'formula', label: 'اسم الكريم', type: 'text', defaultValue: 'كريم الشيا والبابونج' },
      {
        id: 'benefit',
        label: 'الفائدة الأساسية',
        type: 'text',
        defaultValue: 'تغذية ليلية وملمس مخملي',
      },
      {
        id: 'netWeight',
        label: 'الوزن الصافي',
        type: 'text',
        defaultValue: '50 غرام • خالٍ من البارابين',
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
      const formula = escapeXml(fields.formula || 'كريم الشيا والبابونج');
      const benefit = escapeXml(fields.benefit || 'تغذية ليلية وملمس مخملي');
      const netWeight = escapeXml(fields.netWeight || '50 غرام • خالٍ من البارابين');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <circle cx="240" cy="240" r="208" fill="none" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <!-- Jar + botanical sprigs -->
  <rect x="192" y="138" width="96" height="58" rx="14" fill="${secondaryColor}" fill-opacity="0.24" stroke="${primaryColor}" stroke-width="2.5" data-color-role="primary"/>
  <rect x="198" y="118" width="84" height="22" rx="6" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 176,174 C 154,162 150,142 162,130 C 176,138 182,158 176,174 Z M 304,174 C 326,162 330,142 318,130 C 304,138 298,158 304,174 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="formula" data-max-width="350" x="240" y="264" font-family="${fontFamily}, sans-serif" font-size="${Math.round(33 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${formula}
  </text>
  <text data-field-id="benefit" data-max-width="326" x="240" y="310" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${benefit}
  </text>
  <rect x="96" y="344" width="288" height="42" rx="21" fill="${secondaryColor}" fill-opacity="0.22" stroke="${secondaryColor}" stroke-width="1.5" data-color-role="secondary"/>
  <text data-field-id="netWeight" data-max-width="258" x="240" y="371" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${netWeight}
  </text>
</svg>`;
    },
  },
  {
    id: 'beauty_salon_glam',
    name: 'صالون واستوديو تجميل',
    nameEn: 'Glam Beauty Studio Seal',
    category: 'beauty',
    shape: 'circle',
    description: 'ختم أنيق لصالونات التجميل وهدايا العرائس وصناديق الميكب',
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    cutShape: { kind: 'circle', cx: 240, cy: 240, r: 226 },
    defaultColors: {
      primary: '#6D2E46',
      secondary: '#D4A373',
      background: '#FFF8F4',
    },
    fields: [
      {
        id: 'studioName',
        label: 'اسم الصالون / البراند',
        type: 'text',
        defaultValue: 'استوديو روز للجمال',
      },
      { id: 'specialty', label: 'الاختصاص', type: 'text', defaultValue: 'عناية • مكياج • عرائس' },
      { id: 'handle', label: 'الحساب / الموقع', type: 'text', defaultValue: '@RoseGlam.iq' },
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
      const studioName = escapeXml(fields.studioName || 'استوديو روز للجمال');
      const specialty = escapeXml(fields.specialty || 'عناية • مكياج • عرائس');
      const handle = escapeXml(fields.handle || '@RoseGlam.iq');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="bsg-aura" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="${secondaryColor}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="240" cy="240" r="226" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" data-color-role="background"/>
  <circle cx="240" cy="240" r="210" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="5 5" data-color-role="secondary"/>
  <circle cx="240" cy="240" r="210" fill="url(#bsg-aura)"/>
  <!-- Radiant four-point glam stars + crown arch -->
  <path d="M 240,86 Q 246,112 272,118 Q 246,124 240,150 Q 234,124 208,118 Q 234,112 240,86 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="M 186,124 Q 190,136 202,140 Q 190,144 186,156 Q 182,144 170,140 Q 182,136 186,124 Z" fill="${primaryColor}" opacity="0.65" data-color-role="primary"/>
  <path d="M 294,124 Q 298,136 310,140 Q 298,144 294,156 Q 290,144 278,140 Q 290,136 294,124 Z" fill="${primaryColor}" opacity="0.65"/>
  <text data-field-id="studioName" data-max-width="350" x="240" y="230" font-family="${fontFamily}, sans-serif" font-size="${Math.round(35 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${studioName}
  </text>
  <path d="M 136,256 H 344" stroke="${secondaryColor}" stroke-width="1.8" data-color-role="secondary"/>
  <text data-field-id="specialty" data-max-width="324" x="240" y="298" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${specialty}
  </text>
  <rect x="122" y="336" width="236" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" data-max-width="208" x="240" y="364" font-family="${fontFamily}, monospace" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${backgroundColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
</svg>`;
    },
  },
];
