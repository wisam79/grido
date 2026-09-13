import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { generateBarcodeInnerSvg } from "../lib/barcode-svg";

export const SHIPPING_TEMPLATES: StickerTemplate[] = [
  {
    id: "shipping_fragile",
    name: "قابل للكسر (احذر)",
    nameEn: "Fragile (Handle with Care)",
    category: "shipping",
    description: "ملصق تحذيري دولي للشحنات الحساسة والزجاجية مع رمز الكأس وباركود",
    defaultWidth: 600,
    defaultHeight: 400,
    aspectRatio: 600 / 400,
    defaultColors: {
      primary: "#DC2626",
      secondary: "#1F2937",
      background: "#FFFFFF",
    },
    fields: [
      { id: "mainWarning", label: "عنوان التحذير", type: "text", defaultValue: "قابل للكسر" },
      { id: "subWarning", label: "التعليمات اللوجستية", type: "text", defaultValue: "يُرجى التعامل معه بعناية فائقة" },
      { id: "tracking", label: "رمز التتبع أو الشحنة", type: "text", defaultValue: "FRG-9842-EXP" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainWarning || "قابل للكسر");
      const sub = escapeXml(fields.subWarning || "يُرجى التعامل معه بعناية فائقة");
      const track = escapeXml(fields.tracking || "FRG-9842-EXP");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(fields.tracking || "FRG-9842-EXP", "CODE128", {
        lineColor: secondaryColor,
        width: 300,
        height: 48,
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="600" height="400">
  <rect x="15" y="15" width="570" height="370" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="8" data-color-role="background"/>
  <rect x="30" y="30" width="540" height="90" rx="10" fill="${primaryColor}" data-color-role="primary"/>
  <!-- Wine Glass Broken Icon -->
  <g transform="translate(60, 160)" data-color-role="primary">
    <path d="M 25,10 C 25,60 55,80 75,85 L 75,130 L 50,130 L 50,145 L 100,145 L 100,130 L 75,130 L 75,85 C 95,80 125,60 125,10 Z" fill="${primaryColor}"/>
    <path d="M 75,25 L 85,45 L 65,60 L 80,75" stroke="#FFFFFF" stroke-width="4" fill="none"/>
  </g>
  <text data-field-id="mainWarning" x="300" y="90" font-family="${fontFamily}, sans-serif" font-size="${Math.round(52 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${main}
  </text>
  <text x="360" y="200" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    FRAGILE - HANDLE WITH CARE
  </text>
  <text data-field-id="subWarning" x="360" y="245" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
  <!-- Authentic Scannable Vector Barcode -->
  <g transform="translate(210, 275)">
    ${innerBarcode}
  </g>
  <text data-field-id="tracking" x="360" y="348" font-family="monospace" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="3">
    * ${track} *
  </text>
</svg>`;
    },
  },
  {
    id: "shipping_this_way_up",
    name: "هذا الجانب لأعلى",
    nameEn: "This Way Up",
    category: "shipping",
    description: "ملصق اتجاه الصندوق لتفادي انقلاب الطرود والمعدات الحساسة",
    defaultWidth: 400,
    defaultHeight: 500,
    aspectRatio: 400 / 500,
    defaultColors: {
      primary: "#0F172A",
      secondary: "#0284C7",
      background: "#FFFFFF",
    },
    fields: [
      { id: "topTitle", label: "النص العلوي", type: "text", defaultValue: "هذا الجانب لأعلى" },
      { id: "enTitle", label: "النص بالإنجليزية", type: "text", defaultValue: "THIS WAY UP" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const ar = escapeXml(fields.topTitle || "هذا الجانب لأعلى");
      const en = escapeXml(fields.enTitle || "THIS WAY UP");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect x="15" y="15" width="370" height="470" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <!-- Dual Up Arrows -->
  <g fill="${primaryColor}" data-color-role="primary">
    <!-- Left Arrow -->
    <polygon points="120,70 165,140 135,140 135,260 105,260 105,140 75,140"/>
    <!-- Right Arrow -->
    <polygon points="280,70 325,140 295,140 295,260 265,260 265,140 235,140"/>
    <!-- Bottom Baseline Bar -->
    <rect x="70" y="280" width="260" height="24" rx="4"/>
  </g>
  <text data-field-id="topTitle" x="200" y="370" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${ar}
  </text>
  <text data-field-id="enTitle" x="200" y="425" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" letter-spacing="2">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: "shipping_keep_dry",
    name: "يحفظ بعيداً عن الماء",
    nameEn: "Keep Dry",
    category: "shipping",
    description: "ملصق الحماية من الرطوبة والمطر مع رمز المظلة والقطرات",
    defaultWidth: 400,
    defaultHeight: 500,
    aspectRatio: 400 / 500,
    defaultColors: {
      primary: "#0284C7",
      secondary: "#0F172A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "mainText", label: "النص العربي", type: "text", defaultValue: "يُحفظ في مكان جاف" },
      { id: "enText", label: "النص الإنجليزي", type: "text", defaultValue: "KEEP DRY" },
      { id: "note", label: "ملاحظة التخزين", type: "text", defaultValue: "تجنب التعرض للمطر والرطوبة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "يُحفظ في مكان جاف");
      const en = escapeXml(fields.enText || "KEEP DRY");
      const note = escapeXml(fields.note || "تجنب التعرض للمطر والرطوبة");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
  <rect x="15" y="15" width="370" height="470" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <!-- Raindrops -->
  <g fill="${primaryColor}" opacity="0.8" data-color-role="primary">
    <path d="M 140,60 C 135,75 145,85 145,85 C 145,85 155,75 150,60 C 145,50 140,60 140,60 Z"/>
    <path d="M 200,45 C 195,60 205,70 205,70 C 205,70 215,60 210,45 C 205,35 200,45 200,45 Z"/>
    <path d="M 260,60 C 255,75 265,85 265,85 C 265,85 275,75 270,60 C 265,50 260,60 260,60 Z"/>
  </g>
  <!-- Umbrella -->
  <g stroke="${secondaryColor}" stroke-width="8" fill="none">
    <path d="M 100,185 C 100,105 300,105 300,185 Z" fill="${primaryColor}" stroke="${secondaryColor}" stroke-width="4" data-color-role="primary"/>
    <line x1="200" y1="185" x2="200" y2="255"/>
    <path d="M 200,255 C 200,275 175,275 175,255"/>
  </g>
  <text data-field-id="mainText" x="200" y="340" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="enText" x="200" y="388" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" letter-spacing="2">
    ${en}
  </text>
  <text data-field-id="note" x="200" y="435" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="#64748B" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: "shipping_heavy_package",
    name: "طرد ثقيل (احذر الرفع)",
    nameEn: "Heavy Weight Package",
    category: "shipping",
    description: "تنبيه للأوزان الثقيلة التي تتطلب شخصين أو رافعة لتجنب إصابات الظهر",
    defaultWidth: 500,
    defaultHeight: 400,
    aspectRatio: 500 / 400,
    defaultColors: {
      primary: "#EA580C",
      secondary: "#1E293B",
      background: "#FFF7ED",
    },
    fields: [
      { id: "weightText", label: "الوزن المقدر", type: "text", defaultValue: "> 25 KG" },
      { id: "warningText", label: "عنوان التنبيه", type: "text", defaultValue: "طرد ثقيل الوزن" },
      { id: "actionText", label: "إجراء الرفع", type: "text", defaultValue: "يتطلب شخصين للرفع أو رافعة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const weight = escapeXml(fields.weightText || "> 25 KG");
      const warning = escapeXml(fields.warningText || "طرد ثقيل الوزن");
      const action = escapeXml(fields.actionText || "يتطلب شخصين للرفع أو رافعة");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400">
  <rect x="15" y="15" width="470" height="370" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="8" data-color-role="background"/>
  <!-- Warning Triangle Header -->
  <path d="M 250,45 L 290,115 L 210,115 Z" fill="${primaryColor}" data-color-role="primary"/>
  <text x="250" y="105" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">!</text>
  <text data-field-id="warningText" x="250" y="170" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${warning}
  </text>
  <!-- Weight Badge -->
  <rect x="150" y="200" width="200" height="70" rx="12" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="weightText" x="250" y="250" font-family="monospace" font-size="${Math.round(38 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${weight}
  </text>
  <text data-field-id="actionText" x="250" y="325" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${action}
  </text>
  <text x="250" y="358" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    HEAVY PACKAGE - TEAM LIFT REQUIRED
  </text>
</svg>`;
    },
  },
  {
    id: "shipping_do_not_stack",
    name: "ممنوع التكديس",
    nameEn: "Do Not Stack",
    category: "shipping",
    description: "ملصق لحظر وضع أي طرود أخرى فوق الصندوق في المستودع أو الشاحنة",
    defaultWidth: 420,
    defaultHeight: 480,
    aspectRatio: 420 / 480,
    defaultColors: {
      primary: "#E11D48",
      secondary: "#0F172A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "mainText", label: "النص الرئيسي", type: "text", defaultValue: "ممنوع التكديس" },
      { id: "subText", label: "النص بالإنجليزية", type: "text", defaultValue: "DO NOT STACK" },
      { id: "note", label: "ملاحظة أمان", type: "text", defaultValue: "لا تضع أي طرود أو أثقال فوق هذا الصندوق" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "ممنوع التكديس");
      const sub = escapeXml(fields.subText || "DO NOT STACK");
      const note = escapeXml(fields.note || "لا تضع أي طرود أو أثقال فوق هذا الصندوق");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 480" width="420" height="480">
  <rect x="15" y="15" width="390" height="450" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <!-- Stack Graphics with Red Cross -->
  <g transform="translate(130, 60)" data-color-role="primary">
    <!-- Bottom Box -->
    <rect x="10" y="80" width="140" height="80" fill="none" stroke="${secondaryColor}" stroke-width="6"/>
    <!-- Top Box (Translucent) -->
    <rect x="25" y="10" width="110" height="60" fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-dasharray="6,4" opacity="0.6"/>
    <!-- Big Prohibition Red Circle and Slash -->
    <circle cx="80" cy="85" r="75" fill="none" stroke="${primaryColor}" stroke-width="12"/>
    <line x1="27" y1="32" x2="133" y2="138" stroke="${primaryColor}" stroke-width="12"/>
  </g>
  <text data-field-id="mainText" x="210" y="300" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="210" y="350" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${sub}
  </text>
  <text data-field-id="note" x="210" y="405" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="600" fill="#64748B" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
];
