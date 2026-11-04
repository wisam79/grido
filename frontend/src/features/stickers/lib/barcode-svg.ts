// 🚀 تحميل كسول — كانت jsbarcode وreact-dom/server تُسحبان إلى الحزمة الرئيسية
// عبر السلسلة الثابتة features/stickers ← index ← barcode-svg ← قوالب الملصقات،
// فيحمّل المستخدم المكتبتين عند الإقلاع وإن لم يولّد باركود قط.
// الاستيراد ديناميكي على أول استخدام فعلي (أو عبر warmupBarcodeLibs عند فتح
// استوديو الملصقات) — وعد واحد مُخزَّن لكل مكتبة (لا محاولات متزامنة)، وحالة
// جاهزية متزامنة للمستدعين، ورسالة خطأ واضحة عند فشل التحميل (بلا unhandled rejection).
import React from 'react';

import { createLogger } from '@/lib/logger';

import { escapeXml } from './svg-rasterizer';

const logger = createLogger('barcode-svg');

type JsBarcodeFn = (
  element: SVGElement | string,
  value: string,
  options?: Record<string, unknown>,
) => void;

let jsBarcodePromise: Promise<JsBarcodeFn> | null = null;
let jsBarcodeFailed = false;
const jsBarcodeSyncRef: { current: JsBarcodeFn | null } = { current: null };

/** تسخين صامت: الخطأ يُسجَّل داخل دالة التحميل — لا unhandled rejection هنا. */
function preloadQuietly(promise: Promise<unknown>): void {
  void promise.catch(() => undefined);
}

/**
 * تحميل jsbarcode مرة واحدة (كاش وحدة للوعد). الفشل يُسجَّل ويُصرَّف خطأ واضح
 * ولا يُخزَّن حتى تبقى إعادة المحاولة ممكنة عند الاستدعاء التالي.
 */
function loadJsBarcode(): Promise<JsBarcodeFn> {
  if (!jsBarcodePromise) {
    jsBarcodeFailed = false;
    jsBarcodePromise = import('jsbarcode')
      .then((m) => {
        const mod = m as unknown as { default?: JsBarcodeFn } & JsBarcodeFn;
        const fn = (mod.default ?? (mod as unknown as JsBarcodeFn)) as JsBarcodeFn;
        jsBarcodeSyncRef.current = fn;
        return fn;
      })
      .catch((err) => {
        jsBarcodeFailed = true;
        jsBarcodePromise = null;
        logger.error('[barcode-svg] Failed to load jsbarcode:', err);
        throw new Error('تعذر تحميل مكتبة توليد الباركود (jsbarcode) — أعد المحاولة.');
      });
  }
  return jsBarcodePromise;
}

type RenderStaticFn = (el: React.ReactElement) => string;
type QrCodeSvgComponent = React.ComponentType<{
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
}>;

// react-dom/server يُحمَّل كسولاً على أول استخدام — يُستخدم فقط لتحويل مكون
// QRCodeSVG (من qrcode.react الخفيفة) إلى SVG نصي.
let renderStaticPromise: Promise<RenderStaticFn> | null = null;
let renderStaticFailed = false;
const renderStaticSyncRef: { current: RenderStaticFn | null } = { current: null };

function loadRenderToStaticMarkup(): Promise<RenderStaticFn> {
  if (!renderStaticPromise) {
    renderStaticFailed = false;
    renderStaticPromise = import('react-dom/server')
      .then((rd) => {
        const render = rd.renderToStaticMarkup;
        renderStaticSyncRef.current = render;
        return render;
      })
      .catch((err) => {
        renderStaticFailed = true;
        renderStaticPromise = null;
        logger.error('[barcode-svg] Failed to load react-dom/server:', err);
        throw new Error('تعذر تحميل محرّك تصيير رمز QR (react-dom/server) — أعد المحاولة.');
      });
  }
  return renderStaticPromise;
}

let qrReactPromise: Promise<QrCodeSvgComponent> | null = null;
const qrReactSyncRef: { current: QrCodeSvgComponent | null } = { current: null };

