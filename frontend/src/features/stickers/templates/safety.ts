import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";

export const SAFETY_TEMPLATES: StickerTemplate[] = [
  {
    id: "safety_no_blade",
    name: "ممنوع استخدام شفرة للفتح",
    nameEn: "Do Not Open with Blade",
    category: "safety",
    shape: "rect",
    description: "ملصق تحذيري لحماية محتويات الصندوق والملابس من التمزق بشفرة القاطع",
    defaultWidth: 500,
    defaultHeight: 340,
    aspectRatio: 500 / 340,
    defaultMm: { width: 70, height: 48 },
    defaultColors: {
      primary: "#DC2626",
      secondary: "#0F172A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "warningTitle", label: "عنوان التحذير", type: "text", defaultValue: "لا تستخدم شفرة للفتح" },
      { id: "enWarning", label: "النص بالإنجليزية", type: "text", defaultValue: "DO NOT OPEN WITH BLADE" },
      { id: "subText", label: "التوجيه", type: "text", defaultValue: "المحتوى حساس للخدش والتمزق" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.warningTitle || "لا تستخدم شفرة للفتح");
      const en = escapeXml(fields.enWarning || "DO NOT OPEN WITH BLADE");
      const sub = escapeXml(fields.subText || "المحتوى حساس للخدش والتمزق");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340">
  <rect x="12" y="12" width="476" height="316" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <!-- Top Danger Bar -->
  <rect x="25" y="25" width="450" height="60" rx="8" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="warningTitle" x="250" y="65" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${title}
  </text>
  <!-- Box with cutter prohibition -->
  <g transform="translate(195, 105)" data-color-role="primary">
    <!-- Box outline -->
    <rect x="10" y="35" width="90" height="65" fill="none" stroke="${secondaryColor}" stroke-width="5"/>
    <line x1="55" y1="35" x2="55" y2="100" stroke="${secondaryColor}" stroke-width="3" stroke-dasharray="4,4"/>
    <!-- Blade Icon -->
    <path d="M 45,5 L 65,5 L 65,30 L 45,30 Z" fill="${secondaryColor}"/>
    <polygon points="50,30 60,30 55,42" fill="${secondaryColor}"/>
    <!-- Prohibition Red Circle & Slash -->
    <circle cx="55" cy="45" r="50" fill="none" stroke="${primaryColor}" stroke-width="8"/>
    <line x1="20" y1="10" x2="90" y2="80" stroke="${primaryColor}" stroke-width="8"/>
  </g>
  <text data-field-id="enWarning" x="250" y="250" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${en}
  </text>
  <text data-field-id="subText" x="250" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "safety_flammable",
    name: "سائل سريع الاشتعال",
    nameEn: "Flammable Liquid Warning",
    category: "safety",
    shape: "square",
    description: "ملصق السلامة الدولي للمواد القابلة للاشتعال والعطور والمذيبات",
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#DC2626",
      secondary: "#000000",
      background: "#FFFFFF",
    },
    fields: [
      { id: "mainText", label: "التحذير", type: "text", defaultValue: "سائل سريع الاشتعال" },
      { id: "enText", label: "النص بالإنجليزية", type: "text", defaultValue: "FLAMMABLE LIQUID" },
      { id: "hazardClass", label: "فئة الخطر الدولي", type: "text", defaultValue: "CLASS 3" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "سائل سريع الاشتعال");
      const en = escapeXml(fields.enText || "FLAMMABLE LIQUID");
      const cls = escapeXml(fields.hazardClass || "CLASS 3");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <!-- Diamond Rotated Square -->
  <g transform="translate(230, 230) rotate(45)">
    <rect x="-150" y="-150" width="300" height="300" rx="14" fill="${primaryColor}" data-color-role="primary"/>
    <rect x="-140" y="-140" width="280" height="280" rx="10" fill="${bg}" data-color-role="background"/>
  </g>
  <!-- Flame Graphic -->
  <g transform="translate(195, 100)" fill="${primaryColor}" data-color-role="primary">
    <path d="M 35,0 C 45,35 70,55 70,90 C 70,125 45,145 35,145 C 25,145 0,125 0,90 C 0,55 25,35 35,0 Z"/>
    <path d="M 35,45 C 42,65 52,80 52,105 C 52,125 38,135 35,135 C 32,135 18,125 18,105 C 18,80 28,65 35,45 Z" fill="#FBBF24"/>
  </g>
  <text data-field-id="mainText" x="230" y="280" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="enText" x="230" y="315" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" letter-spacing="1">
    ${en}
  </text>
  <text data-field-id="hazardClass" x="230" y="365" font-family="monospace, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${cls}
  </text>
</svg>`;
    },
  },
  {
    id: "safety_keep_frozen",
    name: "يحفظ مجمداً (-18°C)",
    nameEn: "Keep Frozen (-18°C)",
    category: "safety",
    shape: "rect",
    description: "ملصق لسلسلة التبريد والأطعمة واللقاحات والمستحضرات الحساسة للحرارة",
    defaultWidth: 500,
    defaultHeight: 340,
    aspectRatio: 500 / 340,
    defaultMm: { width: 70, height: 48 },
    defaultColors: {
      primary: "#0284C7",
      secondary: "#0369A1",
      background: "#F0F9FF",
    },
    fields: [
      { id: "mainText", label: "تعليمات الحفظ", type: "text", defaultValue: "يُحفظ مجمداً" },
      { id: "temp", label: "درجة الحرارة", type: "text", defaultValue: "-18°C / 0°F" },
      { id: "enText", label: "النص بالإنجليزية", type: "text", defaultValue: "KEEP FROZEN - DO NOT THAW" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "يُحفظ مجمداً");
      const temp = escapeXml(fields.temp || "-18°C / 0°F");
      const en = escapeXml(fields.enText || "KEEP FROZEN - DO NOT THAW");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340">
  <rect x="12" y="12" width="476" height="316" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <!-- Snowflake Icon -->
  <g transform="translate(250, 85)" stroke="${primaryColor}" stroke-width="5" stroke-linecap="round" data-color-role="primary">
    <line x1="0" y1="-35" x2="0" y2="35"/>
    <line x1="-30" y1="-17" x2="30" y2="17"/>
    <line x1="-30" y1="17" x2="30" y2="-17"/>
    <circle cx="0" cy="0" r="8" fill="${primaryColor}"/>
  </g>
  <text data-field-id="mainText" x="250" y="175" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${main}
  </text>
  <rect x="130" y="200" width="240" height="52" rx="10" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="temp" x="250" y="236" font-family="monospace, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${temp}
  </text>
  <text data-field-id="enText" x="250" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${en}
  </text>
</svg>`;
    },
  },
  {
    id: "safety_lithium_battery",
    name: "بطارية ليثيوم (UN3481)",
    nameEn: "Lithium Battery Shipping Label",
    category: "safety",
    shape: "rect",
    description: "ملصق الشحن الجوي والبري الإلزامي للأجهزة التي تحتوي على بطاريات ليثيوم",
    defaultWidth: 500,
    defaultHeight: 380,
    aspectRatio: 500 / 380,
    defaultMm: { width: 80, height: 60 },
    defaultColors: {
      primary: "#DC2626",
      secondary: "#0F172A",
      background: "#FFFFFF",
    },
    fields: [
      { id: "unCode", label: "رمز الأمم المتحدة UN", type: "text", defaultValue: "UN 3481" },
      { id: "contactPhone", label: "هاتف الطوارئ والاستفسار", type: "text", defaultValue: "+964 770 123 4567" },
      { id: "title", label: "عنوان الشحنة", type: "text", defaultValue: "LITHIUM ION BATTERIES" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const un = escapeXml(fields.unCode || "UN 3481");
      const phone = escapeXml(fields.contactPhone || "+964 770 123 4567");
      const title = escapeXml(fields.title || "LITHIUM ION BATTERIES");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 380" width="500" height="380">
  <!-- Red Striped Border -->
  <rect x="10" y="10" width="480" height="360" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="12" stroke-dasharray="18,12" data-color-role="background"/>
  <!-- Dual Battery Graphics with Fire -->
  <g transform="translate(195, 45)" fill="${secondaryColor}">
    <rect x="15" y="15" width="30" height="60" rx="4"/>
    <rect x="23" y="8" width="14" height="7" rx="2"/>
    <rect x="65" y="15" width="30" height="60" rx="4"/>
    <rect x="73" y="8" width="14" height="7" rx="2"/>
    <!-- Small Flame between batteries -->
    <path d="M 55,25 C 60,35 68,45 68,60 C 68,75 55,85 55,85 C 55,85 42,75 42,60 C 42,45 50,35 55,25 Z" fill="${primaryColor}" data-color-role="primary"/>
  </g>
  <text data-field-id="title" x="250" y="160" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${title}
  </text>
  <!-- UN Code Box -->
  <rect x="130" y="190" width="240" height="60" rx="8" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="unCode" x="250" y="233" font-family="monospace, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${un}
  </text>
  <text x="250" y="295" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="#64748B" text-anchor="middle">
    For additional information:
  </text>
  <text data-field-id="contactPhone" x="250" y="330" font-family="monospace, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${phone}
  </text>
</svg>`;
    },
  },
];
