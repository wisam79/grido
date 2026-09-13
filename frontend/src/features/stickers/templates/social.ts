import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";

export const SOCIAL_TEMPLATES: StickerTemplate[] = [
  {
    id: "social_pay_accepted",
    name: "ملصق الدفع الإلكتروني المعتمد",
    nameEn: "Contactless Pay Accepted",
    category: "social",
    shape: "rect",
    description: "ملصق لطاولات الكاشير ونقاط البيع يوضح قبول زين كاش وكي كارد والبطاقات المصرفية",
    defaultWidth: 500,
    defaultHeight: 320,
    aspectRatio: 500 / 320,
    defaultMm: { width: 70, height: 45 },
    defaultColors: {
      primary: "#0F172A",
      secondary: "#0284C7",
      background: "#FFFFFF",
    },
    fields: [
      { id: "payTitle", label: "عنوان الدفع", type: "text", defaultValue: "طرق الدفع الإلكتروني" },
      { id: "payMethods", label: "الشبكات المقبولة", type: "text", defaultValue: "زين كاش • كي كارد • FIB • Visa" },
      { id: "note", label: "ملاحظة سريعة", type: "text", defaultValue: "دفع آمن وفوري بدون تلامس" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.payTitle || "طرق الدفع الإلكتروني");
      const methods = escapeXml(fields.payMethods || "زين كاش • كي كارد • FIB • Visa");
      const note = escapeXml(fields.note || "دفع آمن وفوري بدون تلامس");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 320" width="500" height="320">
  <rect x="12" y="12" width="476" height="296" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Contactless Waves Icon -->
  <g transform="translate(250, 60)" stroke="${secondaryColor}" stroke-width="4" fill="none" stroke-linecap="round" data-color-role="secondary">
    <path d="M -15,-10 A 18,18 0 0,1 -15,10"/>
    <path d="M -5,-18 A 28,28 0 0,1 -5,18"/>
    <path d="M 5,-26 A 38,38 0 0,1 5,26"/>
  </g>
  <text data-field-id="payTitle" x="250" y="125" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <!-- Accepted Networks Pill -->
  <rect x="50" y="155" width="400" height="65" rx="14" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="payMethods" x="250" y="198" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${methods}
  </text>
  <text data-field-id="note" x="250" y="270" font-family="${fontFamily}, sans-serif" font-size="${Math.round(17 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle">
    ${note}
  </text>
</svg>`;
    },
  },
  {
    id: "social_follow_us",
    name: "تابعنا على منصات التواصل",
    nameEn: "Follow Us Social Tag",
    category: "social",
    shape: "square",
    description: "ملصق لحسابات انستغرام وتيك توك وسناب شات مع رمز المنشن",
    defaultWidth: 460,
    defaultHeight: 460,
    aspectRatio: 1,
    defaultMm: { width: 50, height: 50 },
    defaultColors: {
      primary: "#BE185D",
      secondary: "#1E293B",
      background: "#FFF1F2",
    },
    fields: [
      { id: "callToAction", label: "الدعوة للمتابعة", type: "text", defaultValue: "يسعدنا انضمامك إلينا!" },
      { id: "handle", label: "اسم الحساب (@Handle)", type: "text", defaultValue: "@GridoStudio.iq" },
      { id: "platforms", label: "المنصات المتواجدين عليها", type: "text", defaultValue: "TikTok • Instagram • X" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const cta = escapeXml(fields.callToAction || "يسعدنا انضمامك إلينا!");
      const handle = escapeXml(fields.handle || "@GridoStudio.iq");
      const platforms = escapeXml(fields.platforms || "TikTok • Instagram • X");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" width="460" height="460">
  <rect x="18" y="18" width="424" height="424" rx="26" fill="${bg}" stroke="${primaryColor}" stroke-width="5" data-color-role="background"/>
  <!-- At Symbol Icon -->
  <circle cx="230" cy="115" r="45" fill="${primaryColor}" opacity="0.15" data-color-role="primary"/>
  <text x="230" y="132" font-family="${fontFamily}, sans-serif" font-size="${Math.round(52 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">@</text>
  <text data-field-id="callToAction" x="230" y="215" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${cta}
  </text>
  <!-- Handle Badge -->
  <rect x="70" y="245" width="320" height="66" rx="16" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="handle" x="230" y="288" font-family="monospace, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle" direction="ltr" unicode-bidi="embed">
    ${handle}
  </text>
  <text data-field-id="platforms" x="230" y="365" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="#64748B" text-anchor="middle">
    ${platforms}
  </text>
</svg>`;
    },
  },
  {
    id: "social_wifi_access",
    name: "بطاقة الاتصال بالواي فاي",
    nameEn: "Free Guest WiFi Card",
    category: "social",
    shape: "rect",
    description: "ملصق لطاولات الكافيهات والمكاتب لاسم شبكة الإنترنت وكلمة المرور",
    defaultWidth: 500,
    defaultHeight: 340,
    aspectRatio: 500 / 340,
    defaultMm: { width: 70, height: 48 },
    defaultColors: {
      primary: "#2563EB",
      secondary: "#0F172A",
      background: "#EFF6FF",
    },
    fields: [
      { id: "wifiTitle", label: "عنوان الشبكة", type: "text", defaultValue: "إنترنت مجاني للضيوف" },
      { id: "ssid", label: "اسم الشبكة (SSID)", type: "text", defaultValue: "Dijlah_Guest_5G" },
      { id: "password", label: "كلمة السر (Password)", type: "text", defaultValue: "Welcome#2026" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.wifiTitle || "إنترنت مجاني للضيوف");
      const ssid = escapeXml(fields.ssid || "Dijlah_Guest_5G");
      const pass = escapeXml(fields.password || "Welcome#2026");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 340" width="500" height="340">
  <rect x="12" y="12" width="476" height="316" rx="16" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- WiFi Signal Icon -->
  <g transform="translate(250, 55)" stroke="${primaryColor}" stroke-width="4" fill="none" stroke-linecap="round" data-color-role="primary">
    <path d="M -30,-5 A 38,38 0 0,1 30,-5"/>
    <path d="M -18,6 A 22,22 0 0,1 18,6"/>
    <circle cx="0" cy="16" r="3" fill="${primaryColor}"/>
  </g>
  <text data-field-id="wifiTitle" x="250" y="120" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="middle">
    ${title}
  </text>
  <!-- SSID Box -->
  <rect x="60" y="145" width="380" height="52" rx="10" fill="#DBEAFE"/>
  <text x="80" y="178" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${secondaryColor}">
    الشبكة (SSID):
  </text>
  <text data-field-id="ssid" x="420" y="178" font-family="monospace, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="900" fill="${primaryColor}" text-anchor="end">
    ${ssid}
  </text>
  <!-- Password Box -->
  <rect x="60" y="215" width="380" height="52" rx="10" fill="#DBEAFE"/>
  <text x="80" y="248" font-family="${fontFamily}, sans-serif" font-size="${Math.round(16 * fs)}" font-weight="800" fill="${secondaryColor}">
    كلمة المرور:
  </text>
  <text data-field-id="password" x="420" y="248" font-family="monospace, sans-serif" font-size="${Math.round(19 * fs)}" font-weight="900" fill="#DC2626" text-anchor="end">
    ${pass}
  </text>
  <text x="250" y="300" font-family="${fontFamily}, sans-serif" font-size="${Math.round(15 * fs)}" font-weight="700" fill="#64748B" text-anchor="middle">
    FREE HIGH-SPEED GUEST WIFI
  </text>
</svg>`;
    },
  },
];
