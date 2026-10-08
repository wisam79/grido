/**
 * print-page-style.ts — توليد أنماط CSS واستخراج روابط الطباعة
 *
 * مسؤولية أحادية: توليد نمط CSS الصارم لـ @page و WebView2 للطباعة بهوامش صفرية وحفظ النسبة 1:1.
 * مستخرج من use-print-export.ts ضمن خطة الإصلاح المعماري.
 */

/**
 * يستخرج رابط صورة ورقة الطباعة من وثيقة HTML المرافقة.
 */
export function extractPrintImageSrc(htmlDoc: string): string {
  if (!htmlDoc || typeof DOMParser === 'undefined') return '';
  try {
    const parsed = new DOMParser().parseFromString(htmlDoc, 'text/html');
    return parsed.querySelector('img')?.getAttribute('src') ?? '';
  } catch {
    return '';
  }
}

/**
 * يولّد نمط CSS الصارم لـ @page و WebView2 للطباعة بهوامش صفرية وحفظ النسبة 1:1.
 * يمنع الصفحات البيضاء الزائدة عبر حصر الحاوية بنسبة 100% ومنع الفواصل بعد العناصر.
 */
export function generatePrintPageStyle(paperWidthMM: number, paperHeightMM: number): string {
  return (
    `#print-container { display: none !important; }\n` +
    `@media screen { #print-container { display: none !important; } }\n` +
    `@page { margin: 0 !important; size: ${paperWidthMM}mm ${paperHeightMM}mm; }\n` +
    `@page :left { margin: 0 !important; }\n` +
    `@page :right { margin: 0 !important; }\n` +
    `@page :first { margin: 0 !important; }\n` +
    `@media print {\n` +
    `  * { box-sizing: border-box !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }\n` +
    `  html, body {\n` +
    `    margin: 0 !important;\n` +
    `    padding: 0 !important;\n` +
    `    width: 100% !important;\n` +
    `    height: 100% !important;\n` +
    `    max-width: 100% !important;\n` +
    `    max-height: 100% !important;\n` +
    `    overflow: hidden !important;\n` +
    `    background: white !important;\n` +
    `    page-break-after: avoid !important;\n` +
    `    break-after: avoid !important;\n` +
    `    -webkit-print-color-adjust: exact !important;\n` +
    `    print-color-adjust: exact !important;\n` +
    `  }\n` +
    `  body > *:not(#print-container) { display: none !important; }\n` +
    `  #print-container {\n` +
    `    display: block !important;\n` +
    `    position: absolute !important;\n` +
    `    top: 0 !important;\n` +
    `    left: 0 !important;\n` +
    `    width: 100% !important;\n` +
    `    height: 100% !important;\n` +
    `    max-width: 100% !important;\n` +
    `    max-height: 100% !important;\n` +
    `    margin: 0 !important;\n` +
    `    padding: 0 !important;\n` +
    `    overflow: hidden !important;\n` +
    `    background: white !important;\n` +
    `    page-break-after: avoid !important;\n` +
    `    break-after: avoid !important;\n` +
    `    page-break-inside: avoid !important;\n` +
    `    break-inside: avoid !important;\n` +
    `  }\n` +
    `  #print-container img {\n` +
    `    position: absolute !important;\n` +
    `    top: 0 !important;\n` +
    `    left: 0 !important;\n` +
    `    width: 100% !important;\n` +
    `    height: 100% !important;\n` +
    `    max-width: 100% !important;\n` +
    `    max-height: 100% !important;\n` +
    `    object-fit: fill !important;\n` +
    `    display: block !important;\n` +
    `    margin: 0 !important;\n` +
    `    padding: 0 !important;\n` +
    `    page-break-after: avoid !important;\n` +
    `    break-after: avoid !important;\n` +
    `    page-break-inside: avoid !important;\n` +
    `    break-inside: avoid !important;\n` +
    `  }\n` +
    `}`
  );
}
