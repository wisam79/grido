import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { speechBubblePath, starPoints, sunRaysPath, runningStitchCircle } from "./svg-elements";

export const GREETING_TEMPLATES: StickerTemplate[] = [
  {
    id: "greeting_thanks_bubble",
    name: "بطاقة شكر بفقاعة كلام",
    nameEn: "Thank You Speech Bubble",
    category: "greeting",
    shape: "rect",
    description: "بطاقة شكر عصرية بفقاعة كلام مكتوبة بخط اليد ومنحنيات ناعمة",
    defaultWidth: 520,
    defaultHeight: 360,
    aspectRatio: 520 / 360,
    defaultMm: { width: 60, height: 42 },
    defaultColors: {
      primary: "#7C3AED",
      secondary: "#EC4899",
      background: "#FDF4FF",
    },
    fields: [
      { id: "mainText", label: "عبارة الشكر", type: "text", defaultValue: "شكراً جزيلاً!" },
      { id: "subText", label: "الرسالة الثانوية", type: "text", defaultValue: "طلبك يعني لنا الكثير" },
      { id: "handle", label: "الحساب أو المتجر", type: "text", defaultValue: "@YourStore.iq" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "شكراً جزيلاً!");
      const sub = escapeXml(fields.subText || "طلبك يعني لنا الكثير");
      const handle = escapeXml(fields.handle || "@YourStore.iq");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const bubble = speechBubblePath(70, 40, 380, 190, 34, 42, 52);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360" width="520" height="360">
  <defs>
    <linearGradient id="grad-bubble" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primaryColor}"/>
      <stop offset="1" stop-color="${secondaryColor}"/>
    </linearGradient>
  </defs>
  <rect x="14" y="14" width="492" height="332" rx="26" fill="${bg}" stroke="none" data-color-role="background"/>
  <path d="${bubble}" fill="url(#grad-bubble)" data-color-role="primary"/>
  <circle cx="448" cy="76" r="7" fill="${secondaryColor}" opacity="0.35"/>
  <circle cx="468" cy="58" r="4.5" fill="${secondaryColor}" opacity="0.25"/>
  <text data-field-id="mainText" x="260" y="135" font-family="${fontFamily}, sans-serif" font-size="${Math.round(44 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="260" y="185" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="#FFFFFF" fill-opacity="0.92" text-anchor="middle">
    ${sub}
  </text>
  <g transform="rotate(-4 260 270)">
    <rect x="150" y="248" width="220" height="44" rx="22" fill="${bg}" stroke="${primaryColor}" stroke-width="2.5" stroke-dasharray="1 8" stroke-linecap="round"/>
    <text data-field-id="handle" x="260" y="277" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle">
      ${handle}
    </text>
  </g>
</svg>`;
    },
  },
  {
    id: "greeting_sunburst_seal",
    name: "ختم شمس الاحتفال",
    nameEn: "Sunburst Celebration Seal",
    category: "greeting",
    shape: "circle",
    description: "ختم دائري بأشعة شمس متوهجة للتهاني والإنجازات والمناسبات السعيدة",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 55, height: 55 },
    defaultColors: {
      primary: "#F59E0B",
      secondary: "#B45309",
      background: "#FFFBEB",
    },
    fields: [
      { id: "topText", label: "النص العلوي", type: "text", defaultValue: "ألف مبروك" },
      { id: "centerText", label: "الكلمة المركزية", type: "text", defaultValue: "النجاح" },
      { id: "bottomText", label: "النص السفلي", type: "text", defaultValue: "تستحق كل التهنئة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const top = escapeXml(fields.topText || "ألف مبروك");
      const center = escapeXml(fields.centerText || "النجاح");
      const bottom = escapeXml(fields.bottomText || "تستحق كل التهنئة");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const rays = sunRaysPath(250, 250, 176, 236, 16, 0.36);
      const sparklePts = starPoints(250, 250, 4, 26, 9);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <path id="celebrate-top" d="M 90,250 A 160,160 0 0,1 410,250" fill="none"/>
    <path id="celebrate-bottom" d="M 90,250 A 160,160 0 0,0 410,250" fill="none"/>
  </defs>
  <path d="${rays}" fill="${primaryColor}" data-color-role="primary"/>
  <circle cx="250" cy="250" r="175" fill="${bg}" stroke="${secondaryColor}" stroke-width="3" data-color-role="background"/>
  <circle cx="250" cy="250" r="160" fill="none" stroke="${primaryColor}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
  <text data-field-id="topText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    <textPath data-field-id="topText" href="#celebrate-top" startOffset="50%">${top}</textPath>
  </text>
  <polygon points="${sparklePts}" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="centerText" x="250" y="292" font-family="${fontFamily}, sans-serif" font-size="${Math.round(58 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${center}
  </text>
  <text data-field-id="bottomText" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    <textPath data-field-id="bottomText" href="#celebrate-bottom" startOffset="50%">${bottom}</textPath>
  </text>
</svg>`;
    },
  },
  {
    id: "greeting_stitched_badge",
    name: "شارة شكر بخياطة يدوية",
    nameEn: "Hand-Stitched Thanks Badge",
    category: "greeting",
    shape: "circle",
    description: "شارة بأسلوب الخياطة اليدوية والنسيج لهدايا المتاجر الحرفية والباقات",
    defaultWidth: 500,
    defaultHeight: 500,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#9A3412",
      secondary: "#FDE68A",
      background: "#FFFBEB",
    },
    fields: [
      { id: "mainText", label: "النص الرئيسي", type: "text", defaultValue: "مصنوع بحب" },
      { id: "subText", label: "النص الفرعي", type: "text", defaultValue: "مع كل خيط وخياطة" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const main = escapeXml(fields.mainText || "مصنوع بحب");
      const sub = escapeXml(fields.subText || "مع كل خيط وخياطة");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <circle cx="250" cy="250" r="225" fill="${bg}" stroke="${primaryColor}" stroke-width="7" data-color-role="background"/>
  ${runningStitchCircle(250, 250, 200, secondaryColor, 4, "12 8")}
  ${runningStitchCircle(250, 250, 172, primaryColor, 3, "2 9")}
  <text data-field-id="mainText" x="250" y="238" font-family="${fontFamily}, sans-serif" font-size="${Math.round(52 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${main}
  </text>
  <text data-field-id="subText" x="250" y="292" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.8" text-anchor="middle">
    ${sub}
  </text>
</svg>`;
    },
  },
];
