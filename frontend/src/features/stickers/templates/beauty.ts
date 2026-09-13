import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { iconMarkup, starPoints, speechBubblePath } from "./svg-elements";

export const BEAUTY_TEMPLATES: StickerTemplate[] = [
  {
    id: "beauty_organic_leaf",
    name: "منتج طبيعي وعضوي",
    nameEn: "Organic Natural Product",
    category: "beauty",
    shape: "rect",
    description: "ملصق مستحضرات طبيعية بورقة نباتية لمنتجات التجميل والبشرة",
    defaultWidth: 520,
    defaultHeight: 320,
    aspectRatio: 520 / 320,
    defaultMm: { width: 65, height: 40 },
    defaultColors: {
      primary: "#166534",
      secondary: "#84CC16",
      background: "#F0FDF4",
    },
    fields: [
      { id: "productName", label: "اسم المنتج", type: "text", defaultValue: "زيت الأرض الطبيعي" },
      { id: "benefit", label: "الفائدة", type: "text", defaultValue: "ترطيب عميق للبشرة" },
      { id: "volume", label: "الحجم", type: "text", defaultValue: "30 مل" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const name = escapeXml(fields.productName || "زيت الأرض الطبيعي");
      const benefit = escapeXml(fields.benefit || "ترطيب عميق للبشرة");
      const volume = escapeXml(fields.volume || "30 مل");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="520" height="320">
  <rect x="12" y="12" width="496" height="296" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  ${iconMarkup("leaf", 58, 96, 100, secondaryColor, "secondary")}
  <text data-field-id="productName" x="318" y="145" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="benefit" x="318" y="195" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.75" text-anchor="middle">
    ${benefit}
  </text>
  <rect x="248" y="232" width="140" height="38" rx="19" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="volume" x="318" y="258" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    ${volume}
  </text>
</svg>`;
    },
  },
  {
    id: "beauty_glow_star",
    name: "توهج ولمعان",
    nameEn: "Glow & Shine",
    category: "beauty",
    shape: "circle",
    description: "ملصق توهج بلمسات نجوم للمستحضرات البراقة والعناية الفاخرة",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#DB2777",
      secondary: "#F9A8D4",
      background: "#FDF2F8",
    },
    fields: [
      { id: "productName", label: "اسم المنتج", type: "text", defaultValue: "سيروم التوهج" },
      { id: "claim", label: "الوعد أو النتيجة", type: "text", defaultValue: "إشراقة فورية للبشرة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const name = escapeXml(fields.productName || "سيروم التوهج");
      const claim = escapeXml(fields.claim || "إشراقة فورية للبشرة");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const sparklePts = starPoints(240, 132, 4, 30, 11);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <defs>
    <radialGradient id="glow-bg" cx="0.5" cy="0.4" r="0.75">
      <stop offset="0" stop-color="${secondaryColor}" stop-opacity="0.45"/>
      <stop offset="1" stop-color="${bg === "none" ? "none" : backgroundColor}"/>
    </radialGradient>
  </defs>
  <circle cx="240" cy="240" r="225" fill="${bg === "none" ? "none" : "url(#glow-bg)"}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <polygon points="${sparklePts}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="150" cy="110" r="3.5" fill="${primaryColor}" opacity="0.5"/>
  <circle cx="336" cy="150" r="2.8" fill="${primaryColor}" opacity="0.4"/>
  <circle cx="310" cy="94" r="2.2" fill="${secondaryColor}"/>
  <text data-field-id="productName" x="240" y="252" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="claim" x="240" y="304" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.72" text-anchor="middle">
    ${claim}
  </text>
</svg>`;
    },
  },
  {
    id: "beauty_handmade_pink",
    name: "صناعة يدوية وردية",
    nameEn: "Handmade Pink Craft",
    category: "beauty",
    shape: "circle",
    description: "شارة ورقية بطابع الصناعة المنزلية للصابون والشموع والهدايا",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#BE185D",
      secondary: "#FDA4AF",
      background: "#FFF1F2",
    },
    fields: [
      { id: "craftName", label: "اسم المنتج اليدوي", type: "text", defaultValue: "صابون مغربي يدوي" },
      { id: "ingredient", label: "المكون الأساسي", type: "text", defaultValue: "زيت أركان وورد دمشقي" },
      { id: "maker", label: "الصانعة أو العلامة", type: "text", defaultValue: "ورشة ليان الحرفية" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const name = escapeXml(fields.craftName || "صابون مغربي يدوي");
      const ingredient = escapeXml(fields.ingredient || "زيت أركان وورد دمشقي");
      const maker = escapeXml(fields.maker || "ورشة ليان الحرفية");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const bubble = speechBubblePath(110, 72, 260, 92, 22, 26, 34);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="225" fill="${bg}" stroke="${primaryColor}" stroke-width="4.5" data-color-role="background"/>
  <circle cx="240" cy="240" r="210" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>
  ${iconMarkup("heart", 218, 116, 44, primaryColor)}
  <text data-field-id="craftName" x="240" y="226" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <path d="${bubble}" fill="${secondaryColor}" opacity="0.4" data-color-role="secondary"/>
  <text data-field-id="ingredient" x="240" y="282" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.85" text-anchor="middle">
    ${ingredient}
  </text>
  <text data-field-id="maker" x="240" y="342" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="1">
    ${maker}
  </text>
</svg>`;
    },
  },
];
