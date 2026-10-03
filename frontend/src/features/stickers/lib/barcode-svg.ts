// 🚀 تحميل كسول — كانت jsbarcode وreact-dom/server تُسحبان إلى الحزمة الرئيسية
// عبر السلسلة الثابتة features/stickers ← index ← barcode-svg ← قوالب الملصقات،
// فيحمّل المستخدم المكتبتين عند الإقلاع وإن لم يولّد باركود قط.
// الاستيراد الديناميكي يجعل مكتبات التوليد chunk منفصلاً يُجلب عند أول استدعاء.
import React from 'react';

type JsBarcodeFn = (
  element: SVGElement | string,
  value: string,
  options?: Record<string, unknown>,
) => void;

let jsBarcodePromise: Promise<JsBarcodeFn | null> | null = null;
const jsBarcodeSyncRef: { current: JsBarcodeFn | null } = { current: null };

async function loadJsBarcode(): Promise<JsBarcodeFn | null> {
  if (!jsBarcodePromise) {
    jsBarcodePromise = import('jsbarcode')
      .then((m) => {
        const mod = m as unknown as { default?: JsBarcodeFn } & JsBarcodeFn;
        const fn = (mod.default ?? (mod as unknown as JsBarcodeFn)) as JsBarcodeFn;
        jsBarcodeSyncRef.current = fn;
        return fn;
      })
      .catch(() => null);
  }
  return jsBarcodePromise;
}

// react-dom/server يُحمَّل كسولاً أيضاً — يُستخدم فقط لتحويل مكون QRCodeSVG
// (من qrcode.react الخفيفة) إلى SVG نصي عند أول توليد
let renderStaticPromise: Promise<((el: React.ReactElement) => string) | null> | null = null;

async function loadRenderToStaticMarkup() {
  if (!renderStaticPromise) {
    renderStaticPromise = import('react-dom/server')
      .then((rd) => rd.renderToStaticMarkup)
      .catch(() => null);
  }
  return renderStaticPromise;
}

type RenderStaticFn = (el: React.ReactElement) => string;
type QrCodeSvgComponent = React.ComponentType<{
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
}>;

const renderStaticSyncRef: { current: RenderStaticFn | null } = { current: null };
const qrReactSyncRef: { current: QrCodeSvgComponent | null } = { current: null };

// ربط المراجع التزامنية عند اكتمال التحميل الكسول — تحوّل استدعاءات
// generateQrCodeInnerSvg التزامنية من «مربع مؤقت» إلى «رمز صالح» تلقائياً
void loadJsBarcode();
void loadRenderToStaticMarkup().then((render) => {
  if (render) renderStaticSyncRef.current = render;
});
void import('qrcode.react').then((mod) => {
  qrReactSyncRef.current = mod.QRCodeSVG as QrCodeSvgComponent;
});

/** تسخين مسبق (يُستدعى عند فتح استوديو الملصقات لفتح فوري بلا مهلة أول استدعاء) */
export function warmupBarcodeLibs(): void {
  void loadJsBarcode();
  void loadRenderToStaticMarkup();
  void import('qrcode.react');
}

