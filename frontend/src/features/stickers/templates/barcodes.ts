import { StickerTemplate } from "../types";
import { escapeXml } from "../lib/svg-rasterizer";
import { generateBarcodeInnerSvg, generateQrCodeInnerSvg } from "../lib/barcode-svg";

export const BARCODE_TEMPLATES: StickerTemplate[] = [
  {
    id: "barcode_code128",
    name: "باركود تجاري (Code 128)",
    nameEn: "Commercial Barcode (Code 128)",
    category: "barcodes",
    description: "ملصق باركود قياسي لمنتجات المتاجر ومستودعات التجزئة مع السعر",
    defaultWidth: 500,
    defaultHeight: 300,
    aspectRatio: 500 / 300,
    defaultColors: {
      primary: "#0F172A",
      secondary: "#0284C7",
      background: "#FFFFFF",
    },
    fields: [
      { id: "storeTitle", label: "اسم المتجر / العلامة", type: "text", defaultValue: "شركة الرافدين للتجارة" },
      { id: "barcodeValue", label: "قيمة الباركود", type: "text", defaultValue: "IQ-2026-99" },
      { id: "priceTag", label: "السعر", type: "text", defaultValue: "25,000 د.ع" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const store = escapeXml(fields.storeTitle || "شركة الرافدين للتجارة");
      const codeVal = escapeXml(fields.barcodeValue || "IQ-2026-99");
      const price = escapeXml(fields.priceTag || "25,000 د.ع");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(fields.barcodeValue || "IQ-2026-99", "CODE128", {
        lineColor: primaryColor,
        width: 380,
        height: 70,
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300">
  <rect x="10" y="10" width="480" height="280" rx="12" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <!-- Store Header -->
  <text data-field-id="storeTitle" x="250" y="52" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${store}
  </text>
  <line x1="30" y1="68" x2="470" y2="68" stroke="${primaryColor}" stroke-width="1.5" stroke-dasharray="6,4"/>
  <!-- Barcode Area -->
  <g transform="translate(60, 85)">
    ${innerBarcode}
  </g>
  <!-- Barcode Text -->
  <text data-field-id="barcodeValue" x="250" y="200" font-family="monospace" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="3">
    * ${codeVal} *
  </text>
  <!-- Price Strip -->
  <rect x="140" y="222" width="220" height="42" rx="8" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="priceTag" x="250" y="251" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${price}
  </text>
</svg>`;
    },
  },
  {
    id: "barcode_ean13",
    name: "باركود سلع استهلاكية (EAN-13)",
    nameEn: "Retail Barcode (EAN-13)",
    category: "barcodes",
    description: "باركود التجزئة الدولي القياسي للسلع والمواد الغذائية",
    defaultWidth: 460,
    defaultHeight: 280,
    aspectRatio: 460 / 280,
    defaultColors: {
      primary: "#111827",
      secondary: "#15803D",
      background: "#FFFFFF",
    },
    fields: [
      { id: "itemDesc", label: "وصف السلعة", type: "text", defaultValue: "شاي أسود فاخر 250جم" },
      { id: "barcodeValue", label: "رمز EAN (12 أو 13 رقم)", type: "text", defaultValue: "621100012345" },
      { id: "price", label: "السعر شامل الضريبة", type: "text", defaultValue: "6,500 د.ع" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const desc = escapeXml(fields.itemDesc || "شاي أسود فاخر 250جم");
      const codeVal = escapeXml(fields.barcodeValue || "621100012345");
      const price = escapeXml(fields.price || "6,500 د.ع");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(fields.barcodeValue || "621100012345", "EAN13", {
        lineColor: primaryColor,
        width: 320,
        height: 75,
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280" width="460" height="280">
  <rect x="8" y="8" width="444" height="264" rx="10" fill="${bg}" stroke="${primaryColor}" stroke-width="3" data-color-role="background"/>
  <text data-field-id="itemDesc" x="230" y="45" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle">
    ${desc}
  </text>
  <g transform="translate(70, 65)">
    ${innerBarcode}
  </g>
  <text data-field-id="barcodeValue" x="230" y="185" font-family="monospace" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="4">
    ${codeVal}
  </text>
  <!-- Price Tag -->
  <text data-field-id="price" x="230" y="235" font-family="${fontFamily}, sans-serif" font-size="${Math.round(24 * fs)}" font-weight="900" fill="${secondaryColor}" text-anchor="middle">
    ${price}
  </text>
</svg>`;
    },
  },
  {
    id: "barcode_qr_custom",
    name: "ملصق رمز استجابة (QR Code)",
    nameEn: "QR Code Scan Tag",
    category: "barcodes",
    description: "ملصق مربع أنيق للمواقع، بطاقات الزيارة، قوائم الطعام، والدفع السريع",
    defaultWidth: 440,
    defaultHeight: 480,
    aspectRatio: 440 / 480,
    defaultColors: {
      primary: "#0F172A",
      secondary: "#2563EB",
      background: "#FFFFFF",
    },
    fields: [
      { id: "scanTitle", label: "العنوان أعلى الرمز", type: "text", defaultValue: "امسح الرمز لزيارة موقعنا" },
      { id: "qrUrl", label: "الرابط أو النص (URL)", type: "text", defaultValue: "https://grido.app" },
      { id: "scanSub", label: "العبارة السفلية", type: "text", defaultValue: "SCAN ME WITH CAMERA" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const title = escapeXml(fields.scanTitle || "امسح الرمز لزيارة موقعنا");
      const sub = escapeXml(fields.scanSub || "SCAN ME WITH CAMERA");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || "https://grido.app", 250, {
        fgColor: primaryColor,
        bgColor: "transparent",
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 480" width="440" height="480">
  <rect x="12" y="12" width="416" height="456" rx="20" fill="${bg}" stroke="${primaryColor}" stroke-width="4" data-color-role="background"/>
  <text data-field-id="scanTitle" x="220" y="55" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle">
    ${title}
  </text>
  <!-- QR Frame Container -->
  <rect x="70" y="80" width="300" height="300" rx="16" fill="#FFFFFF" stroke="${primaryColor}" stroke-width="2"/>
  <g transform="translate(95, 105)">
    ${qrSvg}
  </g>

  <!-- Scan prompt footer -->
  <rect x="80" y="405" width="280" height="42" rx="10" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="scanSub" x="220" y="433" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="1">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: "barcode_warehouse_box",
    name: "ملصق كراتين ومستودعات",
    nameEn: "Warehouse Pallet Label",
    category: "barcodes",
    description: "ملصق تخزين ولوجستيات عريض للكراتين والمنصات وتحديد موقع الرف",
    defaultWidth: 600,
    defaultHeight: 380,
    aspectRatio: 600 / 380,
    defaultColors: {
      primary: "#1E293B",
      secondary: "#047857",
      background: "#FFFFFF",
    },
    fields: [
      { id: "boxId", label: "رقم الطرد / الصندوق", type: "text", defaultValue: "BOX #9021-A" },
      { id: "shelfLoc", label: "موقع الرف (ZONE/AISLE)", type: "text", defaultValue: "مستودعات بغداد - ممر 04 - رف 12" },
      { id: "barcodeValue", label: "كود المستودع", type: "text", defaultValue: "IQ-WH-99238" },
    ],
    generateSvg: ({ fields, primaryColor, secondaryColor, backgroundColor, isTransparent, fontFamily = "Cairo", fontScale = 1 }) => {
      const box = escapeXml(fields.boxId || "BOX #9021-A");
      const shelf = escapeXml(fields.shelfLoc || "مستودعات بغداد - ممر 04 - رف 12");
      const codeVal = escapeXml(fields.barcodeValue || "IQ-WH-99238");
      const bg = isTransparent ? "none" : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(fields.barcodeValue || "IQ-WH-99238", "CODE128", {
        lineColor: primaryColor,
        width: 380,
        height: 80,
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" width="600" height="380">
  <rect x="12" y="12" width="576" height="356" rx="14" fill="${bg}" stroke="${primaryColor}" stroke-width="6" data-color-role="background"/>
  <!-- Top Bar -->
  <rect x="12" y="12" width="576" height="85" fill="${primaryColor}" data-color-role="primary"/>
  <text data-field-id="boxId" x="300" y="66" font-family="monospace" font-size="${Math.round(44 * fs)}" font-weight="900" fill="#FFFFFF" text-anchor="middle">
    ${box}
  </text>
  <!-- Location Banner -->
  <rect x="40" y="115" width="520" height="46" rx="8" fill="${secondaryColor}" data-color-role="secondary"/>
  <text data-field-id="shelfLoc" x="300" y="145" font-family="${fontFamily}, monospace" font-size="${Math.round(20 * fs)}" font-weight="800" fill="#FFFFFF" text-anchor="middle">
    ${shelf}
  </text>
  <!-- Barcode Area -->
  <g transform="translate(110, 180)">
    ${innerBarcode}
  </g>
  <text data-field-id="barcodeValue" x="300" y="325" font-family="monospace" font-size="${Math.round(26 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" letter-spacing="4">
    * ${codeVal} *
  </text>
</svg>`;
    },
  },
];
