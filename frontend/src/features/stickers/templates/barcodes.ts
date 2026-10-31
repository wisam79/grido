import { generateBarcodeInnerSvg, generateQrCodeInnerSvg } from '../lib/barcode-svg';
import { escapeXml } from '../lib/svg-rasterizer';

import type { StickerTemplate } from '../types';

export const BARCODE_TEMPLATES: StickerTemplate[] = [
  {
    id: 'barcode_code128',
    name: 'باركود تجاري (Code 128)',
    nameEn: 'Commercial Barcode (Code 128)',
    category: 'barcodes',
    description: 'ملصق باركود قياسي لمنتجات المتاجر ومستودعات التجزئة مع السعر',
    defaultWidth: 500,
    defaultHeight: 300,
    aspectRatio: 500 / 300,
    defaultMm: { width: 100, height: 60 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#0284C7',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'storeTitle',
        label: 'اسم المتجر / العلامة',
        type: 'text',
        defaultValue: 'شركة الرافدين للتجارة',
      },
      { id: 'barcodeValue', label: 'قيمة الباركود', type: 'text', defaultValue: 'IQ-2026-99' },
      { id: 'priceTag', label: 'السعر', type: 'text', defaultValue: '25,000 د.ع' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const store = escapeXml(fields.storeTitle || 'شركة الرافدين للتجارة');
      const codeVal = escapeXml(fields.barcodeValue || 'IQ-2026-99');
      const price = escapeXml(fields.priceTag || '25,000 د.ع');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(fields.barcodeValue || 'IQ-2026-99', 'CODE128', {
        lineColor: primaryColor,
        width: 380,
        height: 70,
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300">
  <rect x="10" y="10" width="480" height="280" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <text data-field-id="storeTitle" data-max-width="428" x="250" y="51" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${store}
  </text>
  <path d="M34 68H466" stroke="${primaryColor}" stroke-width="1" opacity="0.25"/>
  <!-- White quiet zone is independent of the editable/transparent label surface. -->
  <rect x="36" y="73" width="428" height="94" fill="#FFFFFF"/>
  <g transform="translate(60, 85)">
    ${innerBarcode}
  </g>
  <text data-field-id="barcodeValue" data-max-width="428" x="250" y="199" font-family="${fontFamily}, monospace" font-size="${Math.round(19 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle" letter-spacing="2" direction="ltr" unicode-bidi="embed">
    * ${codeVal} *
  </text>
  <path d="M34 219H466" stroke="${primaryColor}" stroke-width="1" opacity="0.25"/>
  <text data-field-id="priceTag" data-max-width="428" x="250" y="263" font-family="${fontFamily}, sans-serif" font-size="${Math.round(29 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${price}
  </text>
</svg>`;
    },
  },
  {
    id: 'barcode_ean13',
    name: 'باركود سلع استهلاكية (EAN-13)',
    nameEn: 'Retail Barcode (EAN-13)',
    category: 'barcodes',
    description: 'باركود التجزئة الدولي القياسي للسلع والمواد الغذائية',
    defaultWidth: 460,
    defaultHeight: 280,
    aspectRatio: 460 / 280,
    defaultMm: { width: 92, height: 56 },
    defaultColors: {
      primary: '#111827',
      secondary: '#15803D',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'itemDesc', label: 'وصف السلعة', type: 'text', defaultValue: 'شاي أسود فاخر 250جم' },
      {
        id: 'barcodeValue',
        label: 'رمز EAN (12 أو 13 رقم)',
        type: 'text',
        defaultValue: '621100012345',
      },
      { id: 'price', label: 'السعر شامل الضريبة', type: 'text', defaultValue: '6,500 د.ع' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const desc = escapeXml(fields.itemDesc || 'شاي أسود فاخر 250جم');
      const codeVal = escapeXml(fields.barcodeValue || '621100012345');
      const price = escapeXml(fields.price || '6,500 د.ع');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(fields.barcodeValue || '621100012345', 'EAN13', {
        lineColor: primaryColor,
        width: 320,
        height: 75,
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280" width="460" height="280">
  <rect x="8" y="8" width="444" height="264" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <text data-field-id="itemDesc" data-max-width="388" x="230" y="42" font-family="${fontFamily}, sans-serif" font-size="${Math.round(20 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" data-color-role="primary">
    ${desc}
  </text>
  <!-- The EAN symbol retains its native geometry and an uninterrupted white surround. -->
  <rect x="46" y="55" width="368" height="98" fill="#FFFFFF"/>
  <g transform="translate(70, 65)">
    ${innerBarcode}
  </g>
  <text data-field-id="barcodeValue" data-max-width="372" x="230" y="183" font-family="${fontFamily}, monospace" font-size="${Math.round(20 * fs)}" font-weight="500" fill="${primaryColor}" text-anchor="middle" letter-spacing="3" direction="ltr" unicode-bidi="embed">
    ${codeVal}
  </text>
  <path d="M32 207H428" stroke="${primaryColor}" stroke-width="1" opacity="0.25"/>
  <text data-field-id="price" data-max-width="388" x="230" y="248" font-family="${fontFamily}, sans-serif" font-size="${Math.round(28 * fs)}" font-weight="800" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${price}
  </text>
</svg>`;
    },
  },
  {
    id: 'barcode_qr_custom',
    name: 'ملصق رمز استجابة (QR Code)',
    nameEn: 'QR Code Scan Tag',
    category: 'barcodes',
    description: 'ملصق مربع أنيق للمواقع، بطاقات الزيارة، قوائم الطعام، والدفع السريع',
    defaultWidth: 440,
    defaultHeight: 480,
    aspectRatio: 440 / 480,
    defaultMm: { width: 88, height: 96 },
    defaultColors: {
      primary: '#0F172A',
      secondary: '#2563EB',
      background: '#FFFFFF',
    },
    fields: [
      {
        id: 'scanTitle',
        label: 'العنوان أعلى الرمز',
        type: 'text',
        defaultValue: 'امسح الرمز لزيارة موقعنا',
      },
      {
        id: 'qrUrl',
        label: 'الرابط أو النص (URL)',
        type: 'text',
        defaultValue: 'https://grido.app',
      },
      {
        id: 'scanSub',
        label: 'العبارة السفلية',
        type: 'text',
        defaultValue: 'SCAN ME WITH CAMERA',
      },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const title = escapeXml(fields.scanTitle || 'امسح الرمز لزيارة موقعنا');
      const sub = escapeXml(fields.scanSub || 'SCAN ME WITH CAMERA');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;
      const qrSvg = generateQrCodeInnerSvg(fields.qrUrl || 'https://grido.app', 250, {
        fgColor: primaryColor,
        bgColor: 'transparent',
      });

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 480" width="440" height="480">
  <rect x="12" y="12" width="416" height="456" rx="8" fill="${bg}" stroke="${primaryColor}" stroke-width="1.5" data-color-role="background"/>
  <text data-field-id="scanTitle" data-max-width="368" x="220" y="43" font-family="${fontFamily}, sans-serif" font-size="${Math.round(21 * fs)}" font-weight="700" fill="${secondaryColor}" text-anchor="middle" data-color-role="secondary">
    ${title}
  </text>
  <!-- 50px of white clears four modules even for version 1; the encoded square is untouched. -->
  <rect x="45" y="55" width="350" height="350" fill="#FFFFFF"/>
  <g transform="translate(95, 105)">
    ${qrSvg}
  </g>
  <text data-field-id="scanSub" data-max-width="368" x="220" y="439" font-family="${fontFamily}, sans-serif" font-size="${Math.round(18 * fs)}" font-weight="700" fill="${primaryColor}" text-anchor="middle" letter-spacing="2" data-color-role="primary">
    ${sub}
  </text>
</svg>`;
    },
  },
  {
    id: 'barcode_warehouse_box',
    name: 'ملصق كراتين ومستودعات',
    nameEn: 'Warehouse Pallet Label',
    category: 'barcodes',
    description: 'ملصق تخزين ولوجستيات عريض للكراتين والمنصات وتحديد موقع الرف',
    defaultWidth: 600,
    defaultHeight: 380,
    aspectRatio: 600 / 380,
    defaultMm: { width: 120, height: 76 },
    defaultColors: {
      primary: '#1E293B',
      secondary: '#047857',
      background: '#FFFFFF',
    },
    fields: [
      { id: 'boxId', label: 'رقم الطرد / الصندوق', type: 'text', defaultValue: 'BOX #9021-A' },
      {
        id: 'shelfLoc',
        label: 'موقع الرف (ZONE/AISLE)',
        type: 'text',
        defaultValue: 'مستودعات بغداد - ممر 04 - رف 12',
      },
      { id: 'barcodeValue', label: 'كود المستودع', type: 'text', defaultValue: 'IQ-WH-99238' },
    ],
    generateSvg: ({
      fields,
      primaryColor,
      secondaryColor,
      backgroundColor,
      isTransparent,
      fontFamily = 'Cairo',
      fontScale = 1,
    }) => {
      const box = escapeXml(fields.boxId || 'BOX #9021-A');
      const shelf = escapeXml(fields.shelfLoc || 'مستودعات بغداد - ممر 04 - رف 12');
      const codeVal = escapeXml(fields.barcodeValue || 'IQ-WH-99238');
      const bg = isTransparent ? 'none' : backgroundColor;
      const fs = fontScale || 1;

      const innerBarcode = generateBarcodeInnerSvg(
        fields.barcodeValue || 'IQ-WH-99238',
        'CODE128',
        {
          lineColor: primaryColor,
          width: 380,
          height: 80,
        },
      );

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380" width="600" height="380">
  <rect x="12" y="12" width="576" height="356" rx="6" fill="${bg}" stroke="${primaryColor}" stroke-width="2" data-color-role="background"/>
  <path d="M36 35V78" stroke="${secondaryColor}" stroke-width="5" data-color-role="secondary"/>
  <text data-field-id="boxId" data-max-width="494" x="312" y="71" font-family="${fontFamily}, monospace" font-size="${Math.round(39 * fs)}" font-weight="800" fill="${primaryColor}" text-anchor="middle" direction="ltr" unicode-bidi="embed" data-color-role="primary">
    ${box}
  </text>
  <path d="M36 97H564" stroke="${primaryColor}" stroke-width="1" opacity="0.25"/>
  <text data-field-id="shelfLoc" data-max-width="516" x="300" y="141" font-family="${fontFamily}, sans-serif" font-size="${Math.round(22 * fs)}" font-weight="600" fill="${secondaryColor}" text-anchor="middle">
    ${shelf}
  </text>
  <!-- No framing enters the barcode's white quiet zone or alters its aspect ratio. -->
  <rect x="86" y="166" width="428" height="108" fill="#FFFFFF"/>
  <g transform="translate(110, 180)">
    ${innerBarcode}
  </g>
  <text data-field-id="barcodeValue" data-max-width="516" x="300" y="326" font-family="${fontFamily}, monospace" font-size="${Math.round(24 * fs)}" font-weight="600" fill="${primaryColor}" text-anchor="middle" letter-spacing="3" direction="ltr" unicode-bidi="embed">
    * ${codeVal} *
  </text>
</svg>`;
    },
  },
];