export function generateBarcodeInnerSvg(
  value: string,
  format: string = 'CODE128',
  options?: { lineColor?: string; background?: string; height?: number; width?: number },
): string {
  const reqHeight = options?.height || 60;
  const reqWidth = options?.width ? `${options.width}` : '100%';
  if (typeof document === 'undefined') {
    return `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 200 ${reqHeight}" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="200" height="${reqHeight}" fill="${options?.lineColor || '#000000'}" /></svg>`;
  }

  const JsBarcode = jsBarcodeSyncRef.current;
  if (!JsBarcode) {
    // لم يكتمل التحميل الكسول بعد — أعِد توليده عند الجاهزية عبر warmupBarcodeLibs
    // أو استخدم generateBarcodeInnerSvgAsync. نُرجع مستطيلاً بحجم الطلب صامتاً.
    void loadJsBarcode();
    return `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 200 ${reqHeight}" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="200" height="${reqHeight}" fill="${options?.lineColor || '#000000'}" /></svg>`;
  }

  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value || '12345678', {
      format: format,
      lineColor: options?.lineColor || '#000000',
      background: options?.background || 'transparent',
      displayValue: false,
      margin: 0,
      width: 2,
      height: reqHeight,
    });
    const svgWidth = parseFloat(svg.getAttribute('width') || '200') || 200;
    return `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 ${svgWidth} ${reqHeight}" preserveAspectRatio="xMidYMid meet">${svg.innerHTML}</svg>`;
  } catch (err) {
    // #4 — باركود تحذيري بصري بدلاً من أعمدة وهمية تبدو حقيقية وغير قابلة للمسح
    console.warn(`[barcode-svg] Cannot generate ${format} barcode for value "${value}":`, err);
    const warnColor = options?.lineColor || '#cc0000';
    return `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 200 ${reqHeight}" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="200" height="${reqHeight}" fill="none" stroke="${warnColor}" stroke-width="2" stroke-dasharray="6,3"/>
      <text x="100" y="${reqHeight / 2 - 6}" text-anchor="middle" font-size="14" fill="${warnColor}" font-family="sans-serif">⚠</text>
      <text x="100" y="${reqHeight / 2 + 10}" text-anchor="middle" font-size="9" fill="${warnColor}" font-family="sans-serif">بيانات غير صالحة</text>
    </svg>`;
  }
}

/** نسخة غير متزامنة تضمن جاهزية JsBarcode قبل التوليد — للمسارات خارج الرسم الحرج */
export async function generateBarcodeInnerSvgAsync(
  value: string,
  format: string = 'CODE128',
  options?: { lineColor?: string; background?: string; height?: number; width?: number },
): Promise<string> {
  await loadJsBarcode();
  return generateBarcodeInnerSvg(value, format, options);
}

/**
 * Generates an authentic, fully-scannable vector QR Code SVG string.
 * 🔁 renderToStaticMarkup أصبح كسول التحميل — المكتبة تجلب عند أول استدعاء فقط.
 */
export async function generateQrCodeInnerSvgAsync(
  value: string,
  size: number = 200,
  options?: { fgColor?: string; bgColor?: string },
): Promise<string> {
  try {
    const { QRCodeSVG } = await import('qrcode.react');
    const renderToStaticMarkup = await loadRenderToStaticMarkup();
    if (!renderToStaticMarkup) throw new Error('react-dom/server unavailable');

    const qrElement = React.createElement(QRCodeSVG, {
      value: value || 'https://grido.app',
      size: size,
      fgColor: options?.fgColor || '#000000',
      bgColor: options?.bgColor || 'transparent',
      level: 'M',
    });
    return renderToStaticMarkup(qrElement);
  } catch (err) {
    console.error('Failed to generate QR Code SVG:', err);
    return `<rect width="${size}" height="${size}" fill="${options?.fgColor || '#000000'}" />`;
  }
}

/**
 * ✅ واجهة متزامنة متوافقة مع توقيع القوالب (generateSvg متزامن في الأنواع).
 * تعتمد على التسخين المسبق عبر warmupBarcodeLibs (يُستدعى عند فتح الاستوديو)؛
 * إن لم يجهز المكتبة بعد تُرجع مربعاً بلون المقدمة — والاستدعاء التالي بعد
 * اكتمال الجلب سينتج رمزاً صالحاً (generateSvg تُعاد استدعاؤه مع كل تحرير حقول).
 */
export function generateQrCodeInnerSvg(
  value: string,
  size: number = 200,
  options?: { fgColor?: string; bgColor?: string },
): string {
  const render = renderStaticSyncRef.current;
  if (!render) {
    void loadRenderToStaticMarkup();
    void import('qrcode.react');
    return `<rect width="${size}" height="${size}" fill="${options?.fgColor || '#000000'}" />`;
  }
  try {
    const QRCodeSVG = qrReactSyncRef.current;
    if (!QRCodeSVG) throw new Error('qrcode.react not ready');
    const qrElement = React.createElement(QRCodeSVG, {
      value: value || 'https://grido.app',
      size: size,
      fgColor: options?.fgColor || '#000000',
      bgColor: options?.bgColor || 'transparent',
      level: 'M',
    });
    return render(qrElement);
  } catch (err) {
    console.error('Failed to generate QR Code SVG:', err);
    return `<rect width="${size}" height="${size}" fill="${options?.fgColor || '#000000'}" />`;
  }
}