function loadQrCodeReact(): Promise<QrCodeSvgComponent> {
  if (!qrReactPromise) {
    qrReactPromise = import('qrcode.react')
      .then((mod) => {
        const component = mod.QRCodeSVG as QrCodeSvgComponent;
        qrReactSyncRef.current = component;
        return component;
      })
      .catch((err) => {
        qrReactPromise = null;
        logger.error('[barcode-svg] Failed to load qrcode.react:', err);
        throw new Error('تعذر تحميل مكتبة رمز QR (qrcode.react) — أعد المحاولة.');
      });
  }
  return qrReactPromise;
}

/**
 * ✅ حالة جاهزية المولدات للمستدعين المتزامنين (باركود + QR معاً).
 * المستدعون المتزامنون (generateSvg في القوالب) يستطيعون بواسطتها تمييز
 * «جارٍ التجهيز» عن «فشل التحميل» بدل افتراض أن العنصر التحذيري نهائي.
 */
export function isBarcodeLibsReady(): boolean {
  return isBarcodeGeneratorReady() && isQrGeneratorReady();
}

/** جاهزية مولد الباركود المتزامن (jsbarcode مُحمَّلة) */
export function isBarcodeGeneratorReady(): boolean {
  return jsBarcodeSyncRef.current !== null;
}

/** جاهزية مولد QR المتزامن (react-dom/server وqrcode.react مُحمَّلتان) */
export function isQrGeneratorReady(): boolean {
  return renderStaticSyncRef.current !== null && qrReactSyncRef.current !== null;
}

/** هل فشل آخر محاولة تحميل لمولد الباركود؟ (تُصفَّر عند بدء محاولة جديدة) */
export function isBarcodeLibLoadFailed(): boolean {
  return jsBarcodeFailed || renderStaticFailed;
}

/** تسخين مسبق (يُستدعى عند فتح استوديو الملصقات لفتح فوري بلا مهلة أول استدعاء) */
export function warmupBarcodeLibs(): void {
  preloadQuietly(loadJsBarcode());
  preloadQuietly(loadRenderToStaticMarkup());
  preloadQuietly(loadQrCodeReact());
}

/**
 * ⏳ انتظار جاهزية مولدات الباركود/QR فعلياً قبل توليد SVG نهائي يُخزَّن
 * (الإدراج السريع من التبويب). الفشل يُسجَّل ويعيد false فيرسم المولّد
 * عنصر التحذير الصريح الخاص به بدل تخزين placeholder صامت نهائياً.
 */
export async function ensureBarcodeLibsReady(): Promise<boolean> {
  try {
    await Promise.all([loadJsBarcode(), loadRenderToStaticMarkup(), loadQrCodeReact()]);
    return true;
  } catch (err) {
    logger.error('[barcode-svg] Barcode/QR libs readiness failed:', err);
    return false;
  }
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
    // أول استخدام قبل اكتمال التحميل الكسول — مرّر التحميل الآن؛ الاستدعاء
    // التالي بعد الجاهزية ينتج رمزاً صالحاً. عند فشل التحميل تظهر رسالة خطأ
    // صريحة بدل عبارة «جارٍ التجهيز» المضللة (تُقرأ قبل إطلاق محاولة إعادة
    // التحميل لأن بدء محاولة جديدة يصفّر علم الفشل).
    const label = jsBarcodeFailed ? 'تعذر تحميل مكتبة الباركود' : 'جارٍ تجهيز الباركود…';
    preloadQuietly(loadJsBarcode());
    const warnColor = options?.lineColor || '#cc0000';
    return (
      `<svg width="${reqWidth}" height="${reqHeight}" viewBox="0 0 200 ${reqHeight}" preserveAspectRatio="xMidYMid meet">` +
      `<rect x="2" y="2" width="196" height="${reqHeight - 4}" fill="none" stroke="${warnColor}" stroke-width="2" stroke-dasharray="6,3"/>` +
      `<text x="100" y="${reqHeight / 2 + 4}" text-anchor="middle" font-size="11" fill="${warnColor}" font-family="sans-serif">${label}</text></svg>`
    );
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
    logger.warn(`[barcode-svg] Cannot generate ${format} barcode for value "${value}":`, err);
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
  // يرفض برسالة واضحة عند فشل التحميل (لا يعلق على «جارٍ التجهيز» للأبد)
  await loadJsBarcode();
  return generateBarcodeInnerSvg(value, format, options);
}

