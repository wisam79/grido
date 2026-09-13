import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { iconMarkup, speechBubblePath } from "./svg-elements";

export const CAFE_TEMPLATES: StickerTemplate[] = [
  {
    id: "cafe_freshly_brewed",
    name: "قهوة محمصة طازجة",
    nameEn: "Freshly Brewed Coffee",
    category: "cafe",
    shape: "circle",
    description: "ملصق قهوة عصري بفقاعات بخار ودرجة التحميص للكافيهات والمحامص",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#78350F",
      secondary: "#D97706",
      background: "#FFFBEB",
    },
    fields: [
      { id: "brand", label: "اسم المحمصة أو الكافيه", type: "text", defaultValue: "محمصة دجلة" },
      { id: "blend", label: "نوع القهوة", type: "text", defaultValue: "حبوب مختصة" },
      { id: "roastLevel", label: "درجة التحميص", type: "text", defaultValue: "تحميص وسط" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const brand = escapeXml(fields.brand || "محمصة دجلة");
      const blend = escapeXml(fields.blend || "حبوب مختصة");
      const roast = escapeXml(fields.roastLevel || "تحميص وسط");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="225" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <circle cx="240" cy="240" r="212" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/>
  ${iconMarkup("coffee", 192, 108, 96, primaryColor)}
  <path d="M 156,176 q 8 -18 0 -34 M 240,176 q 8 -18 0 -34 M 324,176 q 8 -18 0 -34" fill="none" stroke="${secondaryColor}" stroke-width="4" stroke-linecap="round" data-color-role="secondary"/>
  <text data-field-id="brand" x="240" y="268" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${brand}
  </text>
  <text data-field-id="blend" x="240" y="316" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${blend}
  </text>
  <rect x="140" y="344" width="200" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="roastLevel" x="240" y="374" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    ${roast}
  </text>
</svg>`;
    },
  },
  {
    id: "cafe_artisan_bakery",
    name: "مخبز حرفي",
    nameEn: "Artisan Bakery Label",
    category: "cafe",
    shape: "rect",
    description: "ملصق مخبز حرفي بأسلوب السوق الشعبي للأفران والمعجنات المنزلية",
    defaultWidth: 520,
    defaultHeight: 340,
    aspectRatio: 520 / 340,
    defaultMm: { width: 65, height: 42 },
    defaultColors: {
      primary: "#B45309",
      secondary: "#0F172A",
      background: "#FEF3C7",
    },
    fields: [
      { id: "bakeryName", label: "اسم المخبز", type: "text", defaultValue: "فرن السيدة نوريا" },
      { id: "product", label: "المنتج", type: "text", defaultValue: "خبز تنور حطبي" },
      { id: "note", label: "ملاحظة", type: "text", defaultValue: "يُخبز يومياً على الحجر الساخن" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const name = escapeXml(fields.bakeryName || "فرن السيدة نوريا");
      const product = escapeXml(fields.product || "خبز تنور حطبي");
      const note = escapeXml(fields.note || "يُخبز يومياً على الحجر الساخن");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const bubble = speechBubblePath(60, 42, 400, 110, 24, 30, 36);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">
  <rect x="12" y="12" width="496" height="316" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <rect x="34" y="34" width="452" height="272" rx="14" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="1 8" stroke-linecap="round"/>
  <text data-field-id="bakeryName" x="260" y="92" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <path d="M ${34 + 452 * 0.5 - 60},${110} h 120" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round"/>
  ${iconMarkup("sparkle", 244, 128, 32, secondaryColor)}
  <text data-field-id="product" x="260" y="208" font-family="${fontFamily}, sans-serif" font-size="${Math.round(30 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${product}
  </text>
  <path d="${bubble}" fill="${primaryColor}" opacity="0.14" data-color-role="primary"/>
  <text data-field-id="note" x="260" y="270" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.9" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: "cafe_ice_cold",
    name: "مشروب مثلج",
    nameEn: "Ice Cold Drink Label",
    category: "cafe",
    shape: "circle",
    description: "ملصق مشروبات بارد بندفة الثلج للعصائر والمشروبات الصيفية",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#0E7490",
      secondary: "#06B6D4",
      background: "#ECFEFF",
    },
    fields: [
      { id: "drinkName", label: "اسم المشروب", type: "text", defaultValue: "ليمون نعناع مثلج" },
      { id: "tagline", label: "العبارة الدعائية", type: "text", defaultValue: "برودة تنعش يومك" },
      { id: "sizeText", label: "الحجم أو السعر", type: "text", defaultValue: "500 مل" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const drink = escapeXml(fields.drinkName || "ليمون نعناع مثلج");
      const tagline = escapeXml(fields.tagline || "برودة تنعش يومك");
      const size = escapeXml(fields.sizeText || "500 مل");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <circle cx="240" cy="240" r="225" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  ${iconMarkup("snowflake", 200, 60, 80, secondaryColor)}
  <text data-field-id="drinkName" x="240" y="236" font-family="${fontFamily}, sans-serif" font-size="${Math.round(34 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${drink}
  </text>
  <path d="M 130,256 h 220" stroke="${secondaryColor}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="1 7"/>
  <text data-field-id="tagline" x="240" y="292" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.75" text-anchor="middle">
    ${tagline}
  </text>
  <circle cx="240" cy="360" r="40" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="sizeText" x="240" y="367" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
    ${size}
  </text>
</svg>`;
    },
  },
];
