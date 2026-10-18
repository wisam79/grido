/**
 * Utility to rasterize vector SVG strings into high-resolution PNG blobs/data URLs
 * (300 DPI target) and trigger direct file downloads.
 *
 * المسار الداخلي المفضّل هو Blob (`renderSvgToPngBlob`) لتفادي Base64؛
 * `renderSvgToPngDataUrl` يبقى للتوافق مع الحافظة وبعض الواجهات القديمة.
 */

import { registerObjectUrl } from '@/lib/io/object-url-registry';
import { assertRasterBudget } from './export-limits';

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Ensures font families used inside an SVG are fully loaded before rasterizing.
 * SVG images rendered inside <img> do not wait for WebFonts — without this,
 * exports can silently fall back to the system font.
 */
async function ensureFontsReady(fontFamilies?: string[]): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  // #10 — تحميل أوزان متعددة (400, 700, 900) بدلاً من 900 فقط
  // الملصقات تستخدم أوزاناً مختلفة — بيئة <img src=SVG> لا تنتظر WebFonts
  const WEIGHTS_TO_LOAD = [400, 700, 900];

  const loads = (fontFamilies ?? [])
    .flatMap((raw) => {
      const clean = raw.split(',')[0].trim().replace(/['"]/g, '');
      if (!clean || ['sans-serif', 'serif', 'cursive', 'monospace'].includes(clean.toLowerCase())) {
        return [];
      }
      return WEIGHTS_TO_LOAD.map((w) =>
        document.fonts.load(`${w} 64px "${clean}"`, 'أبجد 123 ABC').catch(() => null),
      );
    })
    .filter(Boolean);

  await Promise.all(loads);
  await document.fonts.ready;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded = ''] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'application/octet-stream';
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** يحوّل Blob إلى Data URL عند حدود API قديمة فقط (الحافظة/التوافق). */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read Blob as data URL'));
    reader.readAsDataURL(blob);
  });
}

/** يعتمد Canvas.toBlob ويتراجع إلى المسار الحرفي عبر toDataURL في المتصفحات القديمة. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number,
): Promise<Blob> {
  if (typeof canvas.toBlob !== 'function') {
    return Promise.resolve(dataUrlToBlob(canvas.toDataURL(type, quality)));
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas produced an empty Blob'));
      },
      type,
      quality,
    );
  });
}

/** يرسم SVG في Canvas بالحجم النهائي مع ميزانية بكسل وحماية Object URL. */
async function rasterizeSvgToCanvas(
  svgString: string,
  width: number,
  height: number,
  fontFamilies?: string[],
): Promise<HTMLCanvasElement> {
  const budget = assertRasterBudget(width, height);
  await ensureFontsReady(fontFamilies).catch(() => null);

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  img.crossOrigin = 'anonymous';

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load SVG into image'));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = budget.width;
    canvas.height = budget.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot create 2D canvas context');

    // أعلى جودة إعادة تحجيم متاحة في المتصفح (تُبرز الفارق في الحواف
    // المنحنية والنصوص الصغيرة عند 300/600 DPI)
    ctx.imageSmoothingEnabled = true;
    try {
      ctx.imageSmoothingQuality = 'high';
    } catch {
      // خاصية حديثة — تُتجاهل بصمت في المتصفحات القديمة
    }
    ctx.drawImage(img, 0, 0, budget.width, budget.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** يصيّر SVG إلى PNG Blob — المسار المفضّل لكل تصدير/إدراج جديد. */
export async function renderSvgToPngBlob(
  svgString: string,
  width: number = 1200,
  height: number = 1200,
  fontFamilies?: string[],
): Promise<Blob> {
  if (typeof window === 'undefined' || typeof Blob === 'undefined') {
    // Fallback غير متصفحي: نُبقي SVG كما هو بدل ادعاء PNG غير موجود.
    return new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  }
  const canvas = await rasterizeSvgToCanvas(svgString, width, height, fontFamilies);
  return canvasToBlob(canvas, 'image/png');
}

/** توافق خلفي: Data URL من نفس مسار Blob (Base64 عند الحدود فقط). */
export async function renderSvgToPngDataUrl(
  svgString: string,
  width: number = 1200,
  height: number = 1200,
  fontFamilies?: string[],
): Promise<string> {
  const blob = await renderSvgToPngBlob(svgString, width, height, fontFamilies);
  if (blob.type === 'image/svg+xml') {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
  }
  return blobToDataUrl(blob);
}

export function downloadFile(dataUrlOrBlob: string, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrlOrBlob;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * تنزيل Blob بأمان: ينشئ رابطاً مؤقتاً ويسجّله في السجل المركزي حتى يُلغى
 * بعد نافذة الأمان، فلا يبقى أي رابط معلّق بعد التنزيل.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadFile(url, filename);
  registerObjectUrl(url);
}
