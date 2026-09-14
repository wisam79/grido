import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";

export const FRAME_TEMPLATES: StickerTemplate[] = [
  {
    id: "frame_royal_certificate",
    name: "إطار الشهادات الملكي",
    nameEn: "Royal Certificate Frame",
    category: "frames",
    shape: "rect",
    description: "إطار ذهبي رسمي فخم للشهادات والوثائق التقديرية مع نقوش وزوايا ملكية",
    defaultWidth: 600,
    defaultHeight: 450,
    aspectRatio: 600 / 450,
    defaultMm: { width: 150, height: 112 },
    defaultColors: {
      primary: "#D97706",
      secondary: "#78350F",
      background: "#FFFBEB",
    },
    fields: [
      { id: "headerText", label: "عنوان الإطار / الشهادة", type: "text", defaultValue: "شهادة شكر وتقدير" },
      { id: "footerText", label: "النص السفلي", type: "text", defaultValue: "معتمد وموثق رسمي" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const header = escapeXml(fields.headerText || "");
      const footer = escapeXml(fields.footerText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <defs>
    <filter id="rc-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/>
    </filter>
  </defs>
  <!-- Background & Outer Border -->
  <rect x="10" y="10" width="580" height="430" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Middle Inset Border -->
  <rect x="22" y="22" width="556" height="406" rx="4" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6,4"/>
  <!-- Inner Frame Line -->
  <rect x="30" y="30" width="540" height="390" rx="2" fill="none" stroke="${primaryColor}" stroke-width="2"/>

  <!-- Ornate Corner Accents -->
  <!-- Top-Left -->
  <g transform="translate(30, 30)">
    <path d="M 0,40 L 0,0 L 40,0 M 6,34 L 6,6 L 34,6 M 0,0 L 25,25" stroke="${primaryColor}" stroke-width="2" fill="none"/>
    <circle cx="15" cy="15" r="4" fill="${secondaryColor}"/>
    <circle cx="28" cy="8" r="2.5" fill="${primaryColor}"/>
    <circle cx="8" cy="28" r="2.5" fill="${primaryColor}"/>
  </g>
  <!-- Top-Right -->
  <g transform="translate(570, 30)">
    <path d="M 0,40 L 0,0 L -40,0 M -6,34 L -6,6 L -34,6 M 0,0 L -25,25" stroke="${primaryColor}" stroke-width="2" fill="none"/>
    <circle cx="-15" cy="15" r="4" fill="${secondaryColor}"/>
    <circle cx="-28" cy="8" r="2.5" fill="${primaryColor}"/>
    <circle cx="-8" cy="28" r="2.5" fill="${primaryColor}"/>
  </g>
  <!-- Bottom-Left -->
  <g transform="translate(30, 420)">
    <path d="M 0,-40 L 0,0 L 40,0 M 6,-34 L 6,-6 L 34,-6 M 0,0 L 25,-25" stroke="${primaryColor}" stroke-width="2" fill="none"/>
    <circle cx="15" cy="-15" r="4" fill="${secondaryColor}"/>
    <circle cx="28" cy="-8" r="2.5" fill="${primaryColor}"/>
    <circle cx="8" cy="-28" r="2.5" fill="${primaryColor}"/>
  </g>
  <!-- Bottom-Right -->
  <g transform="translate(570, 420)">
    <path d="M 0,-40 L 0,0 L -40,0 M -6,-34 L -6,-6 L -34,-6 M 0,0 L -25,-25" stroke="${primaryColor}" stroke-width="2" fill="none"/>
    <circle cx="-15" cy="-15" r="4" fill="${secondaryColor}"/>
    <circle cx="-28" cy="-8" r="2.5" fill="${primaryColor}"/>
    <circle cx="-8" cy="-28" r="2.5" fill="${primaryColor}"/>
  </g>

  <!-- Top Crown / Badge Crest -->
  <g transform="translate(300, 26)">
    <rect x="-110" y="-12" width="220" height="24" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="2"/>
    <text data-field-id="headerText" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
      ${header}
    </text>
  </g>

  <!-- Bottom Crest Plaque -->
  <g transform="translate(300, 422)">
    <rect x="-90" y="-10" width="180" height="20" rx="10" fill="${bg}" stroke="${secondaryColor}" stroke-width="1.5"/>
    <text data-field-id="footerText" x="0" y="4" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
      ${footer}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_vintage_victorian",
    name: "إطار فيكتوري عتيق",
    nameEn: "Victorian Vintage Frame",
    category: "frames",
    shape: "rect",
    description: "إطار كلاسيكي عتيق بنقوش فيليجري متناظرة للصور التذكارية والبورتريه",
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: "#78350F",
      secondary: "#B45309",
      background: "#FFFDF7",
    },
    fields: [
      { id: "titleText", label: "عنوان اللوحة", type: "text", defaultValue: "ذكريات أصيلة" },
      { id: "subtitleText", label: "النص الفرعي", type: "text", defaultValue: "VINTAGE COLLECTION" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.titleText || "");
      const sub = escapeXml(fields.subtitleText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <!-- Outer Decorative Border -->
  <rect x="15" y="15" width="470" height="620" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <!-- Beaded Inner Border -->
  <rect x="28" y="28" width="444" height="594" rx="8" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="3,6"/>
  <!-- Inner Fine Cutout Line -->
  <rect x="42" y="42" width="416" height="566" rx="6" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>

  <!-- Ornate Filigree Corner Patterns -->
  <!-- Top Left -->
  <path d="M 42,90 Q 42,42 90,42 M 52,80 Q 52,52 80,52 M 65,42 Q 65,65 42,65 M 42,42 L 75,75" stroke="${secondaryColor}" stroke-width="2" fill="none"/>
  <!-- Top Right -->
  <path d="M 458,90 Q 458,42 410,42 M 448,80 Q 448,52 420,52 M 435,42 Q 435,65 458,65 M 458,42 L 425,75" stroke="${secondaryColor}" stroke-width="2" fill="none"/>
  <!-- Bottom Left -->
  <path d="M 42,560 Q 42,608 90,608 M 52,570 Q 52,598 80,598 M 65,608 Q 65,585 42,585 M 42,608 L 75,575" stroke="${secondaryColor}" stroke-width="2" fill="none"/>
  <!-- Bottom Right -->
  <path d="M 458,560 Q 458,608 410,608 M 448,570 Q 448,598 420,598 M 435,608 Q 435,585 458,585 M 458,608 L 425,575" stroke="${secondaryColor}" stroke-width="2" fill="none"/>

  <!-- Bottom Banner Ribbon -->
  <g transform="translate(250, 608)">
    <rect x="-110" y="-18" width="220" height="26" rx="13" fill="${bg}" stroke="${primaryColor}" stroke-width="2"/>
    <text data-field-id="titleText" x="0" y="-1" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
      ${title}
    </text>
  </g>
  <text data-field-id="subtitleText" x="250" y="38" font-family="${fontFamily}, sans-serif" font-size="${Math.round(10 * fs)}" font-weight="700" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "frame_islamic_arabesque",
    name: "إطار أرابيسك إسلامي",
    nameEn: "Islamic Arabesque Frame",
    category: "frames",
    shape: "square",
    description: "إطار تراثي إسلامي بنجوم ثمانية هندسية وزخارف زاوية بديعة",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 100, height: 100 },
    defaultColors: {
      primary: "#047857",
      secondary: "#D97706",
      background: "#F0FDF4",
    },
    fields: [
      { id: "topBar", label: "العبارة العلوية", type: "text", defaultValue: "بسم الله الرحمن الرحيم" },
      { id: "bottomBar", label: "العبارة السفلية", type: "text", defaultValue: "بارك الله لكم" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topBar || "");
      const btm = escapeXml(fields.bottomBar || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect x="12" y="12" width="476" height="476" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="24" y="24" width="452" height="452" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
  <rect x="32" y="32" width="436" height="436" fill="none" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="8,4"/>

  <!-- 8-Point Islamic Star in corners -->
  <g transform="translate(50, 50)">
    <rect x="-10" y="-10" width="20" height="20" fill="${primaryColor}"/>
    <rect x="-10" y="-10" width="20" height="20" transform="rotate(45)" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(450, 50)">
    <rect x="-10" y="-10" width="20" height="20" fill="${primaryColor}"/>
    <rect x="-10" y="-10" width="20" height="20" transform="rotate(45)" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(50, 450)">
    <rect x="-10" y="-10" width="20" height="20" fill="${primaryColor}"/>
    <rect x="-10" y="-10" width="20" height="20" transform="rotate(45)" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(450, 450)">
    <rect x="-10" y="-10" width="20" height="20" fill="${primaryColor}"/>
    <rect x="-10" y="-10" width="20" height="20" transform="rotate(45)" fill="${secondaryColor}"/>
  </g>

  <!-- Islamic Arch Headers -->
  <g transform="translate(250, 24)">
    <rect x="-100" y="-12" width="200" height="24" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5"/>
    <text data-field-id="topBar" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
      ${top}
    </text>
  </g>
  <g transform="translate(250, 476)">
    <rect x="-80" y="-12" width="160" height="24" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5"/>
    <text data-field-id="bottomBar" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
      ${btm}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_modern_minimal_corners",
    name: "إطار ستوديو مينيمال",
    nameEn: "Modern Studio Minimal Frame",
    category: "frames",
    shape: "rect",
    description: "إطار عصري أنيق بخطوط رفيعة وزوايا L هندسية متداخلة للتصاميم المعاصرة",
    defaultWidth: 500,
    defaultHeight: 600,
    aspectRatio: 500 / 600,
    defaultMm: { width: 100, height: 120 },
    defaultColors: {
      primary: "#0F172A",
      secondary: "#64748B",
      background: "#FFFFFF",
    },
    fields: [
      { id: "studioName", label: "اسم الاستوديو", type: "text", defaultValue: "GRIDO STUDIO" },
      { id: "collection", label: "المجموعة / الأرشيف", type: "text", defaultValue: "ARCHIVE // 2026" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const studio = escapeXml(fields.studioName || "STUDIO");
      const col = escapeXml(fields.collection || "COLLECTION");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600">
  <rect x="20" y="20" width="460" height="560" fill="${bg}" stroke="${secondaryColor}" stroke-width="1" data-color-role="background"/>

  <!-- Bold Heavy L-Corners -->
  <!-- Top Left -->
  <path d="M 12,60 L 12,12 L 60,12" fill="none" stroke="${primaryColor}" stroke-width="4"/>
  <!-- Top Right -->
  <path d="M 488,60 L 488,12 L 440,12" fill="none" stroke="${primaryColor}" stroke-width="4"/>
  <!-- Bottom Left -->
  <path d="M 12,540 L 12,588 L 60,588" fill="none" stroke="${primaryColor}" stroke-width="4"/>
  <!-- Bottom Right -->
  <path d="M 488,540 L 488,588 L 440,588" fill="none" stroke="${primaryColor}" stroke-width="4"/>

  <!-- Precision Crosshair Center Marks -->
  <path d="M 250,8 L 250,16 M 250,584 L 250,592 M 8,300 L 16,300 M 484,300 L 492,300" stroke="${secondaryColor}" stroke-width="2"/>

  <!-- Metadata Typography -->
  <text data-field-id="studioName" x="250" y="44" font-family="${fontFamily}, monospace" font-size="${Math.round(11 * fs)}" font-weight="800" letter-spacing="3" fill="${primaryColor}" text-anchor="middle">
    ${studio}
  </text>
  <text data-field-id="collection" x="250" y="570" font-family="${fontFamily}, monospace" font-size="${Math.round(9 * fs)}" font-weight="700" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    ${col}
  </text>
</svg>`;
    },
  },
  {
    id: "frame_floral_botanical",
    name: "إطار أزهار ونباتات ناعم",
    nameEn: "Botanical Floral Frame",
    category: "frames",
    shape: "rect",
    description: "إطار أزهار وأوراق شجر رقيقة لمناسبات الزفاف والمواليد والبطاقات",
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: "#BE185D",
      secondary: "#047857",
      background: "#FFF1F2",
    },
    fields: [
      { id: "topText", label: "العبارة العلوية", type: "text", defaultValue: "أجمل اللحظات" },
      { id: "dateText", label: "التاريخ أو المناسبة", type: "text", defaultValue: "SAVE THE DATE" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const date = escapeXml(fields.dateText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <!-- Rounded Center Canvas -->
  <rect x="25" y="25" width="450" height="600" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,4" data-color-role="background"/>
  <rect x="35" y="35" width="430" height="580" rx="14" fill="none" stroke="${secondaryColor}" stroke-width="1"/>

  <!-- Floral Corner Accents -->
  <g transform="translate(35, 35)">
    <path d="M 0,0 Q 25,10 35,35 Q 10,25 0,0 Z" fill="${secondaryColor}" opacity="0.8"/>
    <circle cx="20" cy="20" r="8" fill="${primaryColor}"/>
    <circle cx="20" cy="20" r="4" fill="#FDE047"/>
  </g>
  <g transform="translate(465, 35) scale(-1, 1)">
    <path d="M 0,0 Q 25,10 35,35 Q 10,25 0,0 Z" fill="${secondaryColor}" opacity="0.8"/>
    <circle cx="20" cy="20" r="8" fill="${primaryColor}"/>
    <circle cx="20" cy="20" r="4" fill="#FDE047"/>
  </g>
  <g transform="translate(35, 615) scale(1, -1)">
    <path d="M 0,0 Q 25,10 35,35 Q 10,25 0,0 Z" fill="${secondaryColor}" opacity="0.8"/>
    <circle cx="20" cy="20" r="8" fill="${primaryColor}"/>
    <circle cx="20" cy="20" r="4" fill="#FDE047"/>
  </g>
  <g transform="translate(465, 615) scale(-1, -1)">
    <path d="M 0,0 Q 25,10 35,35 Q 10,25 0,0 Z" fill="${secondaryColor}" opacity="0.8"/>
    <circle cx="20" cy="20" r="8" fill="${primaryColor}"/>
    <circle cx="20" cy="20" r="4" fill="#FDE047"/>
  </g>

  <!-- Typography -->
  <text data-field-id="topText" x="250" y="60" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${top}
  </text>
  <text data-field-id="dateText" x="250" y="595" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="700" letter-spacing="3" fill="${secondaryColor}" text-anchor="middle">
    ${date}
  </text>
</svg>`;
    },
  },
  {
    id: "frame_polaroid_retro",
    name: "إطار بولارويد كلاسيكي",
    nameEn: "Retro Polaroid Frame",
    category: "frames",
    shape: "rect",
    description: "إطار صور بولارويد الفورية الكلاسيكي مع مساحة للتعليق اليدوي وتاريخ الصورة",
    defaultWidth: 460,
    defaultHeight: 560,
    aspectRatio: 460 / 560,
    defaultMm: { width: 92, height: 112 },
    defaultColors: {
      primary: "#1E293B",
      secondary: "#94A3B8",
      background: "#FFFFFF",
    },
    fields: [
      { id: "caption", label: "التعليق المكتوب", type: "text", defaultValue: "ذكريات جميلة لا تُنسى ♡" },
      { id: "dateText", label: "تاريخ الالتقاط", type: "text", defaultValue: "2026.09.14" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const caption = escapeXml(fields.caption || "");
      const date = escapeXml(fields.dateText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 560" width="460" height="560">
  <defs>
    <filter id="pol-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.12"/>
    </filter>
  </defs>
  <!-- Polaroid Outer Body -->
  <rect x="15" y="15" width="430" height="530" rx="4" fill="${bg}" stroke="${secondaryColor}" stroke-width="1.5" filter="url(#pol-shadow)" data-color-role="background"/>

  <!-- Transparent Photo Window Cutout -->
  <rect x="35" y="35" width="390" height="390" fill="none" stroke="${secondaryColor}" stroke-width="1"/>

  <!-- Top Washi Tape Sticker Accent -->
  <rect x="180" y="8" width="100" height="24" rx="2" fill="#FDE047" opacity="0.85" transform="rotate(-2 230 20)"/>

  <!-- Bottom Handwritten Caption Section -->
  <text data-field-id="caption" x="230" y="475" font-family="${fontFamily}, cursive, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${caption}
  </text>
  <text data-field-id="dateText" x="230" y="515" font-family="${fontFamily}, monospace" font-size="${Math.round(12 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${date}
  </text>
</svg>`;
    },
  },
  {
    id: "frame_serrated_postage_stamp",
    name: "إطار طابع بريدي مسنن",
    nameEn: "Postage Stamp Frame",
    category: "frames",
    shape: "square",
    description: "إطار طابع بريدي مسنن الحواف للصور التذكارية والمراسلات الفاخرة",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 100, height: 100 },
    defaultColors: {
      primary: "#B91C1C",
      secondary: "#1E3A8A",
      background: "#FFFBEB",
    },
    fields: [
      { id: "postTitle", label: "عنوان الطابع", type: "text", defaultValue: "POSTAGE • طابع تذكاري" },
      { id: "priceTag", label: "القيمة الاسمية", type: "text", defaultValue: "250 د.ع" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.postTitle || "");
      const price = escapeXml(fields.priceTag || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      // Scalloped perforated border points
      const n = 16;
      const w = 460;
      const h = 460;
      const offX = 20;
      const offY = 20;
      const holeR = 6;

      let holes = "";
      for (let i = 1; i < n; i++) {
        const x = offX + (w * i) / n;
        holes += `<circle cx="${x}" cy="${offY}" r="${holeR}" fill="#ffffff"/>`;
        holes += `<circle cx="${x}" cy="${offY + h}" r="${holeR}" fill="#ffffff"/>`;
      }
      for (let i = 1; i < n; i++) {
        const y = offY + (h * i) / n;
        holes += `<circle cx="${offX}" cy="${y}" r="${holeR}" fill="#ffffff"/>`;
        holes += `<circle cx="${offX + w}" cy="${y}" r="${holeR}" fill="#ffffff"/>`;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect x="20" y="20" width="460" height="460" rx="4" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  ${holes}

  <!-- Inner Solid Frame -->
  <rect x="44" y="44" width="412" height="412" rx="2" fill="none" stroke="${primaryColor}" stroke-width="3"/>
  <rect x="52" y="52" width="396" height="396" rx="1" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6,3"/>

  <!-- Postal Header & Value -->
  <text data-field-id="postTitle" x="250" y="74" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="800" letter-spacing="2" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="priceTag" x="250" y="435" font-family="${fontFamily}, monospace" font-size="${Math.round(13 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${price}
  </text>
</svg>`;
    },
  },
  {
    id: "frame_art_deco_luxury",
    name: "إطار آرت ديكو ذهبي",
    nameEn: "Art Deco Luxury Frame",
    category: "frames",
    shape: "rect",
    description: "إطار آرت ديكو هندسي راقٍ بزوايا متدرجة وخطوط متوازية للتصاميم الفاخرة",
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: "#CA8A04",
      secondary: "#18181B",
      background: "#09090B",
    },
    fields: [
      { id: "topLabel", label: "الشارة العليا", type: "text", defaultValue: "EXCELLENCE & LUXURY" },
      { id: "bottomLabel", label: "الشارة السفلى", type: "text", defaultValue: "VIP EDITION" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topLabel || "");
      const btm = escapeXml(fields.bottomLabel || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <rect x="15" y="15" width="470" height="620" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <rect x="25" y="25" width="450" height="600" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>
  <rect x="35" y="35" width="430" height="580" fill="none" stroke="${primaryColor}" stroke-width="1"/>

  <!-- Art Deco Stepped Corner Fans -->
  <path d="M 35,80 L 80,35 M 35,65 L 65,35 M 35,50 L 50,35 M 35,35 L 35,95 L 95,35 Z" fill="${primaryColor}" opacity="0.25"/>
  <path d="M 465,80 L 420,35 M 465,65 L 435,35 M 465,50 L 450,35 M 465,35 L 465,95 L 405,35 Z" fill="${primaryColor}" opacity="0.25"/>
  <path d="M 35,570 L 80,615 M 35,585 L 65,615 M 35,600 L 50,615 M 35,615 L 35,555 L 95,615 Z" fill="${primaryColor}" opacity="0.25"/>
  <path d="M 465,570 L 420,615 M 465,585 L 435,615 M 465,600 L 450,615 M 465,615 L 465,555 L 405,615 Z" fill="${primaryColor}" opacity="0.25"/>

  <!-- Decorative Corner Rhombus -->
  <polygon points="35,35 45,35 35,45" fill="${primaryColor}"/>
  <polygon points="465,35 455,35 465,45" fill="${primaryColor}"/>
  <polygon points="35,615 45,615 35,605" fill="${primaryColor}"/>
  <polygon points="465,615 455,615 465,605" fill="${primaryColor}"/>

  <!-- Labels -->
  <g transform="translate(250, 26)">
    <rect x="-100" y="-10" width="200" height="20" fill="${bg}" stroke="${primaryColor}" stroke-width="1"/>
    <text data-field-id="topLabel" x="0" y="4" font-family="${fontFamily}, sans-serif" font-size="${Math.round(9 * fs)}" font-weight="800" letter-spacing="3" fill="${primaryColor}" text-anchor="middle">
      ${top}
    </text>
  </g>
  <g transform="translate(250, 624)">
    <rect x="-80" y="-10" width="160" height="20" fill="${bg}" stroke="${primaryColor}" stroke-width="1"/>
    <text data-field-id="bottomLabel" x="0" y="4" font-family="${fontFamily}, sans-serif" font-size="${Math.round(10 * fs)}" font-weight="900" letter-spacing="2" fill="${primaryColor}" text-anchor="middle">
      ${btm}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_cyber_neon_glow",
    name: "إطار سايبر نيون تقني",
    nameEn: "Cyber Neon Tech Frame",
    category: "frames",
    shape: "rect",
    description: "إطار تكنولوجي عصري بزوايا مقطوعة ومؤشرات رقمية متوهجة",
    defaultWidth: 500,
    defaultHeight: 600,
    aspectRatio: 500 / 600,
    defaultMm: { width: 100, height: 120 },
    defaultColors: {
      primary: "#06B6D4",
      secondary: "#A855F7",
      background: "#0F172A",
    },
    fields: [
      { id: "hudTitle", label: "عنوان النظام", type: "text", defaultValue: "SYSTEM // ONLINE" },
      { id: "tag", label: "الوسم التقني", type: "text", defaultValue: "ID: #2026-X" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.hudTitle || "");
      const tag = escapeXml(fields.tag || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      const p = "M 40,15 L 460,15 L 485,40 L 485,560 L 460,585 L 40,585 L 15,560 L 15,40 Z";

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 600" width="500" height="600">
  <defs>
    <filter id="neon-glow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="${primaryColor}" flood-opacity="0.6"/>
    </filter>
  </defs>
  <path d="${p}" fill="${bg}" stroke="${primaryColor}" stroke-width="3" filter="url(#neon-glow)" data-color-role="background"/>
  <path d="M 50,30 L 450,30 L 470,50 L 470,550 L 450,570 L 50,570 L 30,550 L 30,50 Z" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="10,5"/>

  <!-- Tech Corner Bracket Notches -->
  <path d="M 15,90 L 15,40 L 40,15 L 90,15" fill="none" stroke="${secondaryColor}" stroke-width="3"/>
  <path d="M 485,90 L 485,40 L 460,15 L 410,15" fill="none" stroke="${secondaryColor}" stroke-width="3"/>
  <path d="M 15,510 L 15,560 L 40,585 L 90,585" fill="none" stroke="${secondaryColor}" stroke-width="3"/>
  <path d="M 485,510 L 485,560 L 460,585 L 410,585" fill="none" stroke="${secondaryColor}" stroke-width="3"/>

  <!-- HUD Labels -->
  <g transform="translate(45, 26)">
    <rect x="0" y="0" width="130" height="18" rx="2" fill="${primaryColor}"/>
    <text data-field-id="hudTitle" x="65" y="13" font-family="${fontFamily}, monospace" font-size="${Math.round(9 * fs)}" font-weight="900" fill="#0F172A" text-anchor="middle">
      ${title}
    </text>
  </g>
  <g transform="translate(355, 568)">
    <rect x="0" y="0" width="100" height="16" rx="2" fill="${secondaryColor}"/>
    <text data-field-id="tag" x="50" y="12" font-family="${fontFamily}, monospace" font-size="${Math.round(8 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${tag}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_double_gold_filigree",
    name: "إطار تكريم وفيليجري ملكي",
    nameEn: "Double Gold Filigree Frame",
    category: "frames",
    shape: "rect",
    description: "إطار شرفي فاخر مزدوج بزوايا فيليجري متموجة للشهادات والتكريمات الكبرى",
    defaultWidth: 600,
    defaultHeight: 480,
    aspectRatio: 600 / 480,
    defaultMm: { width: 150, height: 120 },
    defaultColors: {
      primary: "#D97706",
      secondary: "#92400E",
      background: "#FFFDF5",
    },
    fields: [
      { id: "header", label: "عنوان التكريم", type: "text", defaultValue: "وسام الإبداع والتميز" },
      { id: "award", label: "الدرجة أو المرتبة", type: "text", defaultValue: "المرتبة الأولى ★★★★★" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const header = escapeXml(fields.header || "");
      const award = escapeXml(fields.award || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 480" width="600" height="480">
  <rect x="15" y="15" width="570" height="450" rx="10" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="25" y="25" width="550" height="430" rx="8" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>
  <rect x="35" y="35" width="530" height="410" rx="6" fill="none" stroke="${primaryColor}" stroke-width="2"/>

  <!-- Ornate Wave Corners -->
  <g transform="translate(35, 35)">
    <path d="M 0,35 Q 20,20 35,0 M 0,25 Q 15,15 25,0 M 0,15 Q 10,10 15,0" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
    <circle cx="20" cy="20" r="3" fill="${primaryColor}"/>
  </g>
  <g transform="translate(565, 35) scale(-1, 1)">
    <path d="M 0,35 Q 20,20 35,0 M 0,25 Q 15,15 25,0 M 0,15 Q 10,10 15,0" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
    <circle cx="20" cy="20" r="3" fill="${primaryColor}"/>
  </g>
  <g transform="translate(35, 445) scale(1, -1)">
    <path d="M 0,35 Q 20,20 35,0 M 0,25 Q 15,15 25,0 M 0,15 Q 10,10 15,0" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
    <circle cx="20" cy="20" r="3" fill="${primaryColor}"/>
  </g>
  <g transform="translate(565, 445) scale(-1, -1)">
    <path d="M 0,35 Q 20,20 35,0 M 0,25 Q 15,15 25,0 M 0,15 Q 10,10 15,0" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
    <circle cx="20" cy="20" r="3" fill="${primaryColor}"/>
  </g>

  <!-- Top Ribbon -->
  <g transform="translate(300, 25)">
    <rect x="-110" y="-12" width="220" height="24" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="2"/>
    <text data-field-id="header" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
      ${header}
    </text>
  </g>

  <!-- Bottom Award Label -->
  <g transform="translate(300, 455)">
    <rect x="-90" y="-10" width="180" height="20" rx="10" fill="${primaryColor}"/>
    <text data-field-id="award" x="0" y="4" font-family="${fontFamily}, sans-serif" font-size="${Math.round(10 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${award}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_diploma_scroll",
    name: "إطار شهادة الدبلوم والوثيقة الأكاديمية",
    nameEn: "Academic Diploma Scroll Frame",
    category: "frames",
    shape: "rect",
    description: "إطار تخرج وشهادات أكاديمية مع نقوش أركان يونانية مذهبة وتسمية جامعية",
    defaultWidth: 600,
    defaultHeight: 450,
    aspectRatio: 600 / 450,
    defaultMm: { width: 150, height: 112 },
    defaultColors: {
      primary: "#1E3A8A",
      secondary: "#B45309",
      background: "#FFFDF5",
    },
    fields: [
      { id: "title", label: "عنوان الوثيقة", type: "text", defaultValue: "وثيقة تخرج جامعية معتمدة" },
      { id: "institution", label: "اسم الجامعة / المؤسسة", type: "text", defaultValue: "جامعة الرافدين الأكاديمية" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.title || "");
      const inst = escapeXml(fields.institution || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <!-- Outer Parchment Background -->
  <rect x="12" y="12" width="576" height="426" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Greek Key / Meander Accent Line -->
  <rect x="22" y="22" width="556" height="406" rx="4" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
  <rect x="28" y="28" width="544" height="394" rx="2" fill="none" stroke="${primaryColor}" stroke-width="1" stroke-dasharray="8,4"/>
  
  <!-- Academic Laurel Top Center Emblem -->
  <g transform="translate(300, 24)">
    <rect x="-130" y="-12" width="260" height="24" rx="12" fill="${bg}" stroke="${secondaryColor}" stroke-width="2"/>
    <circle cx="-110" cy="0" r="5" fill="${secondaryColor}"/>
    <circle cx="110" cy="0" r="5" fill="${secondaryColor}"/>
    <text data-field-id="title" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
      ${title}
    </text>
  </g>

  <!-- Ornate Greek Corner Scrolls -->
  <g transform="translate(32, 32)">
    <path d="M 0,35 L 0,0 L 35,0 M 6,28 L 6,6 L 28,6 M 12,20 L 12,12 L 20,12" fill="none" stroke="${primaryColor}" stroke-width="2"/>
    <circle cx="16" cy="16" r="3.5" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(568, 32)">
    <path d="M 0,35 L 0,0 L -35,0 M -6,28 L -6,6 L -28,6 M -12,20 L -12,12 L -20,12" fill="none" stroke="${primaryColor}" stroke-width="2"/>
    <circle cx="-16" cy="16" r="3.5" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(32, 418)">
    <path d="M 0,-35 L 0,0 L 35,0 M 6,-28 L 6,-6 L 28,-6 M 12,-20 L 12,-12 L 20,-12" fill="none" stroke="${primaryColor}" stroke-width="2"/>
    <circle cx="16" cy="-16" r="3.5" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(568, 418)">
    <path d="M 0,-35 L 0,0 L -35,0 M -6,-28 L -6,-6 L -28,-6 M -12,-20 L -12,-12 L -20,-12" fill="none" stroke="${primaryColor}" stroke-width="2"/>
    <circle cx="-16" cy="-16" r="3.5" fill="${secondaryColor}"/>
  </g>

  <!-- Bottom Institutional Bar -->
  <g transform="translate(300, 426)">
    <rect x="-140" y="-12" width="280" height="24" rx="6" fill="${primaryColor}"/>
    <text data-field-id="institution" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
      ${inst}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_baroque_ornate",
    name: "إطار الباروك الأوروبي العتيق",
    nameEn: "Baroque Ornate Vintage Frame",
    category: "frames",
    shape: "square",
    description: "إطار فني كلاسيكي مذهب ومستوحى من قصور الباروك للوحات الفنية والصور التذكارية",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#B45309",
      secondary: "#78350F",
      background: "#FFFBEB",
    },
    fields: [
      { id: "header", label: "عنوان اللوحة", type: "text", defaultValue: "لوحة تذكارية تراثية" },
      { id: "sub", label: "الوصف الفني", type: "text", defaultValue: "فن وأصالة عريقة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const header = escapeXml(fields.header || "");
      const sub = escapeXml(fields.sub || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect x="15" y="15" width="470" height="470" rx="10" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>
  <rect x="25" y="25" width="450" height="450" rx="8" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <rect x="35" y="35" width="430" height="430" rx="6" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6,3"/>

  <!-- Ornate Baroque Corner Flourishes -->
  <g transform="translate(35, 35)">
    <path d="M 0,45 C 10,30 25,25 25,0 C 35,15 35,35 45,0 C 30,25 35,35 0,45 Z" fill="${primaryColor}" opacity="0.85"/>
    <circle cx="18" cy="18" r="4" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(465, 35) scale(-1, 1)">
    <path d="M 0,45 C 10,30 25,25 25,0 C 35,15 35,35 45,0 C 30,25 35,35 0,45 Z" fill="${primaryColor}" opacity="0.85"/>
    <circle cx="18" cy="18" r="4" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(35, 465) scale(1, -1)">
    <path d="M 0,45 C 10,30 25,25 25,0 C 35,15 35,35 45,0 C 30,25 35,35 0,45 Z" fill="${primaryColor}" opacity="0.85"/>
    <circle cx="18" cy="18" r="4" fill="${secondaryColor}"/>
  </g>
  <g transform="translate(465, 465) scale(-1, -1)">
    <path d="M 0,45 C 10,30 25,25 25,0 C 35,15 35,35 45,0 C 30,25 35,35 0,45 Z" fill="${primaryColor}" opacity="0.85"/>
    <circle cx="18" cy="18" r="4" fill="${secondaryColor}"/>
  </g>

  <!-- Top Ornate Shell Crest -->
  <g transform="translate(250, 25)">
    <rect x="-95" y="-12" width="190" height="24" rx="12" fill="${bg}" stroke="${secondaryColor}" stroke-width="2"/>
    <text data-field-id="header" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
      ${header}
    </text>
  </g>

  <!-- Bottom Vintage Tag -->
  <g transform="translate(250, 475)">
    <rect x="-75" y="-10" width="150" height="20" rx="10" fill="${primaryColor}"/>
    <text data-field-id="sub" x="0" y="4" font-family="${fontFamily}, sans-serif" font-size="${Math.round(10 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
      ${sub}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_wooden_rustic",
    name: "إطار الخشب الريفي الطبيعي",
    nameEn: "Rustic Wooden Craft Frame",
    category: "frames",
    shape: "rect",
    description: "إطار خشبي دافئ للصور العائلية ومطاعم الأكلات التراثية مع محاكاة عقد الخشب الطبيعية",
    defaultWidth: 560,
    defaultHeight: 420,
    aspectRatio: 560 / 420,
    defaultColors: {
      primary: "#78350F",
      secondary: "#92400E",
      background: "#FEF3C7",
    },
    fields: [
      { id: "label", label: "عنوان الذكرى", type: "text", defaultValue: "ذكريات دافئة لا تُنسى" },
      { id: "year", label: "سنة التأسيس / المناسبة", type: "text", defaultValue: "EST. 2026" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const label = escapeXml(fields.label || "");
      const yr = escapeXml(fields.year || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 420" width="560" height="420">
  <!-- Wooden Outer Planks -->
  <rect x="10" y="10" width="540" height="400" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <rect x="24" y="24" width="512" height="372" rx="4" fill="none" stroke="${secondaryColor}" stroke-width="2"/>

  <!-- Metal Corner Nails & Fasteners -->
  <g transform="translate(24, 24)">
    <circle cx="0" cy="0" r="6" fill="${primaryColor}"/>
    <path d="M -3,-3 L 3,3 M -3,3 L 3,-3" stroke="#FFFFFF" stroke-width="1.5"/>
  </g>
  <g transform="translate(536, 24)">
    <circle cx="0" cy="0" r="6" fill="${primaryColor}"/>
    <path d="M -3,-3 L 3,3 M -3,3 L 3,-3" stroke="#FFFFFF" stroke-width="1.5"/>
  </g>
  <g transform="translate(24, 396)">
    <circle cx="0" cy="0" r="6" fill="${primaryColor}"/>
    <path d="M -3,-3 L 3,3 M -3,3 L 3,-3" stroke="#FFFFFF" stroke-width="1.5"/>
  </g>
  <g transform="translate(536, 396)">
    <circle cx="0" cy="0" r="6" fill="${primaryColor}"/>
    <path d="M -3,-3 L 3,3 M -3,3 L 3,-3" stroke="#FFFFFF" stroke-width="1.5"/>
  </g>

  <!-- Top Wood Carved Label -->
  <g transform="translate(280, 24)">
    <rect x="-105" y="-12" width="210" height="24" rx="5" fill="${primaryColor}"/>
    <text data-field-id="label" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${label}
    </text>
  </g>

  <!-- Bottom Year Tag -->
  <g transform="translate(280, 396)">
    <rect x="-55" y="-10" width="110" height="20" rx="4" fill="${secondaryColor}"/>
    <text data-field-id="year" x="0" y="4" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
      ${yr}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "frame_hexagonal_geometric",
    name: "إطار هندسي عصري سداسي",
    nameEn: "Modern Hexagonal Geometric Frame",
    category: "frames",
    shape: "square",
    description: "إطار هندسي مائل ذو خطوط سداسية وزوايا متداخلة ذهبية للمناسبات العصرية والمصممين",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#0D9488",
      secondary: "#115E59",
      background: "#F0FDFA",
    },
    fields: [
      { id: "centerNote", label: "العبارة الإرشادية", type: "text", defaultValue: "لحظات إبداعية مميزة" },
      { id: "tagline", label: "الشعار السفلي", type: "text", defaultValue: "MODERN GEOMETRIC" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const note = escapeXml(fields.centerNote || "");
      const tag = escapeXml(fields.tagline || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <!-- Outer Box -->
  <rect x="18" y="18" width="464" height="464" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="8,6" data-color-role="background"/>
  <!-- Intertwined Geometric Diamonds -->
  <polygon points="250,28 472,250 250,472 28,250" fill="none" stroke="${secondaryColor}" stroke-width="2.5"/>
  <polygon points="250,40 460,250 250,460 40,250" fill="none" stroke="${primaryColor}" stroke-width="1.5"/>

  <!-- Corner Mini Hexagons -->
  <g transform="translate(45, 45)">
    <polygon points="0,-12 10,-6 10,6 0,12 -10,6 -10,-6" fill="${primaryColor}"/>
  </g>
  <g transform="translate(455, 45)">
    <polygon points="0,-12 10,-6 10,6 0,12 -10,6 -10,-6" fill="${primaryColor}"/>
  </g>
  <g transform="translate(45, 455)">
    <polygon points="0,-12 10,-6 10,6 0,12 -10,6 -10,-6" fill="${primaryColor}"/>
  </g>
  <g transform="translate(455, 455)">
    <polygon points="0,-12 10,-6 10,6 0,12 -10,6 -10,-6" fill="${primaryColor}"/>
  </g>

  <!-- Top Note Badge -->
  <g transform="translate(250, 42)">
    <rect x="-90" y="-12" width="180" height="24" rx="12" fill="${bg}" stroke="${secondaryColor}" stroke-width="2"/>
    <text data-field-id="centerNote" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
      ${note}
    </text>
  </g>

  <!-- Bottom Tagline -->
  <g transform="translate(250, 460)">
    <rect x="-80" y="-10" width="160" height="20" rx="10" fill="${secondaryColor}"/>
    <text data-field-id="tagline" x="0" y="4" font-family="${fontFamily}, sans-serif" font-size="${Math.round(10 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
      ${tag}
    </text>
  </g>
</svg>`;
    },
  },
];

