import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";

export const PACKAGING_TEMPLATES: StickerTemplate[] = [
  {
    id: "packaging_expiry_dates",
    name: "جدول الإنتاج والانتهاء والتشغيلة",
    nameEn: "Production & Expiry Matrix",
    category: "packaging",
    description: "ملصق تنظيمي لبيانات الصلاحية، تاريخ التعبئة، والباتش للمنتجات والمصانع",
    defaultWidth: 600,
    defaultHeight: 340,
    aspectRatio: 600 / 340,
    defaultColors: {
      primary: "#1E293B",
      secondary: "#0284C7",
      background: "#FFFFFF",
    },
    fields: [
      { id: "productName", label: "اسم المنتج", type: "text", defaultValue: "عسل سدر طبيعي فاخر" },
      { id: "mfgDate", label: "تاريخ الإنتاج (PROD)", type: "text", defaultValue: "2026/09/12" },
      { id: "expDate", label: "تاريخ الانتهاء (EXP)", type: "text", defaultValue: "2028/09/11" },
      { id: "batchNo", label: "رقم التشغيلة (BATCH)", type: "text", defaultValue: "LOT #B402-99" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const name = escapeXml(fields.productName || "عسل سدر طبيعي فاخر");
      const mfg = escapeXml(fields.mfgDate || "2026/09/12");
      const exp = escapeXml(fields.expDate || "2028/09/11");
      const batch = escapeXml(fields.batchNo || "LOT #B402-99");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 340" width="600" height="340">
  <rect x="10" y="10" width="580" height="320" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Header Bar -->
  <path d="M 10,24 A 14,14 0 0,1 24,10 L 576,10 A 14,14 0 0,1 590,24 L 590,70 L 10,70 Z" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="productName" x="300" y="48" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${name}
  </text>
  <!-- Table Grid Lines -->
  <line x1="10" y1="150" x2="590" y2="150" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="4,4"/>
  <line x1="10" y1="230" x2="590" y2="230" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="4,4"/>
  <line x1="320" y1="70" x2="320" y2="330" stroke="${primaryColor}" stroke-width="2"/>
  <!-- Row 1: Production -->
  <text x="560" y="118" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="end">
    تاريخ الإنتاج (MFG):
  </text>
  <text data-field-id="mfgDate" x="160" y="118" font-family="monospace" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${mfg}
  </text>
  <!-- Row 2: Expiry -->
  <text x="560" y="198" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="end">
    تاريخ الانتهاء (EXP):
  </text>
  <text data-field-id="expDate" x="160" y="198" font-family="monospace" font-size="${Math.round(24 * fs)}" font-weight="800" fill="#DC2626" text-anchor="middle">
    ${exp}
  </text>
  <!-- Row 3: Batch Number -->
  <text x="560" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="end">
    رقم التشغيلة (BATCH):
  </text>
  <text data-field-id="batchNo" x="160" y="280" font-family="monospace" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${batch}
  </text>
</svg>`;
    },
  },
  {
    id: "packaging_thank_you",
    name: "بطاقة شكر للطلب",
    nameEn: "Thank You Sticker",
    category: "packaging",
    description: "ملصق أنيق وعصري لإغلاق كراتين الشحن وطرود المتاجر الإلكترونية",
    defaultWidth: 500,
    defaultHeight: 380,
    aspectRatio: 500 / 380,
    defaultColors: {
      primary: "#BE185D",
      secondary: "#1F2937",
      background: "#FFF1F2",
    },
    fields: [
      { id: "thankTitle", label: "عبارة الشكر", type: "text", defaultValue: "شكراً لطلبك الجميل!" },
      { id: "sentiment", label: "رسالة المحبة", type: "text", defaultValue: "تم تجهيز وتغليف طلبك بكل حب وعناية" },
      { id: "socialHandle", label: "حساب التواصل أو المتجر", type: "text", defaultValue: "@YourStore.iq" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const thank = escapeXml(fields.thankTitle || "شكراً لطلبك الجميل!");
      const sentiment = escapeXml(fields.sentiment || "تم تجهيز وتغليف طلبك بكل حب وعناية");
      const social = escapeXml(fields.socialHandle || "@YourStore.iq");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 380" width="500" height="380">
  <rect x="15" y="15" width="470" height="350" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Heart Icon inside circle -->
  <circle cx="250" cy="85" r="42" fill="${primaryColor}" opacity="0.15" data-color-role="primary"/>
  <path d="M 250,75 C 240,55 210,55 200,77 C 190,100 250,135 250,135 C 250,135 310,100 300,77 C 290,55 260,55 250,75 Z" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="thankTitle" x="250" y="195" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${thank}
  </text>
  <text data-field-id="sentiment" x="250" y="245" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${sentiment}
  </text>
  <!-- Handle Badge -->
  <rect x="140" y="280" width="220" height="42" rx="21" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="socialHandle" x="250" y="308" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${social}
  </text>
</svg>`;
    },
  },
  {
    id: "packaging_open_here",
    name: "افتح هنا (مقص وقص)",
    nameEn: "Open Here Strip",
    category: "packaging",
    description: "شريط ملصق طولي لتحديد موضع الفتح الآمن للعبوات والعلب",
    defaultWidth: 600,
    defaultHeight: 240,
    aspectRatio: 600 / 240,
    defaultColors: {
      primary: "#0F172A",
      secondary: "#D97706",
      background: "#FEF3C7",
    },
    fields: [
      { id: "openText", label: "نص الفتح", type: "text", defaultValue: "افتح من هنا بعناية" },
      { id: "enText", label: "النص الإنجليزي", type: "text", defaultValue: "OPEN HERE ✂" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const open = escapeXml(fields.openText || "افتح من هنا بعناية");
      const en = escapeXml(fields.enText || "OPEN HERE ✂");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="600" height="240">
  <rect x="10" y="10" width="580" height="220" rx="16" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Cut Line -->
  <line x1="40" y1="120" x2="560" y2="120" stroke="${primaryColor}" stroke-width="3" stroke-dasharray="14,10"/>
  <!-- Scissor Icon -->
  <g transform="translate(60, 100)" fill="${primaryColor}" data-color-role="primary">
    <circle cx="15" cy="10" r="10" fill="none" stroke="${primaryColor}" stroke-width="3"/>
    <circle cx="15" cy="30" r="10" fill="none" stroke="${primaryColor}" stroke-width="3"/>
    <line x1="22" y1="13" x2="45" y2="35" stroke="${primaryColor}" stroke-width="3"/>
    <line x1="22" y1="27" x2="45" y2="5" stroke="${primaryColor}" stroke-width="3"/>
  </g>
  <text data-field-id="openText" x="350" y="85" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${open}
  </text>
  <text data-field-id="enText" x="350" y="180" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: "packaging_eco_recycle",
    name: "صديق للبيئة وقابل للتدوير",
    nameEn: "Eco-Friendly Recyclable",
    category: "packaging",
    description: "شعار الاستدامة البيئية وإعادة التدوير للمنتجات الصديقة للأرض",
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultColors: {
      primary: "#16A34A",
      secondary: "#15803D",
      background: "#F0FDF4",
    },
    fields: [
      { id: "ecoTitle", label: "عنوان الاستدامة", type: "text", defaultValue: "100% قابل لإعادة التدوير" },
      { id: "ecoSub", label: "النص الفرعي", type: "text", defaultValue: "تغليف صديق للبيئة" },
      { id: "pledge", label: "شعار الكوكب", type: "text", defaultValue: "معاً لحماية كوكبنا" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.ecoTitle || "100% قابل لإعادة التدوير");
      const sub = escapeXml(fields.ecoSub || "تغليف صديق للبيئة");
      const pledge = escapeXml(fields.pledge || "معاً لحماية كوكبنا");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <circle cx="230" cy="230" r="205" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <!-- Mobius Loop / Recycle 3 Arrows -->
  <g transform="translate(145, 75)" fill="${primaryColor}" data-color-role="primary">
    <!-- Arrow 1 (Top) -->
    <path d="M 85,20 L 115,20 L 100,50 Z"/>
    <path d="M 50,45 C 70,25 100,25 100,25" fill="none" stroke="${primaryColor}" stroke-width="12" stroke-linecap="round"/>
    <!-- Arrow 2 (Right) -->
    <path d="M 130,95 L 145,120 L 115,120 Z"/>
    <path d="M 105,45 C 130,70 130,105 130,105" fill="none" stroke="${primaryColor}" stroke-width="12" stroke-linecap="round"/>
    <!-- Arrow 3 (Left) -->
    <path d="M 40,110 L 25,85 L 55,85 Z"/>
    <path d="M 115,110 C 75,125 40,95 40,95" fill="none" stroke="${primaryColor}" stroke-width="12" stroke-linecap="round"/>
  </g>
  <text data-field-id="ecoTitle" x="230" y="270" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="ecoSub" x="230" y="315" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <text data-field-id="pledge" x="230" y="360" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="#4B5563" text-anchor="middle">
    ${pledge}
  </text>
</svg>`;
    },
  },
];
