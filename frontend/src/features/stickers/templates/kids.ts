import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { iconMarkup, scallopCirclePath, starPoints, regularPolygonPoints } from "./svg-elements";

export const KIDS_TEMPLATES: StickerTemplate[] = [
  {
    id: "kids_birthday_star",
    name: "عيد ميلاد نجم",
    nameEn: "Birthday Star",
    category: "kids",
    shape: "circle",
    description: "ملصق عيد ميلاد مرحن بنجوم منفوخة وحروف لعوب للأطفال",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#4F46E5",
      secondary: "#F59E0B",
      background: "#EEF2FF",
    },
    fields: [
      { id: "childName", label: "اسم الطفل", type: "text", defaultValue: "يارا" },
      { id: "age", label: "العمر", type: "text", defaultValue: "٦ سنوات" },
      { id: "wishText", label: "عبارة التمني", type: "text", defaultValue: "عيد ميلاد سعيد" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const name = escapeXml(fields.childName || "يارا");
      const age = escapeXml(fields.age || "٦ سنوات");
      const wish = escapeXml(fields.wishText || "عيد ميلاد سعيد");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const scallops = scallopCirclePath(240, 240, 224, 12);
      const starL = starPoints(96, 130, 5, 22, 9);
      const starR = starPoints(384, 130, 5, 22, 9);
      const starBig = starPoints(240, 366, 5, 34, 14);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <path d="${scallops}" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <polygon points="${starL}" fill="${secondaryColor}"/>
  <polygon points="${starR}" fill="${secondaryColor}"/>
  <polygon points="${starBig}" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="childName" x="240" y="180" font-family="${fontFamily}, sans-serif" font-size="${Math.round(54 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <text data-field-id="age" x="240" y="242" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${age}
  </text>
  <text data-field-id="wishText" x="240" y="302" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="600" fill="${primaryColor}" fill-opacity="0.7" text-anchor="middle">
    ${wish}
  </text>
</svg>`;
    },
  },
  {
    id: "kids_party_dinosaur",
    name: "حفلة الديناصور",
    nameEn: "Dinosaur Party",
    category: "kids",
    shape: "rect",
    description: "دعوة حفلة ديناصورات مغامرة للأطفال المحبين للاستكشاف",
    defaultWidth: 520,
    defaultHeight: 360,
    aspectRatio: 520 / 360,
    defaultMm: { width: 60, height: 42 },
    defaultColors: {
      primary: "#15803D",
      secondary: "#65A30D",
      background: "#F7FEE7",
    },
    fields: [
      { id: "title", label: "عنوان الحفلة", type: "text", defaultValue: "حفلة الديناصورات" },
      { id: "childName", label: "اسم المدعو", type: "text", defaultValue: "البطل سيف" },
      { id: "place", label: "المكان والوقت", type: "text", defaultValue: "قاعة المغامرات • 5 عصراً" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.title || "حفلة الديناصورات");
      const name = escapeXml(fields.childName || "البطل سيف");
      const place = escapeXml(fields.place || "قاعة المغامرات • 5 عصراً");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const hexPts = regularPolygonPoints(118, 84, 42, 6, 0);

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 360" width="520" height="360">
  <rect x="12" y="12" width="496" height="336" rx="26" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <polygon points="${hexPts}" fill="${secondaryColor}" opacity="0.3" data-color-role="secondary"/>
  <circle cx="418" cy="70" r="6" fill="${secondaryColor}"/>
  <circle cx="442" cy="92" r="4" fill="${secondaryColor}" opacity="0.6"/>
  <text data-field-id="title" x="270" y="102" font-family="${fontFamily}, sans-serif" font-size="${Math.round(36 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <path d="M 120,128 q 60,-28 150,0" fill="none" stroke="${secondaryColor}" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 8"/>
  <text data-field-id="childName" x="260" y="212" font-family="${fontFamily}, sans-serif" font-size="${Math.round(40 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${name}
  </text>
  <rect x="120" y="248" width="280" height="44" rx="22" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="place" x="260" y="277" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="#FFFFFF" text-anchor="middle">
    ${place}
  </text>
</svg>`;
    },
  },
  {
    id: "kids_reward_chart",
    name: "وسام إنجاز بطل",
    nameEn: "Hero Achievement Medal",
    category: "kids",
    shape: "circle",
    description: "وسام نجوم وإنجاز للتحفيز السلوكي ومكافآت المدارس والحضانات",
    defaultWidth: 480,
    defaultHeight: 480,
    aspectRatio: 1,
    defaultMm: { width: 45, height: 45 },
    defaultColors: {
      primary: "#D97706",
      secondary: "#7C2D12",
      background: "#FFFBEB",
    },
    fields: [
      { id: "title", label: "لقب الوسام", type: "text", defaultValue: "بطل الأسبوع" },
      { id: "childName", label: "اسم البطل", type: "text", defaultValue: "الأستاذ حسين" },
      { id: "stars", label: "عدد النجوم", type: "text", defaultValue: "★★★★★" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.title || "بطل الأسبوع");
      const name = escapeXml(fields.childName || "الأستاذ حسين");
      const stars = escapeXml(fields.stars || "★★★★★");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const ribbonL = `M 168,404 L 128,470 L 168,452 L 198,472 L 190,410 Z`;
      const ribbonR = `M 312,404 L 352,470 L 312,452 L 282,472 L 290,410 Z`;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480" width="480" height="480">
  <path d="${ribbonL}" fill="${secondaryColor}" data-color-role="secondary"/>
  <path d="${ribbonR}" fill="${secondaryColor}" data-color-role="secondary"/>
  <circle cx="240" cy="240" r="190" fill="${bg}" stroke="${primaryColor}" stroke-width="8" data-color-role="background"/>
  <circle cx="240" cy="240" r="172" fill="none" stroke="${secondaryColor}" stroke-width="2.5" stroke-dasharray="8 5"/>
  ${iconMarkup("star", 218, 116, 44, primaryColor)}
  <text data-field-id="title" x="240" y="228" font-family="${fontFamily}, sans-serif" font-size="${Math.round(38 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <text data-field-id="stars" x="240" y="278" font-family="${fontFamily}, sans-serif" font-size="${Math.round(26 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${stars}
  </text>
  <text data-field-id="childName" x="240" y="330" font-family="${fontFamily}, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="600" fill="${secondaryColor}" fill-opacity="0.85" text-anchor="middle">
    ${name}
  </text>
</svg>`;
    },
  },
];
