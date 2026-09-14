import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { starPoints, scallopCirclePath } from "./svg-elements";

export const ADDON_TEMPLATES: StickerTemplate[] = [
  {
    id: "badge_verified_trust",
    name: "ختم موثوق ومعتمد رسمي",
    nameEn: "Verified Trust Seal",
    category: "badges",
    shape: "circle",
    description: "شارة توثيق الجودة والأصالة الدائرية مع علامة التحقق المزدوجة",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#2563EB",
      secondary: "#1D4ED8",
      background: "#EFF6FF",
    },
    fields: [
      { id: "topText", label: "النص العلوي", type: "text", defaultValue: "★ متجر موثوق ومعتمد ★" },
      { id: "centerText", label: "الحالة", type: "text", defaultValue: "VERIFIED" },
      { id: "subText", label: "الوصف السفلي", type: "text", defaultValue: "ضمان أمان المعاملات 100%" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const center = escapeXml(fields.centerText || "");
      const sub = escapeXml(fields.subText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const scallopD = scallopCirclePath(250, 250, 220, 24, 1.08);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-vt-top" d="M 90,250 A 160,160 0 0,1 410,250" fill="none"/>
    <path id="badge-vt-btm" d="M 90,250 A 160,160 0 0,0 410,250" fill="none"/>
  </defs>
  <path d="${scallopD}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="195" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" data-color-role="background"/>
  <circle cx="250" cy="250" r="180" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,4"/>

  <!-- Double Checkmark Shield Icon -->
  <g transform="translate(250, 205)">
    <circle cx="0" cy="0" r="36" fill="${primaryColor}"/>
    <path d="M -16,-2 L -6,8 L 16,-14" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- Typography -->
  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-vt-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="centerText" x="250" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" letter-spacing="3" fill="${primaryColor}" text-anchor="middle">
    ${center}
  </text>
  <text data-field-id="subText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-vt-btm" startOffset="50%">${sub}</textPath>
  </text>
</svg>`;
    },
  },
  {
    id: "badge_handmade_love",
    name: "ختم صنع يدوياً بكل حب",
    nameEn: "Handmade With Love Seal",
    category: "badges",
    shape: "circle",
    description: "ختم حِرفي لطيف ومحبب للمنتجات اليدوية، الإكسسوارات، والحلويات",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#E11D48",
      secondary: "#9F1239",
      background: "#FFF1F2",
    },
    fields: [
      { id: "topText", label: "النص المقوس", type: "text", defaultValue: "HANDMADE WITH LOVE" },
      { id: "centerText", label: "النص الأوسط", type: "text", defaultValue: "صُنع يدوياً" },
      { id: "subText", label: "النص السفلي", type: "text", defaultValue: "بكل حب وعناية ♡" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const center = escapeXml(fields.centerText || "");
      const sub = escapeXml(fields.subText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-hm-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <!-- Sewing Stitches Outer Ring -->
  <circle cx="250" cy="250" r="230" fill="${bg}" stroke="${primaryColor}" stroke-width="4" stroke-dasharray="10,6" data-color-role="background"/>
  <circle cx="250" cy="250" r="212" fill="none" stroke="${secondaryColor}" stroke-width="2"/>

  <!-- Floating Heart Motif -->
  <g transform="translate(250, 195) scale(1.4)">
    <path d="M 0,-10 C -15,-30 -40,-15 -40,10 C -40,30 0,50 0,50 C 0,50 40,30 40,10 C 40,-15 15,-30 0,-10 Z" fill="${primaryColor}"/>
  </g>

  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" letter-spacing="3" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-hm-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="centerText" x="250" y="320" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${center}
  </text>
  <text data-field-id="subText" x="250" y="365" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "badge_eco_friendly",
    name: "ختم صديق للبيئة وعضوي",
    nameEn: "Eco Friendly Green Stamp",
    category: "badges",
    shape: "circle",
    description: "ختم بيئي طبيعي للمنتجات العضوية والقابلة للتدوير ومستحضرات الطبيعة",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#15803D",
      secondary: "#166534",
      background: "#F0FDF4",
    },
    fields: [
      { id: "topText", label: "النص العلوي", type: "text", defaultValue: "100% ECO FRIENDLY" },
      { id: "mainText", label: "النص الرئيسي", type: "text", defaultValue: "صديق للبيئة" },
      { id: "subText", label: "النص الفرعي", type: "text", defaultValue: "عضوي • طبيعي • قابل لإعادة التدوير" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const main = escapeXml(fields.mainText || "");
      const sub = escapeXml(fields.subText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-eco-arc" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <circle cx="250" cy="250" r="230" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <circle cx="250" cy="250" r="210" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="8,5"/>

  <!-- Sprouting Twin Leaves -->
  <g transform="translate(250, 190) scale(1.3)">
    <path d="M 0,25 C -25,-5 -35,-40 0,-45 C 5,-20 15,10 0,25 Z" fill="${primaryColor}"/>
    <path d="M 0,25 C 25,-5 35,-40 0,-45 C -5,-20 -15,10 0,25 Z" fill="${secondaryColor}" opacity="0.85"/>
    <path d="M 0,25 L 0,-45" stroke="#FFFFFF" stroke-width="2"/>
  </g>

  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="900" letter-spacing="3" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-eco-arc" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" x="250" y="300" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="250" y="345" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "badge_best_seller",
    name: "ختم الأكثر مبيعاً الأفضل",
    nameEn: "Best Seller Trophy Badge",
    category: "badges",
    shape: "circle",
    description: "شارة مبيعات كبرى للمنتجات المتصدرة والسلع الأعلى تقييماً",
    defaultWidth: 500,
    defaultHeight: 520,
    aspectRatio: 500 / 520,
    defaultColors: {
      primary: "#EA580C",
      secondary: "#9A3412",
      background: "#FFF7ED",
    },
    fields: [
      { id: "rankText", label: "الترتيب", type: "text", defaultValue: "#1" },
      { id: "titleText", label: "العنوان الرئيسي", type: "text", defaultValue: "الأكثر مبيعاً" },
      { id: "ribbonText", label: "نص الوشاح", type: "text", defaultValue: "BEST SELLER" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const rank = escapeXml(fields.rankText || "#1");
      const title = escapeXml(fields.titleText || "");
      const ribbon = escapeXml(fields.ribbonText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const star = starPoints(250, 220, 20, 200, 180);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 520" width="500" height="520">
  <!-- Sunburst Star Base -->
  <polygon points="${star}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="220" r="160" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" data-color-role="background"/>

  <!-- Trophy Cup -->
  <g transform="translate(250, 150) scale(1.1)">
    <path d="M -25,-25 H 25 V 0 C 25,18 10,25 0,25 C -10,25 -25,18 -25,0 Z" fill="${primaryColor}"/>
    <path d="M -25,-15 C -40,-15 -40,5 -25,5 M 25,-15 C 40,-15 40,5 25,5" fill="none" stroke="${primaryColor}" stroke-width="4"/>
    <path d="M 0,25 V 38 M -15,38 H 15" stroke="${secondaryColor}" stroke-width="5" stroke-linecap="round"/>
  </g>

  <text data-field-id="rankText" x="250" y="240" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${rank}
  </text>
  <text data-field-id="titleText" x="250" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>

  <!-- Bottom Ribbon Banner -->
  <g transform="translate(250, 440)">
    <path d="M -180,0 L -210,-20 L -180,-40 H 180 L 210,-20 L 180,0 Z" fill="${secondaryColor}"/>
    <rect x="-160" y="-36" width="320" height="32" rx="4" fill="${primaryColor}"/>
    <text data-field-id="ribbonText" x="0" y="-14" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="900" letter-spacing="4" fill="#FFFFFF" text-anchor="middle">
      ${ribbon}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "retail_buy1_get1",
    name: "ملصق اشتري 1 واحصل على 1 مجاناً",
    nameEn: "Buy 1 Get 1 Free Promo",
    category: "retail",
    shape: "rect",
    description: "ملصق ترويجي جاذب لعروض BOGO الترويجية للمتاجر والمولات",
    defaultWidth: 500,
    defaultHeight: 300,
    aspectRatio: 500 / 300,
    defaultMm: { width: 100, height: 60 },
    defaultColors: {
      primary: "#DC2626",
      secondary: "#FBBF24",
      background: "#991B1B",
    },
    fields: [
      { id: "badge", label: "شارة العرض", type: "text", defaultValue: "عرض خاص ومحدود" },
      { id: "mainText", label: "العرض الرئيسي", type: "text", defaultValue: "اشترِ 1 واحصل على 1" },
      { id: "highlight", label: "الكلمة البارزة", type: "text", defaultValue: "مـجـانـاً !" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const badge = escapeXml(fields.badge || "");
      const main = escapeXml(fields.mainText || "");
      const hl = escapeXml(fields.highlight || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300">
  <rect x="10" y="10" width="480" height="280" rx="16" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="20" y="20" width="460" height="260" rx="10" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="8,6" opacity="0.4"/>

  <!-- Top Badge Pill -->
  <g transform="translate(250, 45)">
    <rect x="-90" y="-15" width="180" height="30" rx="15" fill="${secondaryColor}"/>
    <text data-field-id="badge" x="0" y="6" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="900" fill="#78350F" text-anchor="middle">
      ${badge}
    </text>
  </g>

  <text data-field-id="mainText" x="250" y="125" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${main}
  </text>

  <!-- Big Glowing Yellow Tag -->
  <g transform="translate(250, 205)">
    <rect x="-140" y="-35" width="280" height="70" rx="14" fill="${secondaryColor}"/>
    <text data-field-id="highlight" x="0" y="14" font-family="${fontFamily}, sans-serif" font-size="${Math.round(42 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
      ${hl}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "retail_mega_clearance",
    name: "ملصق تصفية كبرى وأسعار محطمة",
    nameEn: "Mega Clearance Sale Tag",
    category: "retail",
    shape: "rect",
    description: "ملصق تنزيلات وتصفية مواسم لافت للأنظار وموجه للمتاجر والمستودعات",
    defaultWidth: 500,
    defaultHeight: 320,
    aspectRatio: 500 / 320,
    defaultMm: { width: 100, height: 64 },
    defaultColors: {
      primary: "#EA580C",
      secondary: "#0F172A",
      background: "#FEF08A",
    },
    fields: [
      { id: "topAlert", label: "تنبيه التصفية", type: "text", defaultValue: "💥 تحطيم أسعار 💥" },
      { id: "bigText", label: "النص العريض", type: "text", defaultValue: "تصفية كبرى" },
      { id: "discount", label: "نسبة الخصم", type: "text", defaultValue: "خصم يصل إلى 70%" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const alert = escapeXml(fields.topAlert || "");
      const big = escapeXml(fields.bigText || "");
      const disc = escapeXml(fields.discount || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <!-- Dynamic Slanted Warning Banner -->
  <rect x="10" y="10" width="480" height="300" rx="14" fill="${bg}" stroke="${secondaryColor}" stroke-width="5" data-color-role="background"/>

  <!-- Caution Hazard Stripes Header -->
  <g transform="translate(20, 20)">
    <rect x="0" y="0" width="460" height="14" fill="${secondaryColor}"/>
    <path d="M 20,0 L 0,14 M 40,0 L 20,14 M 60,0 L 40,14 M 80,0 L 60,14 M 100,0 L 80,14 M 120,0 L 100,14" stroke="${primaryColor}" stroke-width="6"/>
  </g>

  <text data-field-id="topAlert" x="250" y="75" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${alert}
  </text>
  <text data-field-id="bigText" x="250" y="160" font-family="${fontFamily}, sans-serif" font-size="${Math.round(62 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${big}
  </text>

  <!-- Big Red Box for Discount -->
  <g transform="translate(250, 235)">
    <rect x="-180" y="-30" width="360" height="60" rx="10" fill="${primaryColor}"/>
    <text data-field-id="discount" x="0" y="12" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      ${disc}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "packaging_fragile_arabic",
    name: "ملصق قابل للكسر مع كود الشحن",
    nameEn: "Fragile Handle With Care",
    category: "packaging",
    shape: "rect",
    description: "ملصق شحن احترافي مع رمز الكأس والأسهم التوجيهية للطرود الحساسة",
    defaultWidth: 500,
    defaultHeight: 350,
    aspectRatio: 500 / 350,
    defaultMm: { width: 100, height: 70 },
    defaultColors: {
      primary: "#DC2626",
      secondary: "#1E293B",
      background: "#FFFFFF",
    },
    fields: [
      { id: "mainText", label: "التحذير الرئيسي", type: "text", defaultValue: "قابل للكسر" },
      { id: "enText", label: "النص بالإنجليزية", type: "text", defaultValue: "FRAGILE • HANDLE WITH CARE" },
      { id: "instruction", label: "تعليمات المناولة", type: "text", defaultValue: "يرجى عدم الضغط أو الرمي — هذا الجانب لأعلى" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "");
      const en = escapeXml(fields.enText || "");
      const inst = escapeXml(fields.instruction || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 350" width="500" height="350">
  <rect x="12" y="12" width="476" height="326" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>

  <!-- Broken Glass Icon -->
  <g transform="translate(110, 110) scale(1.3)">
    <path d="M -18,-35 H 18 L 12,5 C 10,18 2,22 0,22 C -2,22 -10,18 -12,5 Z" fill="${primaryColor}"/>
    <path d="M 0,22 V 42 M -12,42 H 12" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round"/>
    <!-- Crack Line -->
    <path d="M 0,-35 L -4,-18 L 4,-5 L -2,8" fill="none" stroke="#FFFFFF" stroke-width="2.5"/>
  </g>

  <!-- Upward Arrows -->
  <g transform="translate(390, 110)">
    <path d="M -15,25 V -15 M -15,-15 L -25,-5 M -15,-15 L -5,-5" fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 15,25 V -15 M 15,-15 L 5,-5 M 15,-15 L 25,-5" fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="-30" y="30" width="60" height="5" fill="${secondaryColor}"/>
  </g>

  <text data-field-id="mainText" x="250" y="105" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="enText" x="250" y="150" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    ${en}
  </text>

  <!-- Bottom Instruction Box -->
  <g transform="translate(250, 260)">
    <rect x="-210" y="-35" width="420" height="60" rx="6" fill="${primaryColor}"/>
    <text data-field-id="instruction" x="0" y="3" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${inst}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "greeting_grad_cap",
    name: "ملصق تهنئة تخرج ونجاح",
    nameEn: "Graduation Excellence Seal",
    category: "greeting",
    shape: "circle",
    description: "ملصق مباركة التخرج المبهج مع قبعة التخرج وشهادة التقدير",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#4F46E5",
      secondary: "#D97706",
      background: "#EEF2FF",
    },
    fields: [
      { id: "topText", label: "العبارة العلوية", type: "text", defaultValue: "★ دفعة المتفوقين 2026 ★" },
      { id: "mainText", label: "التهنئة الرئيسية", type: "text", defaultValue: "مبارك التخرج" },
      { id: "nameText", label: "اسم الخريج / التخصص", type: "text", defaultValue: "مع تمنياتنا بدوام التميز والنجاح" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const main = escapeXml(fields.mainText || "");
      const name = escapeXml(fields.nameText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-grad-arc" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <circle cx="250" cy="250" r="230" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <circle cx="250" cy="250" r="212" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="6,4"/>

  <!-- Mortarboard (Graduation Cap) -->
  <g transform="translate(250, 195) scale(1.3)">
    <!-- Rhombus Top -->
    <polygon points="0,-25 45,-8 0,9 -45,-8" fill="${primaryColor}"/>
    <!-- Cap Skull -->
    <path d="M -22,-3 V 15 C -22,25 22,25 22,15 V -3" fill="${secondaryColor}"/>
    <!-- Tassel -->
    <path d="M 0,-8 Q 28,-1 32,15" fill="none" stroke="${secondaryColor}" stroke-width="3"/>
    <circle cx="32" cy="18" r="4" fill="${secondaryColor}"/>
  </g>

  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="900" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-grad-arc" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" x="250" y="315" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="nameText" x="250" y="365" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${name}
  </text>
</svg>`;
    },
  },
  {
    id: "cafe_specialty_beans",
    name: "ملصق حبوب بن مختصة ومحمصة",
    nameEn: "Specialty Roasted Coffee",
    category: "cafe",
    shape: "rect",
    description: "ملصق أكياس القهوة المختصة مع بيانات المعالجة والإيحاءات وتاريخ التحميص",
    defaultWidth: 500,
    defaultHeight: 650,
    aspectRatio: 500 / 650,
    defaultMm: { width: 100, height: 130 },
    defaultColors: {
      primary: "#78350F",
      secondary: "#D97706",
      background: "#FFFBEB",
    },
    fields: [
      { id: "roastery", label: "اسم المحمصة", type: "text", defaultValue: "محمصة الأصالة • ROASTERY" },
      { id: "origin", label: "المصدر / السلالة", type: "text", defaultValue: "إثيوبيا - يرغاتشيفي" },
      { id: "process", label: "المعالجة والارتفاع", type: "text", defaultValue: "مجففة لا هوائية • 2,100م" },
      { id: "notes", label: "الإيحاءات", type: "text", defaultValue: "زهور • خوخ • شوكولاتة داكنة" },
      { id: "weight", label: "الوزن الصافي", type: "text", defaultValue: "250g NET WEIGHT" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const roastery = escapeXml(fields.roastery || "");
      const origin = escapeXml(fields.origin || "");
      const process = escapeXml(fields.process || "");
      const notes = escapeXml(fields.notes || "");
      const weight = escapeXml(fields.weight || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650" width="500" height="650">
  <rect x="15" y="15" width="470" height="620" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="25" y="25" width="450" height="600" rx="8" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Roastery Title Header -->
  <text data-field-id="roastery" x="250" y="70" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="900" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    ${roastery}
  </text>
  <line x1="100" y1="90" x2="400" y2="90" stroke="${secondaryColor}" stroke-width="2"/>

  <!-- Twin Coffee Beans Vector -->
  <g transform="translate(250, 160) scale(1.3)">
    <path d="M -15,-20 C -30,-5 -30,20 -15,30 C 0,40 10,20 10,5 C 10,-10 0,-30 -15,-20 Z" fill="${primaryColor}"/>
    <path d="M -15,-20 Q -5,5 -15,30" fill="none" stroke="#FFFFFF" stroke-width="2"/>
    <path d="M 12,-15 C -3,-5 -3,15 12,25 C 25,35 32,15 32,0 C 32,-15 25,-25 12,-15 Z" fill="${secondaryColor}"/>
    <path d="M 12,-15 Q 20,5 12,25" fill="none" stroke="#FFFFFF" stroke-width="2"/>
  </g>

  <!-- Coffee Details -->
  <text data-field-id="origin" x="250" y="275" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${origin}
  </text>
  <text data-field-id="process" x="250" y="320" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${process}
  </text>

  <!-- Flavor Notes Box -->
  <g transform="translate(250, 420)">
    <rect x="-190" y="-35" width="380" height="70" rx="8" fill="${primaryColor}"/>
    <text x="0" y="-12" font-family="${fontFamily}, sans-serif" font-size="${Math.round(12 * fs)}" font-weight="700" fill="#FDE68A" text-anchor="middle">
      TASTING NOTES // الإيحاءات
    </text>
    <text data-field-id="notes" x="0" y="18" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${notes}
    </text>
  </g>

  <!-- Weight Footer -->
  <text data-field-id="weight" x="250" y="580" font-family="${fontFamily}, monospace" font-size="${Math.round(15 * fs)}" font-weight="800" letter-spacing="3" fill="${secondaryColor}" text-anchor="middle">
    ${weight}
  </text>
</svg>`;
    },
  },
  {
    id: "greeting_order_appreciation",
    name: "ملصق شكر وتقدير عملاء المتجر",
    nameEn: "Customer Appreciation Sticker",
    category: "greeting",
    shape: "circle",
    description: "ملصق شكر أنيق يوضع مع طرود المتاجر الإلكترونية والهدايا لإسعاد العميل",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#0D9488",
      secondary: "#0F766E",
      background: "#F0FDFA",
    },
    fields: [
      { id: "topText", label: "العبارة المقوسة", type: "text", defaultValue: "THANK YOU FOR YOUR ORDER" },
      { id: "mainText", label: "الشكر الرئيسي", type: "text", defaultValue: "شكراً لطلبك !" },
      { id: "subText", label: "رسالة اللطف", type: "text", defaultValue: "صُنع وجُهّز خصيصاً لأجلك ♡" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const main = escapeXml(fields.mainText || "");
      const sub = escapeXml(fields.subText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-thx-arc" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <circle cx="250" cy="250" r="230" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <circle cx="250" cy="250" r="214" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="8,5"/>

  <!-- Smiling Gift Box Icon -->
  <g transform="translate(250, 185) scale(1.2)">
    <rect x="-30" y="-10" width="60" height="45" rx="4" fill="${primaryColor}"/>
    <rect x="-35" y="-22" width="70" height="14" rx="3" fill="${secondaryColor}"/>
    <path d="M 0,-22 V 35 M -30,10 H 30" stroke="#FFFFFF" stroke-width="3"/>
    <!-- Ribbon Loop -->
    <path d="M 0,-22 Q -15,-40 -2,-32 Q 0,-26 0,-22 M 0,-22 Q 15,-40 2,-32 Q 0,-26 0,-22" fill="none" stroke="${secondaryColor}" stroke-width="4"/>
  </g>

  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="900" letter-spacing="3" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-thx-arc" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" x="250" y="310" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="250" y="360" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "food_hot_pizza",
    name: "ملصق بيتزا ساخنة طازجة",
    nameEn: "Hot & Fresh Pizza Seal",
    category: "cafe",
    shape: "circle",
    description: "ملصق تغليف دائري لمحلات البيتزا والوجبات السريعة مع شريحة بيتزا ساخنة",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#DC2626",
      secondary: "#991B1B",
      background: "#FEF2F2",
    },
    fields: [
      { id: "topText", label: "العبارة العلوية", type: "text", defaultValue: "★ HOT & FRESH PIZZA ★" },
      { id: "mainText", label: "اسم المنتج", type: "text", defaultValue: "بيتزا طازجة" },
      { id: "subText", label: "العبارة السفلية", type: "text", defaultValue: "ساخنة من الفرن مباشرة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const main = escapeXml(fields.mainText || "");
      const sub = escapeXml(fields.subText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const scallopD = scallopCirclePath(250, 250, 230, 28, 1.06);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-pizza-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <path d="${scallopD}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="205" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="250" cy="250" r="190" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,4"/>

  <!-- Pizza Slice Icon with Steam -->
  <g transform="translate(250, 180) scale(1.1)">
    <!-- Pizza Slice Body -->
    <path d="M 0,-35 L 32,25 Q 0,38 -32,25 Z" fill="#F59E0B" stroke="${secondaryColor}" stroke-width="3"/>
    <!-- Crust -->
    <path d="M -32,25 Q 0,38 32,25" fill="none" stroke="${secondaryColor}" stroke-width="7" stroke-linecap="round"/>
    <!-- Pepperoni Toppings -->
    <circle cx="-6" cy="-2" r="5" fill="${primaryColor}"/>
    <circle cx="10" cy="8" r="4.5" fill="${primaryColor}"/>
    <circle cx="-10" cy="16" r="4" fill="${primaryColor}"/>
    <!-- Steam Curves -->
    <path d="M -8,-45 Q -14,-55 -8,-62 M 8,-45 Q 2,-55 8,-62" fill="none" stroke="${primaryColor}" stroke-width="2.5" stroke-linecap="round"/>
  </g>

  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="900" letter-spacing="2" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-pizza-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" x="250" y="300" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="250" y="348" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "food_shawarma_grill",
    name: "ملصق شاورما ومشويات الفحم",
    nameEn: "Charcoal Shawarma & Grill",
    category: "cafe",
    shape: "rect",
    description: "لاصق مطاعم الشاورما والمشويات العراقية والشامية على الفحم",
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: "#EA580C",
      secondary: "#9A3412",
      background: "#FFF7ED",
    },
    fields: [
      { id: "restaurant", label: "اسم المطعم", type: "text", defaultValue: "مطعم ومشويات بغداد الأصيل" },
      { id: "dish", label: "اسم الوجبة", type: "text", defaultValue: "شاورما دجاج ع الفحم" },
      { id: "slogan", label: "الشعار", type: "text", defaultValue: "الطعم الأصلي بتتبيلة عراقية مميزة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const rest = escapeXml(fields.restaurant || "");
      const dish = escapeXml(fields.dish || "");
      const slog = escapeXml(fields.slogan || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="10" y="10" width="580" height="380" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="22" y="22" width="556" height="356" rx="10" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="8,5"/>

  <!-- Restaurant Header Bar -->
  <g transform="translate(300, 75)">
    <rect x="-240" y="-28" width="480" height="56" rx="28" fill="${primaryColor}"/>
    <text data-field-id="restaurant" x="0" y="8" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      ${rest}
    </text>
  </g>

  <!-- Grill Flame Icon -->
  <g transform="translate(300, 160)">
    <path d="M 0,-25 C 15,-10 24,5 15,20 C 6,32 -18,28 -20,15 C -22,-2 -5,-10 0,-25 Z" fill="${primaryColor}"/>
    <path d="M 0,-10 C 8,-2 12,6 8,14 C 4,20 -10,18 -10,10 C -10,2 -2,-4 0,-10 Z" fill="#FBBF24"/>
  </g>

  <!-- Main Dish Title -->
  <text data-field-id="dish" x="300" y="255" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${dish}
  </text>

  <!-- Slogan Banner -->
  <g transform="translate(300, 315)">
    <rect x="-210" y="-18" width="420" height="36" rx="8" fill="${secondaryColor}"/>
    <text data-field-id="slogan" x="0" y="6" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${slog}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "food_oriental_sweets",
    name: "ملصق حلويات شرقية فاخرة",
    nameEn: "Luxury Oriental Sweets",
    category: "cafe",
    shape: "circle",
    description: "شارة مذهبة راقية لعلب البقلاوة والحلويات الشرقية والمناسبات",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#B45309",
      secondary: "#78350F",
      background: "#FFFBEB",
    },
    fields: [
      { id: "brand", label: "اسم المتجر / المعمل", type: "text", defaultValue: "حلويات الرافدين الملكية" },
      { id: "quality", label: "نوع الحلويات", type: "text", defaultValue: "بقلاوة وحلويات شرقية" },
      { id: "city", label: "العبارة السفلية", type: "text", defaultValue: "طازج يومياً بالسمن الحر 100%" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const brand = escapeXml(fields.brand || "");
      const qual = escapeXml(fields.quality || "");
      const city = escapeXml(fields.city || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-sweets-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
    <path id="badge-sweets-btm" d="M 80,250 A 170,170 0 0,0 420,250" fill="none"/>
  </defs>
  <circle cx="250" cy="250" r="235" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="215" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="250" cy="250" r="198" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,4"/>

  <!-- Ornate Baklava Diamond Motif -->
  <g transform="translate(250, 195)">
    <polygon points="0,-30 25,0 0,30 -25,0" fill="${primaryColor}"/>
    <polygon points="0,-20 16,0 0,20 -16,0" fill="#FBBF24"/>
    <circle cx="0" cy="0" r="4" fill="${secondaryColor}"/>
  </g>

  <text data-field-id="brand" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-sweets-top" startOffset="50%">${brand}</textPath>
  </text>
  <text data-field-id="quality" x="250" y="285" font-family="${fontFamily}, sans-serif" font-size="${Math.round(32 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${qual}
  </text>
  <text data-field-id="city" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-sweets-btm" startOffset="50%">${city}</textPath>
  </text>
</svg>`;
    },
  },
  {
    id: "food_natural_honey",
    name: "ملصق عسل سدر بري طبيعي",
    nameEn: "100% Pure Natural Honey",
    category: "packaging",
    shape: "rect",
    description: "ملصق برطمانات العسل الطبيعي مع خلايا النحل وتأكيد النقاوة 100%",
    defaultWidth: 600,
    defaultHeight: 450,
    aspectRatio: 600 / 450,
    defaultColors: {
      primary: "#D97706",
      secondary: "#78350F",
      background: "#FFFBEB",
    },
    fields: [
      { id: "title", label: "عنوان المنتج", type: "text", defaultValue: "عسل سدر جبلي طبيعي" },
      { id: "badge", label: "شارة النقاوة", type: "text", defaultValue: "100% PURE NATURAL HONEY" },
      { id: "weight", label: "الوزن الصافي", type: "text", defaultValue: "الوزن الصافي: 1000 غرام" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.title || "");
      const badge = escapeXml(fields.badge || "");
      const wt = escapeXml(fields.weight || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450">
  <rect x="12" y="12" width="576" height="426" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="24" y="24" width="552" height="402" rx="8" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Honeycomb Hexagonal Cells -->
  <g transform="translate(300, 110)">
    <polygon points="0,-24 21,-12 21,12 0,24 -21,12 -21,-12" fill="${primaryColor}" opacity="0.9"/>
    <polygon points="-36,-44 -15,-32 -15,-8 -36,4 -57,-8 -57,-32" fill="${primaryColor}" opacity="0.6"/>
    <polygon points="36,-44 57,-32 57,-8 36,4 15,-8 15,-32" fill="${primaryColor}" opacity="0.6"/>
    <!-- Honey Drop -->
    <path d="M 0,-10 C 8,2 14,14 0,24 C -14,14 -8,2 0,-10 Z" fill="#FEF3C7"/>
  </g>

  <!-- Purity Ribbon -->
  <g transform="translate(300, 195)">
    <rect x="-170" y="-14" width="340" height="28" rx="14" fill="${secondaryColor}"/>
    <text data-field-id="badge" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(11 * fs)}" font-weight="900" letter-spacing="2" fill="#FFFFFF" text-anchor="middle">
      ${badge}
    </text>
  </g>

  <!-- Title -->
  <text data-field-id="title" x="300" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${title}
  </text>

  <!-- Weight & Quality Stamp -->
  <g transform="translate(300, 360)">
    <rect x="-140" y="-16" width="280" height="32" rx="16" fill="${primaryColor}"/>
    <text data-field-id="weight" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${wt}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "greeting_eid_mubarak",
    name: "ملصق عيدكم مبارك وسعيد",
    nameEn: "Eid Mubarak Celebration",
    category: "seasonal",
    shape: "circle",
    description: "ختم احتفالي مذهب لعيدي الفطر والأضحى المبارك مع هلال وأضواء",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#059669",
      secondary: "#047857",
      background: "#ECFDF5",
    },
    fields: [
      { id: "topText", label: "العبارة العلوية", type: "text", defaultValue: "★ تقبل الله منا ومنكم صالح الأعمال ★" },
      { id: "mainText", label: "التهنئة الرئيسية", type: "text", defaultValue: "عيدكم مبارك" },
      { id: "subText", label: "الدعاء", type: "text", defaultValue: "كل عام وأنتم بألف خير" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "");
      const main = escapeXml(fields.mainText || "");
      const sub = escapeXml(fields.subText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const scallopD = scallopCirclePath(250, 250, 230, 32, 1.05);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-eid-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <path d="${scallopD}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="210" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="250" cy="250" r="195" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,4"/>

  <!-- Golden Crescent & Star -->
  <g transform="translate(250, 180) scale(1.1)">
    <path d="M 12,-32 A 28,28 0 1,0 24,24 A 22,22 0 1,1 12,-32 Z" fill="#F59E0B" stroke="${secondaryColor}" stroke-width="1.5"/>
    <polygon points="18,-6 22,-1 27,-2 23,2 24,7 20,4 16,7 17,2 13,-2 18,-1" fill="#F59E0B"/>
  </g>

  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-eid-top" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="mainText" x="250" y="300" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="250" y="352" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "greeting_wedding_congrats",
    name: "ملصق عقد قران وزفاف مبارك",
    nameEn: "Wedding & Marriage Congrats",
    category: "greeting",
    shape: "circle",
    description: "ملصق فاخر لكروت وتوزيعات الأعراس وعقد القران مع دبلتين ذهبيتين",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#BE185D",
      secondary: "#9D174D",
      background: "#FDF2F8",
    },
    fields: [
      { id: "dua", label: "الدعاء النبوي", type: "text", defaultValue: "بَارَكَ اللَّهُ لَكُمَا وَبَارَكَ عَلَيْكُمَا" },
      { id: "names", label: "عنوان المناسبة", type: "text", defaultValue: "ألف مبروك الزواج" },
      { id: "sub", label: "العبارة السفلية", type: "text", defaultValue: "وجمع بينكما في خير وسعادة ♡" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const dua = escapeXml(fields.dua || "");
      const names = escapeXml(fields.names || "");
      const sub = escapeXml(fields.sub || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-wed-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <circle cx="250" cy="250" r="230" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <circle cx="250" cy="250" r="215" fill="none" stroke="${secondaryColor}" stroke-width="1.5" stroke-dasharray="6,4"/>

  <!-- Interlocking Wedding Rings -->
  <g transform="translate(250, 185) scale(1.2)">
    <!-- Ring 1 -->
    <circle cx="-12" cy="0" r="18" fill="none" stroke="#F59E0B" stroke-width="5"/>
    <!-- Diamond atop Ring 1 -->
    <polygon points="-12,-22 -7,-17 -17,-17" fill="#60A5FA"/>
    <!-- Ring 2 -->
    <circle cx="12" cy="0" r="18" fill="none" stroke="#D97706" stroke-width="5"/>
  </g>

  <text data-field-id="dua" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-wed-top" startOffset="50%">${dua}</textPath>
  </text>
  <text data-field-id="names" x="250" y="305" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${names}
  </text>
  <text data-field-id="sub" x="250" y="358" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "greeting_baby_welcome",
    name: "ملصق استقبال المولود الجديد",
    nameEn: "Welcome New Baby Celebration",
    category: "greeting",
    shape: "circle",
    description: "شارة لطيفة لتوزيعات المواليد الجدد وحفلات السبوع والاستقبال",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#0284C7",
      secondary: "#0369A1",
      background: "#F0F9FF",
    },
    fields: [
      { id: "welcome", label: "عبارة الترحيب", type: "text", defaultValue: "أهلاً بقدومك يا صغيري" },
      { id: "blessing", label: "اسم المولود / التهنئة", type: "text", defaultValue: "نورت الدنيا يا حبيبنا" },
      { id: "note", label: "الدعاء", type: "text", defaultValue: "جعله الله من الصالحين والبارين" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const welc = escapeXml(fields.welcome || "");
      const bless = escapeXml(fields.blessing || "");
      const note = escapeXml(fields.note || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const scallopD = scallopCirclePath(250, 250, 230, 24, 1.07);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-baby-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <path d="${scallopD}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="205" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>

  <!-- Baby Rattle / Toy Icon -->
  <g transform="translate(250, 180) scale(1.2)">
    <circle cx="0" cy="-12" r="16" fill="${primaryColor}"/>
    <circle cx="0" cy="-12" r="9" fill="#FFFFFF"/>
    <path d="M 0,-3 L 0,22" stroke="${secondaryColor}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="0" cy="24" r="5" fill="${primaryColor}"/>
  </g>

  <text data-field-id="welcome" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-baby-top" startOffset="50%">${welc}</textPath>
  </text>
  <text data-field-id="blessing" x="250" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${bless}
  </text>
  <text data-field-id="note" x="250" y="348" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: "greeting_jummah_blessed",
    name: "ملصق جمعة مباركة وطيبة",
    nameEn: "Blessed Friday Floral Stamp",
    category: "greeting",
    shape: "square",
    description: "ملصق بطاقات ورسائل الجمعة المباركة مع زخارف إسلامية محرابية",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#4F46E5",
      secondary: "#3730A3",
      background: "#EEF2FF",
    },
    fields: [
      { id: "main", label: "التهنئة الرئيسية", type: "text", defaultValue: "جمعة مباركة" },
      { id: "dua", label: "الدعاء", type: "text", defaultValue: "نورٌ بين الجمعتين ورزقٌ وفير" },
      { id: "salawat", label: "الصلاة على النبي", type: "text", defaultValue: "اللهم صلِّ على محمد وآل محمد" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.main || "");
      const dua = escapeXml(fields.dua || "");
      const sal = escapeXml(fields.salawat || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect x="20" y="20" width="460" height="460" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="32" y="32" width="436" height="436" rx="12" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="8,5"/>

  <!-- Islamic Arch Emblem -->
  <g transform="translate(250, 130)">
    <path d="M -40,30 L -40,0 C -40,-35 0,-48 0,-48 C 0,-48 40,-35 40,0 L 40,30 Z" fill="none" stroke="${primaryColor}" stroke-width="3"/>
    <circle cx="0" cy="-10" r="6" fill="#F59E0B"/>
  </g>

  <!-- Main Title -->
  <text data-field-id="main" x="250" y="250" font-family="${fontFamily}, sans-serif" font-size="${Math.round(48 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>

  <!-- Dua -->
  <text data-field-id="dua" x="250" y="310" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${dua}
  </text>

  <!-- Salawat Capsule -->
  <g transform="translate(250, 390)">
    <rect x="-160" y="-18" width="320" height="36" rx="18" fill="${primaryColor}"/>
    <text data-field-id="salawat" x="0" y="6" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ${sal}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "school_notebook_label",
    name: "ملصق تسمية الدفاتر والكتب المدرسية",
    nameEn: "Student School Notebook Label",
    category: "kids",
    shape: "rect",
    description: "ملصق مستطيل لدفاتر الطلاب المدرسية لكتابة الاسم والصف والمادة والمدرسة",
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: "#2563EB",
      secondary: "#1E40AF",
      background: "#EFF6FF",
    },
    fields: [
      { id: "studentName", label: "الاسم", type: "text", defaultValue: "الاسم: ......................................." },
      { id: "grade", label: "الصف والشعبة", type: "text", defaultValue: "الصف: ......................................." },
      { id: "subject", label: "المادة الدراسية", type: "text", defaultValue: "المادة: ......................................" },
      { id: "school", label: "اسم المدرسة", type: "text", defaultValue: "المدرسة: ...................................." },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const name = escapeXml(fields.studentName || "");
      const gr = escapeXml(fields.grade || "");
      const sub = escapeXml(fields.subject || "");
      const sch = escapeXml(fields.school || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="10" y="10" width="580" height="380" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <rect x="20" y="20" width="560" height="360" rx="10" fill="none" stroke="${secondaryColor}" stroke-width="1.5"/>

  <!-- Header Banner -->
  <g transform="translate(300, 60)">
    <rect x="-180" y="-22" width="360" height="44" rx="22" fill="${primaryColor}"/>
    <text x="0" y="8" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      دفتر الواجبات المدرسية
    </text>
  </g>

  <!-- Form Fields -->
  <g transform="translate(520, 140)" direction="rtl">
    <text data-field-id="studentName" x="0" y="0" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start">
      ${name}
    </text>
    <text data-field-id="grade" x="0" y="55" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start">
      ${gr}
    </text>
    <text data-field-id="subject" x="0" y="110" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start">
      ${sub}
    </text>
    <text data-field-id="school" x="0" y="165" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start">
      ${sch}
    </text>
  </g>

  <!-- Pencil / Ruler Corner Icon -->
  <g transform="translate(90, 310) scale(0.9)">
    <polygon points="0,-40 10,-30 10,20 -10,20 -10,-30" fill="${primaryColor}"/>
    <polygon points="0,-55 10,-40 -10,-40" fill="#F59E0B"/>
    <circle cx="0" cy="-55" r="2.5" fill="#000000"/>
  </g>
</svg>`;
    },
  },
  {
    id: "school_star_student",
    name: "وسام الطالب المتميز والمتفوق",
    nameEn: "Star Student Honor Badge",
    category: "kids",
    shape: "circle",
    description: "شارة تشجيعية وتكريمية مدرسية للطلاب المتفوقين مع نجمة ذهبية وشريط شرف",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#EAB308",
      secondary: "#A16207",
      background: "#FEFCE8",
    },
    fields: [
      { id: "header", label: "عنوان الوسام", type: "text", defaultValue: "وسام التفوق والاجتهاد" },
      { id: "starTitle", label: "اللقب", type: "text", defaultValue: "طالب متميز ★" },
      { id: "cheer", label: "عبارة التحفيز", type: "text", defaultValue: "فخورون بنجاحك وإبداعك !" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const head = escapeXml(fields.header || "");
      const st = escapeXml(fields.starTitle || "");
      const ch = escapeXml(fields.cheer || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const starPoly = starPoints(250, 250, 235, 195, 16);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-star-top" d="M 80,250 A 170,170 0 0,1 420,250" fill="none"/>
  </defs>
  <polygon points="${starPoly}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="185" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" data-color-role="background"/>
  <circle cx="250" cy="250" r="170" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="6,4"/>

  <!-- Big Gold Star Icon -->
  <g transform="translate(250, 185) scale(1.3)">
    <polygon points="0,-25 7,-8 25,-8 11,4 16,21 0,10 -16,21 -11,4 -25,-8 -7,-8" fill="#F59E0B" stroke="${secondaryColor}" stroke-width="1.5"/>
  </g>

  <text data-field-id="header" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    <textPath href="#badge-star-top" startOffset="50%">${head}</textPath>
  </text>
  <text data-field-id="starTitle" x="250" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${st}
  </text>
  <text data-field-id="cheer" x="250" y="348" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${ch}
  </text>
</svg>`;
    },
  },
  {
    id: "medical_rx_pharmacy",
    name: "ملصق صيدلية وتعليمات الوصفة الطبية (Rx)",
    nameEn: "Pharmacy Prescription Rx Label",
    category: "safety",
    shape: "rect",
    description: "ملصق صيدلية رسمي لتعليمات تعاطي الأدوية وجدول الجرعات اليومية",
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: "#059669",
      secondary: "#065F46",
      background: "#ECFDF5",
    },
    fields: [
      { id: "pharmacyName", label: "اسم الصيدلية", type: "text", defaultValue: "صيدلية الشفاء المركزية" },
      { id: "patient", label: "اسم المريض", type: "text", defaultValue: "المريض: ................................" },
      { id: "instructions", label: "إرشادات الجرعة", type: "text", defaultValue: "الجرعة: ملعقة واحدة بعد الأكل مرتين يومياً" },
      { id: "warning", label: "تنبيه الحفظ", type: "text", defaultValue: "يُحفظ بعيداً عن متناول الأطفال وأشعة الشمس" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const ph = escapeXml(fields.pharmacyName || "");
      const pat = escapeXml(fields.patient || "");
      const ins = escapeXml(fields.instructions || "");
      const warn = escapeXml(fields.warning || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="10" y="10" width="580" height="380" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  
  <!-- Header with Medical Green Cross -->
  <g transform="translate(40, 50)">
    <rect x="-20" y="-20" width="40" height="40" rx="6" fill="${primaryColor}"/>
    <path d="M 0,-12 V 12 M -12,0 H 12" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
  </g>
  <text data-field-id="pharmacyName" x="320" y="58" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${ph}
  </text>
  <line x1="25" y1="90" x2="575" y2="90" stroke="${primaryColor}" stroke-width="2"/>

  <!-- Patient Field -->
  <text data-field-id="patient" x="550" y="150" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="start" direction="rtl">
    ${pat}
  </text>

  <!-- Dose Box -->
  <g transform="translate(300, 235)">
    <rect x="-260" y="-35" width="520" height="70" rx="8" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="1.5"/>
    <text data-field-id="instructions" x="0" y="8" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
      ${ins}
    </text>
  </g>

  <!-- Bottom Warning -->
  <g transform="translate(300, 345)">
    <rect x="-240" y="-16" width="480" height="32" rx="6" fill="${secondaryColor}"/>
    <text data-field-id="warning" x="0" y="5" font-family="${fontFamily}, sans-serif" font-size="${Math.round(13 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
      ⚠ ${warn}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "medical_keep_cold",
    name: "ملصق تنبيه: يُحفظ مبرداً (2°-8°C)",
    nameEn: "Medical Keep Refrigerated (2-8C)",
    category: "safety",
    shape: "rect",
    description: "ملصق تحذيري للأدوية واللقاحات والمستحضرات الحيوية التي تتطلب تبريداً مستمراً",
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: "#0284C7",
      secondary: "#0369A1",
      background: "#F0F9FF",
    },
    fields: [
      { id: "alertHeader", label: "عنوان التنبيه", type: "text", defaultValue: "تنبيه طبي: مستحضر حيوي مبرد" },
      { id: "tempRange", label: "درجة الحرارة المطلوبة", type: "text", defaultValue: "يُحفظ مبرداً بين 2° إلى 8°C" },
      { id: "warningText", label: "التحذير الإضافي", type: "text", defaultValue: "ممنوع التجميد نهائياً - DO NOT FREEZE" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const al = escapeXml(fields.alertHeader || "");
      const tmp = escapeXml(fields.tempRange || "");
      const wrn = escapeXml(fields.warningText || "");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="10" y="10" width="580" height="380" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  
  <!-- Snowflake Cold Symbol -->
  <g transform="translate(300, 85) scale(1.1)">
    <line x1="0" y1="-30" x2="0" y2="30" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round"/>
    <line x1="-26" y1="-15" x2="26" y2="15" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round"/>
    <line x1="-26" y1="15" x2="26" y2="-15" stroke="${primaryColor}" stroke-width="4" stroke-linecap="round"/>
    <!-- Snowflake Tips -->
    <path d="M -8,-22 L 0,-30 L 8,-22 M -8,22 L 0,30 L 8,22" fill="none" stroke="${primaryColor}" stroke-width="3" stroke-linecap="round"/>
  </g>

  <!-- Alert Header -->
  <text data-field-id="alertHeader" x="300" y="170" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${al}
  </text>

  <!-- Temperature Capsule -->
  <g transform="translate(300, 245)">
    <rect x="-240" y="-35" width="480" height="70" rx="35" fill="${primaryColor}"/>
    <text data-field-id="tempRange" x="0" y="10" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      ${tmp}
    </text>
  </g>

  <!-- Do not freeze warning -->
  <g transform="translate(300, 340)">
    <rect x="-220" y="-18" width="440" height="36" rx="8" fill="#DC2626"/>
    <text data-field-id="warningText" x="0" y="6" font-family="${fontFamily}, sans-serif" font-size="${Math.round(14 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      ⛔ ${wrn}
    </text>
  </g>
</svg>`;
    },
  },
];