/**
 * Generates an authentic, fully-scannable vector QR Code SVG string.
 * 🔁 renderToStaticMarkup وqrcode.react كسولا التحميل — تجلبان عند أول استدعاء
 * فقط (أو عبر warmupBarcodeLibs)، والفشل يعيد عنصر تحذيري صريحاً مع تسجيل الخطأ.
 */
export async function generateQrCodeInnerSvgAsync(
  value: string,
  size: number = 200,
  options?: { fgColor?: string; bgColor?: string },
): Promise<string> {
  try {
    const QRCodeSVG = await loadQrCodeReact();
    const renderToStaticMarkup = await loadRenderToStaticMarkup();

    const qrElement = React.createElement(QRCodeSVG, {
      value: value || 'https://grido.app',
      size: size,
      fgColor: options?.fgColor || '#000000',
      bgColor: options?.bgColor || 'transparent',
      level: 'M',
    });
    return renderToStaticMarkup(qrElement);
  } catch (err) {
    logger.error('Failed to generate QR Code SVG:', err);
    return qrWarningPlaceholder(value, size, options?.fgColor);
  }
}

/** عنصر تحذيري صريح بدل المربع الأسود الوهمي الذي يبدو رمزاً صالحاً وهو غير قابل للمسح */
function qrWarningPlaceholder(value: string, size: number, fg?: string): string {
  const c = fg || '#cc0000';
  const rawLabel = (value || '').slice(0, 24) || 'QR';
  const label = escapeXml(rawLabel);
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet">` +
    `<rect x="2" y="2" width="${size - 4}" height="${size - 4}" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="8,5" rx="8"/>` +
    `<text x="${size / 2}" y="${size / 2 - 6}" text-anchor="middle" font-size="28" fill="${c}" font-family="sans-serif">⚠</text>` +
    `<text x="${size / 2}" y="${size / 2 + 18}" text-anchor="middle" font-size="11" fill="${c}" font-family="sans-serif">تعذر توليد ${label}</text>` +
    `</svg>`
  );
}

/**
 * ✅ واجهة متزامنة متوافقة مع توقيع القوالب (generateSvg متزامن في الأنواع).
 * تُحمِّل المكتبات على أول استخدام إن لم تكن جاهزة (التسخين المسبق عبر
 * warmupBarcodeLibs عند فتح الاستوديو يجعل أول توليد فورياً)؛ إن لم تجهز بعد
 * تُرجع عنصر تحذيري صريحاً لا رمزاً وهمياً — والاستدعاء التالي بعد اكتمال
 * الجلب ينتج رمزاً صالحاً (generateSvg تُعاد استدعاؤه مع كل تحرير حقول).
 */
export function generateQrCodeInnerSvg(
  value: string,
  size: number = 200,
  options?: { fgColor?: string; bgColor?: string },
): string {
  const render = renderStaticSyncRef.current;
  if (!render) {
    preloadQuietly(loadRenderToStaticMarkup());
    preloadQuietly(loadQrCodeReact());
    // المكتبة لم تجهز بعد (أول استخدام): عنصر تحذيري صريح لا مربع أسود
    // وهمي — والاستدعاء التالي بعد اكتمال الجلب الكسول ينتج رمزاً صالحاً.
    return qrWarningPlaceholder(value, size, options?.fgColor);
  }
  try {
    const QRCodeSVG = qrReactSyncRef.current;
    if (!QRCodeSVG) {
      preloadQuietly(loadQrCodeReact());
      throw new Error('qrcode.react not ready');
    }
    const qrElement = React.createElement(QRCodeSVG, {
      value: value || 'https://grido.app',
      size: size,
      fgColor: options?.fgColor || '#000000',
      bgColor: options?.bgColor || 'transparent',
      level: 'M',
    });
    return render(qrElement);
  } catch (err) {
    logger.error('Failed to generate QR Code SVG:', err);
    return qrWarningPlaceholder(value, size, options?.fgColor);
  }
}
