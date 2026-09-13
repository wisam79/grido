import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { iconMarkup, starPoints } from "./svg-elements";

export const SEASONAL_TEMPLATES: StickerTemplate[] = [
  {
    id: "seasonal_ramadan_crescent",
    name: "هلال رمضان الكريم",
    nameEn: "Ramadan Crescent",
    category: "seasonal",
    shape: "circle",
    description: "ملصق رمضاني بهلال ونجوم وفانوس للتهاني والعروض الرمضانية",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    defaultColors: {
      primary: "#1E3A5F",
      secondary: "#D4AF37",
      background: "#FDFBF4",
    },
    fields: [
      { id: "greeting", label: "عبارة التهنئة", type: "text", defaultValue: "رمضان كريم" },
      { id: "wish", label: "الدعاء", type: "text", defaultValue: "كل عام وأنتم بخير" },
      { id: "brand", label: "العلامة أو المتجر", type: "text", defaultValue: "@YourStore.iq" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const greeting = escapeXml(fields.greeting || "رمضان كريم");
      const wish = escapeXml(fields.wish || "كل عام وأنتم بخير");
      const brand = escapeXml(fields.brand || "@YourStore.iq");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const starPts = starPoints(330, 150, 5, 18, 7.5);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <circle cx="250" cy="250" r="225" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <circle cx="250" cy="250" r="212" fill="none" stroke="${secondaryColor}" stroke-width="2" stroke-dasharray="2 8" stroke-linecap="round"/>
  <circle cx="228" cy="162" r="52" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="252" cy="150" r="46" fill="${bg === "none" ? "#ffffff" : backgroundColor}"/>
  <polygon points="${starPts}" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="168" cy="118" r="3" fill="${secondaryColor}"/>
  <circle cx="196" cy="88" r="2.2" fill="${secondaryColor}" opacity="0.6"/>
  <circle cx="356" cy="104" r="2.6" fill="${secondaryColor}" opacity="0.7"/>
  <text data-field-id="greeting" x="250" y="292" font-family="${fontFamily}, sans-serif" font-size="${Math.round(48 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${greeting}
  </text>
  <text data-field-id="wish" x="250" y="338" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.75" text-anchor="middle">
    ${wish}
  </text>
  <text data-field-id="brand" x="250" y="408" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" letter-spacing="1">
    ${brand}
  </text>
</svg>`;
    },
  },
  {
    id: "seasonal_new_year_sparkle",
    name: "سنة جديدة متوهجة",
    nameEn: "Sparkling New Year",
    category: "seasonal",
    shape: "rect",
    description: "ملصق سنة جديدة بألوان متلألئة للتهاني والعروض الاستثنائية",
    defaultWidth: 520,
    defaultHeight: 340,
    aspectRatio: 520 / 340,
    defaultMm: { width: 60, height: 39 },
    defaultColors: {
      primary: "#0F172A",
      secondary: "#E879F9",
      background: "#1E1B4B",
    },
    fields: [
      { id: "year", label: "السنة الجديدة", type: "text", defaultValue: "2027" },
      { id: "greeting", label: "عبارة التهنئة", type: "text", defaultValue: "سنة سعيدة وأمنيات تتحقق" },
      { id: "brand", label: "العلامة أو المتجر", type: "text", defaultValue: "@YourStore.iq" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const year = escapeXml(fields.year || "2027");
      const greeting = escapeXml(fields.greeting || "سنة سعيدة وأمنيات تتحقق");
      const brand = escapeXml(fields.brand || "@YourStore.iq");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const spark1 = starPoints(88, 78, 4, 22, 8);
      const spark2 = starPoints(438, 262, 4, 16, 6);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 340" width="520" height="340">
  <rect x="12" y="12" width="496" height="316" rx="24" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>
  <polygon points="${spark1}" fill="${secondaryColor}" data-color-role="secondary"/>
  <polygon points="${spark2}" fill="${secondaryColor}" opacity="0.7"/>
  <circle cx="140" cy="140" r="2.5" fill="${secondaryColor}"/>
  <circle cx="392" cy="88" r="2" fill="${secondaryColor}" opacity="0.8"/>
  <circle cx="460" cy="76" r="3" fill="${secondaryColor}" opacity="0.6"/>
  <circle cx="60" cy="256" r="2.4" fill="${secondaryColor}" opacity="0.7"/>
  <text data-field-id="year" x="260" y="176" font-family="${fontFamily}, sans-serif" font-size="${Math.round(76 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle" letter-spacing="3">
    ${year}
  </text>
  <text data-field-id="greeting" x="260" y="228" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="#E2E8F0" text-anchor="middle">
    ${greeting}
  </text>
  <text data-field-id="brand" x="260" y="296" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="700" fill="${secondaryColor}" fill-opacity="0.85" text-anchor="middle" letter-spacing="1.5">
    ${brand}
  </text>
</svg>`;
    },
  },
  {
    id: "seasonal_summer_wave",
    name: "موج الصيف الحار",
    nameEn: "Hot Summer Wave",
    category: "seasonal",
    shape: "rect",
    description: "ملصق صيفي بأمواج وشمس حارقة لعروض الموسم والخصومات",
    defaultWidth: 520,
    defaultHeight: 320,
    aspectRatio: 520 / 320,
    defaultMm: { width: 65, height: 40 },
    defaultColors: {
      primary: "#EA580C",
      secondary: "#0EA5E9",
      background: "#FFF7ED",
    },
    fields: [
      { id: "title", label: "عنوان العرض", type: "text", defaultValue: "عرض الصيف الحار" },
      { id: "discount", label: "الخصم", type: "text", defaultValue: "خصم 40%" },
      { id: "period", label: "الفترة", type: "text", defaultValue: "طوال شهر حزيران" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.title || "عرض الصيف الحار");
      const discount = escapeXml(fields.discount || "خصم 40%");
      const period = escapeXml(fields.period || "طوال شهر حزيران");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 320" width="520" height="320">
  <rect x="12" y="12" width="499" height="296" rx="24" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <path d="M 12,262 q 32,-20 64,0 t 64,0 t 64,0 t 64,0 t 64,0 t 64,0 t 64,0 V 308 H 12 Z" fill="${secondaryColor}" opacity="0.22" data-color-role="secondary"/>
  <path d="M 12,286 q 40,-16 80,0 t 80,0 t 80,0 t 80,0 t 80,0 t 80,0 V 308 H 12 Z" fill="${primaryColor}" opacity="0.85" data-color-role="primary"/>
  ${iconMarkup("sun", 420, 46, 58, primaryColor)}
  <text data-field-id="title" x="240" y="100" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="discount" x="240" y="182" font-family="${fontFamily}, sans-serif" font-size="${Math.round(52 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${discount}
  </text>
  <text data-field-id="period" x="240" y="236" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.8" text-anchor="middle">
    ${period}
  </text>
</svg>`;
    },
  },
];
