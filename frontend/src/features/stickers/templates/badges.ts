import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";

export const BADGE_TEMPLATES: StickerTemplate[] = [
  {
    id: "seal_gold_guarantee",
    name: "ختم الضمان الذهبي",
    nameEn: "Gold Guarantee Seal",
    category: "badges",
    description: "ختم تجاري ذهبي دائري مسنن للضمان المعتمد والأصالة 100%",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultColors: {
      primary: "#D97706",
      secondary: "#78350F",
      background: "#FFFBEB",
    },
    fields: [
      { id: "topText", label: "النص العلوي", type: "text", defaultValue: "★ أصلي ومضمون ★" },
      { id: "centerText", label: "النص الرئيسي", type: "text", defaultValue: "100%" },
      { id: "bottomText", label: "النص السفلي", type: "text", defaultValue: "ضمان ذهبي معتمد" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "★ أصلي ومضمون ★");
      const center = escapeXml(fields.centerText || "100%");
      const bottom = escapeXml(fields.bottomText || "ضمان ذهبي معتمد");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      let starPoints = "";
      const numPoints = 28;
      const outerR = 230;
      const innerR = 210;
      for (let i = 0; i < numPoints * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / numPoints;
        const x = 250 + r * Math.cos(angle);
        const y = 250 + r * Math.sin(angle);
        starPoints += `${x.toFixed(1)},${y.toFixed(1)} `;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="badge-top-curve" d="M 90,250 A 160,160 0 0,1 410,250" fill="none"/>
    <path id="badge-bottom-curve" d="M 90,250 A 160,160 0 0,0 410,250" fill="none"/>
    <filter id="badge-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>
  <polygon points="${starPoints.trim()}" fill="${primaryColor}" filter="url(#badge-shadow)" data-color-role="primary"/>
  <circle cx="250" cy="250" r="195" fill="${bg}" stroke="${secondaryColor}" stroke-width="4" stroke-dasharray="8,5" data-color-role="background"/>
  <circle cx="250" cy="250" r="182" fill="none" stroke="${primaryColor}" stroke-width="2"/>
  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath data-field-id="topText" href="#badge-top-curve" startOffset="50%">${top}</textPath>
  </text>
  <text data-field-id="centerText" x="250" y="272" font-family="${fontFamily}, sans-serif" font-size="${Math.round(70 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${center}
  </text>
  <text data-field-id="bottomText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath data-field-id="bottomText" href="#badge-bottom-curve" startOffset="50%">${bottom}</textPath>
  </text>
</svg>`;
    },
  },
  {
    id: "seal_premium_ribbon",
    name: "شريط الفخامة والتميز",
    nameEn: "Premium Ribbon Seal",
    category: "badges",
    description: "شارة ملوكية أنيقة مع وشاح سفلي للمنتجات الراقية",
    defaultWidth: 500,
    defaultHeight: 560,
    aspectRatio: 500 / 560,
    defaultColors: {
      primary: "#B45309",
      secondary: "#1E293B",
      background: "#FFFFFF",
    },
    fields: [
      { id: "ribbonText", label: "نص الوشاح", type: "text", defaultValue: "جودة ممتازة" },
      { id: "mainText", label: "النص الأوسط", type: "text", defaultValue: "PREMIUM" },
      { id: "subText", label: "النص الفرعي", type: "text", defaultValue: "مختار بعناية فائقة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const ribbon = escapeXml(fields.ribbonText || "جودة ممتازة");
      const main = escapeXml(fields.mainText || "PREMIUM");
      const sub = escapeXml(fields.subText || "مختار بعناية فائقة");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 560" width="500" height="560">
  <defs>
    <filter id="ribbon-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="5" stdDeviation="5" flood-opacity="0.2"/>
    </filter>
  </defs>
  <!-- Ribbon Tails -->
  <polygon points="120,380 90,490 150,460 210,490 190,380" fill="${primaryColor}" opacity="0.85" data-color-role="primary"/>
  <polygon points="380,380 350,490 410,460 470,490 450,380" fill="${primaryColor}" opacity="0.85" data-color-role="primary"/>
  <!-- Central Badge -->
  <circle cx="250" cy="220" r="170" fill="${bg}" stroke="${primaryColor}" stroke-width="8" filter="url(#ribbon-shadow)" data-color-role="background"/>
  <circle cx="250" cy="220" r="150" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="4,4"/>
  <!-- Stars -->
  <path d="M 250,110 L 254,122 L 266,122 L 257,130 L 260,142 L 250,134 L 240,142 L 243,130 L 234,122 L 246,122 Z" fill="${primaryColor}"/>
  <!-- Text -->
  <text data-field-id="mainText" x="250" y="210" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2">
    ${main}
  </text>
  <text data-field-id="subText" x="250" y="252" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <!-- Horizontal Banner Ribbon -->
  <rect x="75" y="340" width="350" height="66" rx="10" fill="${primaryColor}" filter="url(#ribbon-shadow)" data-color-role="primary"/>
  <text data-field-id="ribbonText" x="250" y="384" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
    ${ribbon}
  </text>
</svg>`;
    },
  },
  {
    id: "seal_handmade_craft",
    name: "صنع يدوياً بحب",
    nameEn: "Handmade Craft",
    category: "badges",
    description: "ملصق للأعمال اليدوية والمتاجر الحرفية والعائلية",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultColors: {
      primary: "#BE185D",
      secondary: "#831843",
      background: "#FDF2F8",
    },
    fields: [
      { id: "craftText", label: "النص الرئيسي", type: "text", defaultValue: "صُنع يدوياً بحب" },
      { id: "storeName", label: "اسم المتجر أو الصانع", type: "text", defaultValue: "حِرف وأصالة" },
      { id: "tagline", label: "الشعار اللطيف", type: "text", defaultValue: "قطعة فريدة صُممت لأجلك" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const craft = escapeXml(fields.craftText || "صُنع يدوياً بحب");
      const store = escapeXml(fields.storeName || "حِرف وأصالة");
      const tagline = escapeXml(fields.tagline || "قطعة فريدة صُممت لأجلك");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <rect x="25" y="25" width="430" height="430" rx="35" fill="${bg}" stroke="${primaryColor}" stroke-width="4" stroke-dasharray="10,6" data-color-role="background"/>
  <!-- Heart Icon -->
  <path d="M 240,110 C 220,75 160,75 140,120 C 120,165 240,240 240,240 C 240,240 360,165 340,120 C 320,75 260,75 240,110 Z" fill="${primaryColor}" data-color-role="primary"/>
  <!-- Text Elements -->
  <text data-field-id="craftText" x="240" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${craft}
  </text>
  <text data-field-id="storeName" x="240" y="345" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${store}
  </text>
  <text data-field-id="tagline" x="240" y="390" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="500" fill="#64748B" text-anchor="middle">
    ${tagline}
  </text>
</svg>`;
    },
  },
  {
    id: "seal_organic_natural",
    name: "منتج عضوي طبيعي 100%",
    nameEn: "100% Organic Natural",
    category: "badges",
    description: "ملصق للمنتجات الغذائية الطبيعية، العسل، والمستحضرات العضوية",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultColors: {
      primary: "#15803D",
      secondary: "#166534",
      background: "#F0FDF4",
    },
    fields: [
      { id: "title", label: "العنوان الرئيسي", type: "text", defaultValue: "100% طبيعي" },
      { id: "subtitle", label: "الوصف العضوي", type: "text", defaultValue: "عضوي وخالٍ من الإضافات" },
      { id: "source", label: "مصدر المكونات", type: "text", defaultValue: "مستخلص من الطبيعة النقية" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.title || "100% طبيعي");
      const subtitle = escapeXml(fields.subtitle || "عضوي وخالٍ من الإضافات");
      const source = escapeXml(fields.source || "مستخلص من الطبيعة النقية");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="215" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <circle cx="240" cy="240" r="198" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="6,4"/>
  <!-- Leaf Graphics -->
  <path d="M 240,85 C 290,105 310,165 285,200 C 260,235 240,225 240,225 C 240,225 220,235 195,200 C 170,165 190,105 240,85 Z" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 240,95 L 240,220" stroke="${bg}" stroke-width="3"/>
  <!-- Text -->
  <text data-field-id="title" x="240" y="278" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="subtitle" x="240" y="325" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${subtitle}
  </text>
  <text data-field-id="source" x="240" y="370" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="#4B5563" text-anchor="middle">
    ${source}
  </text>
</svg>`;
    },
  },
  {
    id: "seal_sale_burst",
    name: "نجمة العروض والتخفيضات",
    nameEn: "Super Sale Burst",
    category: "badges",
    description: "ملصق عروض ترويجية ناري جاذب للانتباه على العبوات والمنتجات",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultColors: {
      primary: "#DC2626",
      secondary: "#FEF08A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "saleBadge", label: "شارة الخصم", type: "text", defaultValue: "خصم خاص" },
      { id: "salePercent", label: "نسبة التخفيض", type: "text", defaultValue: "50%" },
      { id: "salePeriod", label: "فترة العرض", type: "text", defaultValue: "لفترة محدودة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const badge = escapeXml(fields.saleBadge || "خصم خاص");
      const percent = escapeXml(fields.salePercent || "50%");
      const period = escapeXml(fields.salePeriod || "لفترة محدودة");
      const fs = fontScale || 1;

      let burst = "";
      const spikes = 20;
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? 220 : 175;
        const angle = (i * Math.PI) / spikes;
        const x = 240 + r * Math.cos(angle);
        const y = 240 + r * Math.sin(angle);
        burst += `${x.toFixed(1)},${y.toFixed(1)} `;
      }

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <polygon points="${burst.trim()}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="240" cy="240" r="140" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="4" data-color-role="secondary"/>
  <text data-field-id="saleBadge" x="240" y="170" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${badge}
  </text>
  <text data-field-id="salePercent" x="240" y="260" font-family="${fontFamily}, sans-serif" font-size="${Math.round(75 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${percent}
  </text>
  <text data-field-id="salePeriod" x="240" y="315" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${period}
  </text>
</svg>`;
    },
  },
  {
    id: "seal_quality_approved",
    name: "فحص الجودة معتمد QC",
    nameEn: "Quality Approved Stamp",
    category: "badges",
    description: "ختم مصنعي رسمي يؤكد اجتياز فحص الجودة والمطابقة",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultColors: {
      primary: "#0284C7",
      secondary: "#0369A1",
      background: "#F0F9FF",
    },
    fields: [
      { id: "status", label: "الحالة", type: "text", defaultValue: "QC PASSED" },
      { id: "inspector", label: "رقم الفاحص أو المعمل", type: "text", defaultValue: "مفتش الجودة #42" },
      { id: "date", label: "تاريخ المطابقة", type: "text", defaultValue: "معتمد ومطابق للمواصفات" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const status = escapeXml(fields.status || "QC PASSED");
      const inspector = escapeXml(fields.inspector || "مفتش الجودة #42");
      const date = escapeXml(fields.date || "معتمد ومطابق للمواصفات");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="215" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <circle cx="240" cy="240" r="195" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="8,6"/>
  <!-- Checkmark Badge -->
  <circle cx="240" cy="145" r="42" fill="${primaryColor}" data-color-role="primary"/>
  <path d="M 224,145 L 236,157 L 258,133" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <!-- Texts -->
  <text data-field-id="status" x="240" y="245" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" letter-spacing="2">
    ${status}
  </text>
  <text data-field-id="inspector" x="240" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${inspector}
  </text>
  <text data-field-id="date" x="240" y="340" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="#64748B" text-anchor="middle">
    ${date}
  </text>
</svg>`;
    },
  },
  {
    id: "seal_limited_edition",
    name: "إصدار محدود فاخر",
    nameEn: "Limited Edition Badge",
    category: "badges",
    description: "شارة ذهبية فاخرة للقطع الحصرية والإصدارات الخاصة المحدودة",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultColors: {
      primary: "#C2410C",
      secondary: "#7C2D12",
      background: "#FFF7ED",
    },
    fields: [
      { id: "top", label: "الشارة العليا", type: "text", defaultValue: "نسخة حصرية" },
      { id: "title", label: "العنوان الرئيسي", type: "text", defaultValue: "LIMITED EDITION" },
      { id: "number", label: "الترقيم أو التخصيص", type: "text", defaultValue: "إصدار مرقم ومحدود" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.top || "نسخة حصرية");
      const title = escapeXml(fields.title || "LIMITED EDITION");
      const num = escapeXml(fields.number || "إصدار مرقم ومحدود");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <rect x="25" y="25" width="430" height="430" rx="30" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <rect x="38" y="38" width="404" height="404" rx="20" fill="none" stroke="${secondaryColor}" stroke-width="2"/>
  <!-- Crown Icon -->
  <path d="M 190,140 L 210,105 L 240,125 L 270,105 L 290,140 Z" fill="${primaryColor}" data-color-role="primary"/>
  <!-- Text -->
  <text data-field-id="top" x="240" y="200" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${top}
  </text>
  <text data-field-id="title" x="240" y="265" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle" letter-spacing="1">
    ${title}
  </text>
  <text data-field-id="number" x="240" y="330" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${num}
  </text>
</svg>`;
    },
  },
];
