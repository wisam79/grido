import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";

export const RETAIL_TEMPLATES: StickerTemplate[] = [
  {
    id: "retail_was_now",
    name: "السعر قبل وبعد",
    nameEn: "Was / Now Price Tag",
    category: "retail",
    shape: "rect",
    description: "بطاقة تسعير ترويجية تعرض السعر السابق مشطوباً والسعر الجديد البارز",
    defaultWidth: 500,
    defaultHeight: 320,
    aspectRatio: 500 / 320,
    defaultMm: { width: 70, height: 45 },
    defaultColors: {
      primary: "#DC2626",
      secondary: "#0F172A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "itemTitle", label: "اسم المنتج", type: "text", defaultValue: "عرض خاص ومميز" },
      { id: "oldPrice", label: "السعر السابق", type: "text", defaultValue: "25,000 د.ع" },
      { id: "newPrice", label: "السعر الجديد", type: "text", defaultValue: "18,000 د.ع" },
      { id: "badgeText", label: "شارة التوفير", type: "text", defaultValue: "وفر 30%" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const item = escapeXml(fields.itemTitle || "عرض خاص ومميز");
      const oldP = escapeXml(fields.oldPrice || "25,000 د.ع");
      const newP = escapeXml(fields.newPrice || "18,000 د.ع");
      const badge = escapeXml(fields.badgeText || "وفر 30%");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <rect x="10" y="10" width="480" height="300" rx="16" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Top Tag Header -->
  <path d="M 10,26 A 16,16 0 0,1 26,10 L 474,10 A 16,16 0 0,1 490,26 L 490,75 L 10,75 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="itemTitle" x="250" y="52" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
    ${item}
  </text>
  <!-- Discount Badge -->
  <rect x="330" y="90" width="130" height="38" rx="8" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="badgeText" x="395" y="116" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${badge}
  </text>
  <!-- Old Price with Strikethrough -->
  <g transform="translate(140, 140)">
    <text data-field-id="oldPrice" x="0" y="0" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="#94A3B8" text-anchor="middle">
      كان: ${oldP}
    </text>
    <line x1="-70" y1="-7" x2="70" y2="-7" stroke="${primaryColor}" stroke-width="3"/>
  </g>
  <!-- Big New Price -->
  <rect x="60" y="175" width="380" height="105" rx="14" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="newPrice" x="250" y="245" font-family="${fontFamily}, sans-serif" font-size="${Math.round(56 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    الآن: ${newP}
  </text>
</svg>`;
    },
  },
  {
    id: "retail_bogo_free",
    name: "اشترِ 1 واحصل على 1 مجاناً",
    nameEn: "BOGO 1+1 Free",
    category: "retail",
    shape: "circle",
    description: "ملصق عروض ترويجية دائري للمتاجر والماركات والمطاعم",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#E11D48",
      secondary: "#FEF08A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "topText", label: "العبارة الأولى", type: "text", defaultValue: "اشترِ قطعة" },
      { id: "centerText", label: "الرقم البارز", type: "text", defaultValue: "1+1" },
      { id: "bottomText", label: "العبارة السفلية", type: "text", defaultValue: "والثانية مجاناً!" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "اشترِ قطعة");
      const center = escapeXml(fields.centerText || "1+1");
      const bottom = escapeXml(fields.bottomText || "والثانية مجاناً!");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="220" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="240" cy="240" r="195" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" stroke-dasharray="8,6" data-color-role="background"/>
  <text data-field-id="topText" x="240" y="145" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${top}
  </text>
  <text data-field-id="centerText" x="240" y="275" font-family="monospace, sans-serif" font-size="${Math.round(105 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${center}
  </text>
  <!-- Bottom Ribbon -->
  <rect x="90" y="325" width="300" height="60" rx="12" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="bottomText" x="240" y="367" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${bottom}
  </text>
</svg>`;
    },
  },
  {
    id: "retail_best_seller",
    name: "الأكثر مبيعاً",
    nameEn: "Best Seller Badge",
    category: "retail",
    shape: "circle",
    description: "شارة شرفية ملوكية تميز المنتجات الأكثر طلباً في المتجر",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 45, height: 45 },
    defaultColors: {
      primary: "#D97706",
      secondary: "#78350F",
      background: "#FFFBEB",
    },
    fields: [
      { id: "title", label: "اللقب الشرفي", type: "text", defaultValue: "الأكثر مبيعاً" },
      { id: "sub", label: "التقييم أو التميز", type: "text", defaultValue: "BEST SELLER" },
      { id: "extra", label: "التقييم بالنجوم", type: "text", defaultValue: "★★★★★" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.title || "الأكثر مبيعاً");
      const sub = escapeXml(fields.sub || "BEST SELLER");
      const extra = escapeXml(fields.extra || "★★★★★");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="215" fill="${bg}" stroke="${primaryColor}" stroke-width="8" data-color-role="background"/>
  <circle cx="240" cy="240" r="190" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="6,4"/>
  <!-- Crown Icon -->
  <path d="M 190,130 L 215,95 L 240,115 L 265,95 L 290,130 Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="extra" x="240" y="210" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="4">
    ${extra}
  </text>
  <text data-field-id="title" x="240" y="275" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="130" y="315" width="220" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="sub" x="240" y="343" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="2">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "retail_national_product",
    name: "صُنع في العراق (منتج وطني)",
    nameEn: "Made in Iraq (National Product)",
    category: "retail",
    shape: "square",
    description: "ملصق فخر الصناعة الوطنية العراقية مع رمز النخيل للمنتجات والمحاصيل المحلية",
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#15803D",
      secondary: "#14532D",
      background: "#F0FDF4",
    },
    fields: [
      { id: "mainText", label: "النص الرئيسي", type: "text", defaultValue: "صُنع في العراق" },
      { id: "subText", label: "الشعار الوطني", type: "text", defaultValue: "منتج عراقي وطني" },
      { id: "enText", label: "النص بالإنجليزية", type: "text", defaultValue: "PROUDLY MADE IN IRAQ" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "صُنع في العراق");
      const sub = escapeXml(fields.subText || "منتج عراقي وطني");
      const en = escapeXml(fields.enText || "PROUDLY MADE IN IRAQ");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <rect x="20" y="20" width="420" height="420" rx="28" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <rect x="34" y="34" width="392" height="392" rx="18" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
  <!-- Palm Icon -->
  <g transform="translate(195, 75)" fill="${primaryColor}" data-color-role="primary">
    <path d="M 35,0 C 45,25 30,55 35,90 L 30,90 C 25,55 10,25 35,0 Z"/>
    <path d="M 35,25 C 60,15 85,35 90,65 C 70,55 50,55 35,25 Z"/>
    <path d="M 30,25 C 5,15 -20,35 -25,65 C -5,55 15,55 30,25 Z"/>
    <path d="M 35,50 C 65,45 80,75 75,100 C 60,85 45,80 35,50 Z"/>
    <path d="M 30,50 C 0,45 -15,75 -10,100 C 5,85 20,80 30,50 Z"/>
  </g>
  <text data-field-id="mainText" x="230" y="240" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="230" y="290" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <rect x="80" y="335" width="300" height="40" rx="20" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="enText" x="230" y="361" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: "retail_clearance_sale",
    name: "تصفية كبرى وتخفيضات",
    nameEn: "Mega Clearance Sale",
    category: "retail",
    shape: "rect",
    description: "شريط عرض عريض ملفت للمنتجات المعروضة بأسعار التصفية",
    defaultWidth: 600,
    defaultHeight: 280,
    aspectRatio: 600 / 280,
    defaultMm: { width: 100, height: 45 },
    defaultColors: {
      primary: "#B91C1C",
      secondary: "#FEF08A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "saleTitle", label: "عنوان التصفية", type: "text", defaultValue: "تصفية كبرى حتى نفاذ الكمية" },
      { id: "discountAmount", label: "نسبة الخصم", type: "text", defaultValue: "خصم يصل إلى 70%" },
      { id: "tagline", label: "العبارة الإنجليزية", type: "text", defaultValue: "MEGA CLEARANCE SALE" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.saleTitle || "تصفية كبرى حتى نفاذ الكمية");
      const discount = escapeXml(fields.discountAmount || "خصم يصل إلى 70%");
      const tagline = escapeXml(fields.tagline || "MEGA CLEARANCE SALE");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 280" width="600" height="280">
  <rect x="12" y="12" width="576" height="256" rx="16" fill="${primaryColor}" data-color-role="primary"/>
  <rect x="24" y="24" width="552" height="232" rx="10" fill="${bg}" data-color-role="background"/>
  <text data-field-id="saleTitle" x="300" y="75" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <rect x="80" y="105" width="440" height="85" rx="12" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="discountAmount" x="300" y="165" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${discount}
  </text>
  <text data-field-id="tagline" x="300" y="228" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="#64748B" text-anchor="middle" letter-spacing="2">
    ${tagline}
  </text>
</svg>`;
    },
  },
];
