import type Konva from "konva";
import { CanvasElement, ImageElement, useEditorStore } from "@/lib/editor-store";
import { buildCSSFilter } from "@/lib/utils";
import { captureStageDataUrl } from "@/lib/canvas/konva-export-utils";
import { calculatePrintCutLines } from "@/lib/print/cut-lines-utils";
import { computeSheetGrid, computeSlotRectMM } from "@/lib/print/print-layout-math";
import { assertExportablePixels, CanvasTooLargeError } from "@/lib/export/export-limits";
import { VECTOR_SHAPES } from "@/lib/io/svg-paths";
import { drawCurvedText } from "@/lib/canvas/curved-text-utils";
import {
  gradientStart,
  gradientEnd,
  collageCut,
  collageEndCut,
  TEXT_COLOR_DEFAULT,
  previewWhite,
} from "@/lib/canvas/canvas-colors";

// [FIX #9] تحويل Data URL إلى Blob مباشرة في الذاكرة بدلاً من fetch غير الضروري
export function dataURLToBlob(dataUrl: string): Blob {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) {
    throw new Error("Invalid data URL: missing base64 payload");
  }
  const header = dataUrl.slice(0, commaIndex);
  const data = dataUrl.slice(commaIndex + 1);
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// تحميل صورة من رابط أو DataURL
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

// رسم صورة مع object-fit: cover
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgAspect = img.width / img.height;
  const boxAspect = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (imgAspect > boxAspect) {
    sw = img.height * boxAspect;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / boxAspect;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// رسم صورة الخانة مع القص (zoom/drag) والقلب والدوران —
// يطابق منطق KonvaCollageImage في كل من التصدير اليدوي وتصدير الخانات المفردة
export function drawSlotImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  slot: { zoom?: number; dragX?: number; dragY?: number; flipX?: boolean; flipY?: boolean; rotation?: number }
) {
  const normRot = (((slot.rotation || 0) % 360) + 360) % 360;
  const isRotated90or270 = normRot === 90 || normRot === 270;
  const imgAspect = img.width / img.height;
  const slotAspect = isRotated90or270 ? h / w : w / h;
  let sw = img.width;
  let sh = img.height;
  if (imgAspect > slotAspect) {
    sw = img.height * slotAspect;
  } else {
    sh = img.width / slotAspect;
  }
  const zoom = slot.zoom && slot.zoom > 0 ? slot.zoom : 1;
  sw /= zoom;
  sh /= zoom;
  const defaultSx = imgAspect > slotAspect ? (img.width - sw) / 2 : 0;
  const defaultSy = imgAspect > slotAspect ? 0 : (img.height - sh) / 2;
  const maxDragX = (img.width - sw) / 2;
  const maxDragY = (img.height - sh) / 2;
  const dragX = Math.max(-maxDragX, Math.min(maxDragX, slot.dragX || 0));
  const dragY = Math.max(-maxDragY, Math.min(maxDragY, slot.dragY || 0));

  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(((slot.rotation || 0) * Math.PI) / 180);
  if (slot.flipX) ctx.scale(-1, 1);
  if (slot.flipY) ctx.scale(1, -1);
  ctx.translate(-w / 2, -h / 2);
  ctx.drawImage(img, defaultSx + dragX, defaultSy + dragY, sw, sh, 0, 0, w, h);
}

export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.closePath();
}

export function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// دمج الشفافية داخل أي لون CSS — Canvas2D لا يملك shadowOpacity منفصلة كما في Konva
function colorWithAlpha(color: string, alpha: number): string {
  if (alpha >= 1) return color;
  const probe = document.createElement("canvas");
  probe.width = probe.height = 1;
  const pctx = probe.getContext("2d", { willReadFrequently: true });
  if (!pctx) return color;
  pctx.fillStyle = color;
  pctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${((a / 255) * alpha).toFixed(3)})`;
}

// بناء تعبئة تدرج (linear/radial) مطابقة لمنطق getFillProps في Konva — null تعني اللون الصلب
function buildGradientFill(
  ctx: CanvasRenderingContext2D,
  el: CanvasElement,
  w: number,
  h: number
): CanvasGradient | null {
  const addStops = (grad: CanvasGradient, stops?: Array<number | string>) => {
    const s = stops && stops.length >= 4 ? stops : [0, gradientStart(), 1, gradientEnd()];
    for (let i = 0; i + 1 < s.length; i += 2) {
      grad.addColorStop(Number(s[i]), String(s[i + 1]));
    }
  };
  if (el.fillType === "linear") {
    const start = el.fillLinearGradientStartPoint || { x: 0, y: 0 };
    const end = el.fillLinearGradientEndPoint || { x: 1, y: 1 };
    const grad = ctx.createLinearGradient(start.x * w, start.y * h, end.x * w, end.y * h);
    addStops(grad, el.fillLinearGradientColorStops);
    return grad;
  }
  if (el.fillType === "radial") {
    const start = el.fillRadialGradientStartPoint || { x: 0.5, y: 0.5 };
    const end = el.fillRadialGradientEndPoint || { x: 0.5, y: 0.5 };
    const rStart = el.fillRadialGradientStartRadius ?? 0;
    const rEnd = el.fillRadialGradientEndRadius ?? 0.5;
    const grad = ctx.createRadialGradient(
      start.x * w, start.y * h, rStart * Math.max(w, h),
      end.x * w, end.y * h, rEnd * Math.max(w, h)
    );
    addStops(grad, el.fillRadialGradientColorStops);
    return grad;
  }
  return null;
}

// دالة مساعدة لتطبيق العلامة المائية عند التصدير للخطة المجانية
export async function applyWatermarkIfFree(
  blob: Blob,
  format: "png" | "jpg" = "png",
  quality = 0.95
): Promise<Blob> {
  const { isLicenseActive } = useEditorStore.getState();
  if (isLicenseActive()) {
    return blob;
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob);
        return;
      }

      // رسم الصورة الأصلية
      ctx.drawImage(img, 0, 0);

      // حساب ارتفاع شريط العلامة المائية بناءً على حجم الصورة
      const bannerHeight = Math.max(50, img.height * 0.045);

      // رسم شريط خلفية العلامة المائية بشكل احترافي غامق وشبه شفاف
      ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
      ctx.fillRect(0, img.height - bannerHeight, img.width, bannerHeight);

      // رسم خط علوي فاصل ناعم
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = Math.max(1, img.height * 0.001);
      ctx.beginPath();
      ctx.moveTo(0, img.height - bannerHeight);
      ctx.lineTo(img.width, img.height - bannerHeight);
      ctx.stroke();

      // إعدادات الخط للعلامة المائية
      const fontSize = Math.max(12, bannerHeight * 0.32);
      ctx.font = `600 ${fontSize}px Cairo, sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = "تم التصميم بواسطة استوديو Grido Studio (نسخة مجانية)";
      ctx.fillText(text, img.width / 2, img.height - bannerHeight / 2);

      canvas.toBlob(
        (newBlob) => {
          resolve(newBlob || blob);
        },
        format === "png" ? "image/png" : "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

// تصدير الكانفس الحالي كصورة PNG/JPG
export async function exportCanvas(
  format: "png" | "jpg" = "png",
  quality = 0.95,
  stageRef?: Konva.Stage | null
): Promise<Blob | null> {
  const {
    mode,
    canvasWidth,
    canvasHeight,
    backgroundColor,
    elements,
    slots,
  } = useEditorStore.getState();

  // حارس الذاكرة: ~200MB خامة عند 50MP — التجاوز كان يفشل بصمت برسالة عامة.
  // الآن يرمي CanvasTooLargeError ويعرض المتصل للمستخدم الأبعاد الفعلية
  assertExportablePixels(canvasWidth, canvasHeight);

  // محاولة التصدير مباشرةً من Konva Stage لتوحيد محرك التصيير للوضعين (Fitted & Collage)
  if (stageRef) {
    let dataUrl: string | null = null;
    try {
      const targetPixelRatio = canvasWidth / stageRef.width();
      // JPEG لا يدعم الشفافية — نلتقط PNG ثم نركّبه على خلفية بيضاء
      // (كان يُنتج خلفية سوداء للتصدير الشفاف)
      const needsWhiteFlatten = format === "jpg" && backgroundColor === "transparent";
      dataUrl = await captureStageDataUrl(
        stageRef,
        targetPixelRatio,
        needsWhiteFlatten ? "image/png" : format === "png" ? "image/png" : "image/jpeg",
        needsWhiteFlatten ? undefined : quality
      );
      if (needsWhiteFlatten && dataUrl) {
        const captured = await loadImage(dataUrl);
        const flattenCanvas = document.createElement("canvas");
        flattenCanvas.width = canvasWidth;
        flattenCanvas.height = canvasHeight;
        const fctx = flattenCanvas.getContext("2d");
        if (fctx) {
          fctx.fillStyle = previewWhite();
          fctx.fillRect(0, 0, canvasWidth, canvasHeight);
          fctx.drawImage(captured, 0, 0);
          dataUrl = flattenCanvas.toDataURL("image/jpeg", quality);
        }
      }
    } catch (e) {
      console.error("Failed to export via Konva Stage, falling back to manual canvas:", e);
    }

    if (dataUrl) {
      try {
        const originalBlob = dataURLToBlob(dataUrl);
        return await applyWatermarkIfFree(originalBlob, format, quality);
      } catch (e) {
        console.error("Failed to decode stage data URL, falling back to manual canvas:", e);
      }
    }
  }

  // Fallback البديل في حال عدم وجود المكون الرسومي نشطاً (للاختبارات مثلاً)
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  if (format === "jpg" || backgroundColor !== "transparent") {
    ctx.fillStyle = backgroundColor === "transparent" ? previewWhite() : backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  if (mode === "collage") {
    const state = useEditorStore.getState();
    const {
      collageGap = 0,
      collageMargin = 0,
      collageRadius = 0,
      collageShowCutLines = false,
      collageShowEndCutLine = true,
      collageStrokeWidth = 0,
      collageStrokeColor = "#000000",
    } = state;

    // القوالب الفيزيائية (physicalLayout) تُخبز الهامش والفجوة داخل إحداثيات
    // الخلايا نفسها — تطبيقها مجدداً هنا يضاعفها ويُباعد التصدير عن المعاينة
    const hasPhysical = Boolean(state.collageTemplate?.physicalLayout);
    const margin = hasPhysical ? 0 : collageMargin;
    const gap = hasPhysical ? 0 : collageGap;
    const radius = collageRadius;
    const borderW = collageStrokeWidth;

    const slotImageMap: Record<string, HTMLImageElement> = {};
    const slotLoadPromises = slots
      .filter((slot) => slot.imageSrc)
      .map(async (slot) => {
        try {
          const img = await loadImage(slot.imageSrc!);
          slotImageMap[slot.id] = img;
        } catch (e) {
          console.error("Failed to pre-load slot image:", slot.imageSrc, e);
        }
      });
    await Promise.all(slotLoadPromises);

    for (const slot of slots) {
      // مستطيل الخانة من print-layout-math — نفس المصدر المستخدم في معاينة الطباعة
      // وخطوط القص ومسار Go. الوحدات هنا بكسل لكن الصيغة نسبة بحتة (block عند 0,0)
      const rect = computeSlotRectMM(
        { xMM: 0, yMM: 0 },
        { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
        { widthMM: canvasWidth, heightMM: canvasHeight },
        { marginXMM: margin, marginYMM: margin },
        { gapXMM: gap, gapYMM: gap }
      );
      const left = rect.xMM;
      const top = rect.yMM;
      const width = rect.wMM;
      const height = rect.hMM;

      if (slot.imageSrc && slotImageMap[slot.id]) {
        const img = slotImageMap[slot.id];
        ctx.save();
        const filterStr = buildCSSFilter(slot);
        if (filterStr && filterStr !== "none") {
          ctx.filter = filterStr;
        }
        ctx.beginPath();
        if (radius > 0) {
          drawRoundRect(ctx, left, top, width, height, radius);
        } else {
          ctx.rect(left, top, width, height);
        }
        ctx.clip();
        if ((slot as any).bgColor && (slot as any).bgColor !== "transparent") {
          ctx.fillStyle = (slot as any).bgColor;
          ctx.fillRect(left, top, width, height);
        }
        // يطبّق zoom/dragX/dragY/flipX/flipY/rotation كما في عقدة Konva (إصلاح E-7)
        drawSlotImage(ctx, img, left, top, width, height, slot);
        ctx.restore();
      }

      if (borderW > 0) {
        ctx.save();
        ctx.strokeStyle = collageStrokeColor;
        ctx.lineWidth = borderW;
        ctx.beginPath();
        if (radius > 0) {
          drawRoundRect(ctx, left, top, width, height, radius);
        } else {
          ctx.rect(left, top, width, height);
        }
        ctx.stroke();
        ctx.restore();
      }
    }

    // رسم خطوط القص في النهاية فوق كافة الصور والحدود وضمان عدم تغطيتها —
    // المواضع من cut-lines-utils (نفس مصدر معاينة الطباعة ومسار Go) بمقياس 1:1
    // لأن الورقة والكانفاس هنا نفس الشيء (بكسل). الخلايا الميتة (بلا صورة وبلا
    // أبعاد) لم تعد تضيف خطوطاً وهمية عند الهامش — سلوك موحّد مع المعاينة.
    if (collageShowCutLines && slots.length > 0) {
      ctx.save();

      const cutLines = calculatePrintCutLines({
        mode: "collage",
        actualCopies: 1,
        imageWidthMM: canvasWidth,
        imageHeightMM: canvasHeight,
        gapMM: gap,
        paperWidth: canvasWidth,
        paperHeight: canvasHeight,
        showEndCutLine: collageShowEndCutLine,
        slots,
        collageMargin,
        collageGap,
        canvasWidth,
        canvasHeight,
        hasPhysical,
        // لا ورقة طباعة هنا — الكانفاس هو الكولاج نفسه، فشبكة 1×1 بلا هوامش
        grid: computeSheetGrid({
          cols: 1,
          actualCopies: 1,
          imageWidthMM: canvasWidth,
          imageHeightMM: canvasHeight,
          gapMM: gap,
          effectiveMarginMM: 0,
          availableWidthMM: canvasWidth,
          availableHeightMM: canvasHeight,
        }),
      });

      const lineW = Math.max(1, Math.round(canvasWidth / 1200));

      // تقريب المواضع إلى بكسل صحيح كما كان سابقاً (الفرق عن المعاينة ≤ 0.5px)
      for (const line of cutLines) {
        ctx.beginPath();
        if (line.isBottomEnd) {
          ctx.strokeStyle = collageEndCut();
          ctx.lineWidth = lineW * 1.5;
          ctx.setLineDash([12, 6]);
        } else {
          ctx.strokeStyle = collageCut();
          ctx.lineWidth = lineW;
          ctx.setLineDash([8, 8]);
        }
        ctx.moveTo(Math.round(line.x1), Math.round(line.y1));
        ctx.lineTo(Math.round(line.x2), Math.round(line.y2));
        ctx.stroke();
      }
      ctx.restore();
    }
  } else {
    const sorted = [...elements]
      .filter((el) => el.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    const elImageMap: Record<string, HTMLImageElement> = {};
    const elLoadPromises = sorted
      .filter((el): el is ImageElement => el.type === "image" && !!el.imageSrc)
      .map(async (el) => {
        try {
          const img = await loadImage(el.imageSrc);
          elImageMap[el.id] = img;
        } catch (e) {
          console.error("Failed to pre-load element image:", el.imageSrc, e);
        }
      });
    await Promise.all(elLoadPromises);

    for (const el of sorted) {
      ctx.save();
      ctx.globalAlpha = el.opacity;

      const x = el.x * canvasWidth;
      const y = el.y * canvasHeight;
      const w = el.width * canvasWidth;
      const h = el.height * canvasHeight;

      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      if (el.flipX) ctx.scale(-1, 1);
      if (el.flipY) ctx.scale(1, -1);
      ctx.translate(-w / 2, -h / 2);

      // نمط الدمج والظل — مطابقة خصائص Konva المشتركة (shadowOpacity تُدمج في ألفا اللون)
      ctx.globalCompositeOperation = (el.globalCompositeOperation ||
        "source-over") as GlobalCompositeOperation;
      if (el.shadowColor && (el.shadowOpacity ?? 0) > 0) {
        ctx.shadowColor = colorWithAlpha(el.shadowColor, el.shadowOpacity ?? 1);
        ctx.shadowBlur = el.shadowBlur || 0;
        ctx.shadowOffsetX = el.shadowOffsetX || 0;
        ctx.shadowOffsetY = el.shadowOffsetY || 0;
      }

      if (el.type === "image" && el.imageSrc && elImageMap[el.id]) {
        const img = elImageMap[el.id];
        const filterStr = buildCSSFilter(el);
        const radius = el.cornerRadius || 0;
        if (el.bgColor && el.bgColor !== "transparent") {
          ctx.save();
          ctx.fillStyle = el.bgColor;
          if (radius > 0) {
            ctx.beginPath();
            drawRoundRect(ctx, 0, 0, w, h, radius);
            ctx.fill();
          } else {
            ctx.fillRect(0, 0, w, h);
          }
          ctx.restore();
        }
        if (radius > 0) {
          // قص cornerRadius على كانفس وسيط ليأخذ الظل شكل ألفا الصورة المقصوصة (مطابقة KonvaImage)
          const off = document.createElement("canvas");
          off.width = Math.max(1, Math.round(w));
          off.height = Math.max(1, Math.round(h));
          const octx = off.getContext("2d");
          if (octx) {
            if (filterStr && filterStr !== "none") octx.filter = filterStr;
            drawRoundRect(octx, 0, 0, off.width, off.height, radius);
            octx.clip();
            drawImageCover(octx, img, 0, 0, off.width, off.height);
            ctx.drawImage(off, 0, 0, w, h);
          }
        } else {
          ctx.filter = filterStr;
          drawImageCover(ctx, img, 0, 0, w, h);
          ctx.filter = "none";
        }
      } else if (el.type === "text") {
        const fontSize = el.fontSize || 32;
        const hasBg = !!el.textBgColor && el.textBgColor !== "transparent";
        const bgPadX = el.textBgPaddingX ?? el.textBgPadding ?? 0;
        const bgPadY = el.textBgPaddingY ?? el.textBgPadding ?? 0;
        const bgRadius = el.textBgRadius ?? 0;
        const bgBorderW = el.textBgBorderWidth ?? 0;
        const bgBorderCol = el.textBgBorderColor ?? TEXT_COLOR_DEFAULT;

        // خلفية وشارة النص الاختيارية
        if (hasBg) {
          ctx.save();
          ctx.globalCompositeOperation = "source-over";
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.fillStyle = el.textBgColor!;
          drawRoundRect(ctx, -bgPadX, -bgPadY, w + bgPadX * 2, h + bgPadY * 2, bgRadius);
          ctx.fill();

          if (bgBorderW > 0) {
            ctx.strokeStyle = bgBorderCol;
            ctx.lineWidth = bgBorderW;
            ctx.stroke();
          }
          ctx.restore();
        }

        let rawText = el.text || "";
        if (el.arabicNumerals) {
          rawText = rawText.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[parseInt(d, 10)]);
        }

        const fontStyle = el.fontStyle === "italic" ? "italic " : "";
        const fontFamily = el.fontFamily || "Cairo, Tajawal, sans-serif";
        const isCurved = typeof el.curve === "number" && el.curve !== 0;

        if (isCurved) {
          drawCurvedText(ctx, {
            text: rawText,
            x: 0,
            y: 0,
            width: w,
            height: h,
            fontSize,
            fontFamily,
            fontWeight: el.fontWeight || 700,
            fontStyle: el.fontStyle || "normal",
            color: el.color || TEXT_COLOR_DEFAULT,
            stroke: el.strokeWidth ? (el.stroke || TEXT_COLOR_DEFAULT) : undefined,
            strokeWidth: el.strokeWidth || 0,
            textAlign: el.textAlign || "center",
            curve: el.curve || 0,
            letterSpacing: el.letterSpacing || 0,
          });
        } else {
          ctx.font = `${fontStyle}${el.fontWeight || 700} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = buildGradientFill(ctx, el, w, h) || el.color || TEXT_COLOR_DEFAULT;
          ctx.textAlign = (el.textAlign as CanvasTextAlign) || "center";
          ctx.textBaseline = "middle";
          ctx.direction = "rtl";

          if (el.shadowColor && ((el.shadowBlur ?? 0) > 0 || (el.shadowOpacity ?? 0) > 0)) {
            ctx.shadowColor = el.shadowColor;
            ctx.shadowBlur = el.shadowBlur || 0;
            ctx.shadowOffsetX = el.shadowGlow ? 0 : (el.shadowOffsetX || 0);
            ctx.shadowOffsetY = el.shadowGlow ? 0 : (el.shadowOffsetY || 0);
          }

          // تقسيم الأسطر مع مراعاة التفاف الكلمات (Word-wrap)
          const rawParagraphs = rawText.split("\n");
          const wrappedLines: string[] = [];

          for (const para of rawParagraphs) {
            const words = para.split(" ");
            let currentLine = "";

            for (let i = 0; i < words.length; i++) {
              const testLine = currentLine ? `${currentLine} ${words[i]}` : words[i];
              const testW = ctx.measureText(testLine).width;

              if (testW > w && i > 0) {
                wrappedLines.push(currentLine);
                currentLine = words[i];
              } else {
                currentLine = testLine;
              }
            }
            wrappedLines.push(currentLine);
          }

          const lineHeight = fontSize * (el.lineHeight ?? 1.2);
          const startY = h / 2 - ((wrappedLines.length - 1) * lineHeight) / 2;
          const textX = el.textAlign === "left" ? 0 : el.textAlign === "right" ? w : w / 2;
          const strokeW = el.strokeWidth || 0;
          if (strokeW > 0) {
            ctx.strokeStyle = el.stroke || TEXT_COLOR_DEFAULT;
            ctx.lineWidth = strokeW;
            ctx.lineJoin = "round";
          }

          const deco = el.textDecoration || "none";
          const decoThickness = Math.max(1, fontSize / 16);

          wrappedLines.forEach((line, i) => {
            const lineY = startY + i * lineHeight;
            ctx.fillText(line, textX, lineY);
            if (strokeW > 0) ctx.strokeText(line, textX, lineY);

            if (deco !== "none" && line.trim()) {
              const lineW = ctx.measureText(line).width;
              const fromX =
                el.textAlign === "left"
                  ? textX
                  : el.textAlign === "right"
                    ? textX - lineW
                    : textX - lineW / 2;
              const decoY = deco === "underline" ? lineY + fontSize / 2 : lineY;
              ctx.save();
              ctx.strokeStyle =
                typeof ctx.fillStyle === "string"
                  ? ctx.fillStyle
                  : el.color || TEXT_COLOR_DEFAULT;
              ctx.lineWidth = decoThickness;
              ctx.beginPath();
              ctx.moveTo(fromX, decoY);
              ctx.lineTo(fromX + lineW, decoY);
              ctx.stroke();
              ctx.restore();
            }
          });
        }
      } else if (el.type === "shape") {
        ctx.fillStyle = buildGradientFill(ctx, el, w, h) || el.fill || gradientStart();
        ctx.strokeStyle = el.stroke || TEXT_COLOR_DEFAULT;
        ctx.lineWidth = el.strokeWidth || 0;
        if (el.shape === "rect") {
          const r = el.radius || 0;
          drawRoundRect(ctx, 0, 0, w, h, r);
          ctx.fill();
          if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
        } else if (el.shape === "ellipse") {
          ctx.beginPath();
          ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
        } else if (el.shape === "line") {
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.lineWidth = Math.max(1, el.strokeWidth || 4);
          ctx.strokeStyle = el.fill || gradientStart();
          ctx.stroke();
        } else if (el.shape === "star") {
          drawStar(ctx, w / 2, h / 2, 5, Math.min(w, h) / 2, Math.min(w, h) / 4);
          ctx.fill();
          if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
        } else if (el.shape === "path" && el.svgPath) {
          // قياس المسار المتجه ليملأ صندوق العنصر — نفس منطق KonvaPath (viewBox مرجعي)
          const def = VECTOR_SHAPES.find((s) => s.path === el.svgPath);
          const vbW = def?.viewBox.w || 24;
          const vbH = def?.viewBox.h || 24;
          const path2d = new Path2D(el.svgPath);
          ctx.save();
          ctx.scale(w / vbW, h / vbH);
          ctx.fill(path2d);
          if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke(path2d);
          ctx.restore();
        }
      }
      ctx.restore();
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      async (blob) => {
        if (blob) {
          const watermarked = await applyWatermarkIfFree(blob, format, quality);
          resolve(watermarked);
        } else {
          resolve(null);
        }
      },
      format === "png" ? "image/png" : "image/jpeg",
      quality
    );
  });
}

// تصدير خانة واحدة من الكولاج كصورة مستقلة (استخدام في تصدير الدفعات)
export async function exportSlotCanvas(
  slotId: string,
  format: "png" | "jpg" = "png",
  quality = 0.95
): Promise<Blob | null> {
  const { canvasWidth, canvasHeight, slots } = useEditorStore.getState();
  const slot = slots.find(s => s.id === slotId);
  if (!slot || !slot.imageSrc) return null;

  try {
    const img = await loadImage(slot.imageSrc);
    
    // حجم الخانة بكسل من print-layout-math — نفس الصيغة النسبية (بلا هوامش/فجوات)
    const rect = computeSlotRectMM(
      { xMM: 0, yMM: 0 },
      { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
      { widthMM: canvasWidth, heightMM: canvasHeight },
      { marginXMM: 0, marginYMM: 0 },
      { gapXMM: 0, gapYMM: 0 }
    );
    const exportWidth = Math.max(1, rect.wMM);
    const exportHeight = Math.max(1, rect.hMM);

    // خانة واحدة قد تتجاوز الحد إذا كان الكانفاس ضخماً (w=1 يعني الكانفاس كاملاً)
    assertExportablePixels(exportWidth, exportHeight);

    const canvas = document.createElement("canvas");
    canvas.width = exportWidth;
    canvas.height = exportHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if ((slot as any).bgColor && (slot as any).bgColor !== "transparent") {
      ctx.fillStyle = (slot as any).bgColor;
      ctx.fillRect(0, 0, exportWidth, exportHeight);
    } else if (format === "jpg") {
      ctx.fillStyle = previewWhite();
      ctx.fillRect(0, 0, exportWidth, exportHeight);
    }

    ctx.save();
    const filterStr = buildCSSFilter(slot);
    if (filterStr && filterStr !== "none") {
      ctx.filter = filterStr;
    }
    // القص (zoom/drag) والقلب والدوران يُحترمون أيضاً في تصدير الخانة المفردة (إصلاح E-7)
    drawSlotImage(ctx, img, 0, 0, exportWidth, exportHeight, slot);
    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            const watermarked = await applyWatermarkIfFree(blob, format, quality);
            resolve(watermarked);
          } else {
            resolve(null);
          }
        },
        format === "png" ? "image/png" : "image/jpeg",
        quality
      );
    });
  } catch (e) {
    // خطأ الحجم ليس فشل خانة عابراً — نمرره للمتصل ليعرض رسالة الأبعاد الصريحة
    if (e instanceof CanvasTooLargeError) throw e;
    console.error(`Failed to export slot ${slotId}:`, e);
    return null;
  }
}

// تطبيق منطقة النزيف وعلامات القص
export async function applyBleedAndCropMarks(
  blob: Blob,
  bleedMM: number,
  showCropMarks: boolean,
  format: "png" | "jpg" = "png",
  quality = 0.95,
  dpi = 300
): Promise<Blob> {
  if (bleedMM === 0 && !showCropMarks) return blob;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const bleedPx = Math.round((bleedMM * dpi) / 25.4);
      const canvas = document.createElement("canvas");
      canvas.width = img.width + bleedPx * 2;
      canvas.height = img.height + bleedPx * 2;

      // النزيف يكبّر اللوحة — نحرسها أيضاً حتى لا ننفجر ذاكرةً بعد نجاح التصدير
      assertExportablePixels(canvas.width, canvas.height);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(blob);
        return;
      }

      // خلفية بيضاء لتغطية منطقة النزيف
      ctx.fillStyle = previewWhite();
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // رسم الصورة الأصلية في المنتصف
      ctx.drawImage(img, bleedPx, bleedPx);

      // مرآة حواف الصورة داخل منطقة النزيف بدلاً من خلفية بيضاء ناصعة —
      // انعكاس شرائط الحواف الأربعة ثم الزوايا الأربع (على المحورين)
      if (bleedPx > 0) {
        const strip = Math.min(bleedPx, img.width, img.height);
        if (strip > 0) {
          ctx.save();
          // يسار
          ctx.translate(bleedPx, bleedPx);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, strip, img.height, 0, 0, strip, img.height);
          ctx.restore();
          // يمين
          ctx.save();
          ctx.translate(bleedPx + img.width, bleedPx);
          ctx.scale(-1, 1);
          ctx.drawImage(img, img.width - strip, 0, strip, img.height, 0, 0, strip, img.height);
          ctx.restore();
          // أعلى
          ctx.save();
          ctx.translate(bleedPx, bleedPx);
          ctx.scale(1, -1);
          ctx.drawImage(img, 0, 0, img.width, strip, 0, 0, img.width, strip);
          ctx.restore();
          // أسفل
          ctx.save();
          ctx.translate(bleedPx, bleedPx + img.height);
          ctx.scale(1, -1);
          ctx.drawImage(img, 0, img.height - strip, img.width, strip, 0, 0, img.width, strip);
          ctx.restore();
          // الزاوية العلوية اليسرى
          ctx.save();
          ctx.translate(bleedPx, bleedPx);
          ctx.scale(-1, -1);
          ctx.drawImage(img, 0, 0, strip, strip, 0, 0, strip, strip);
          ctx.restore();
          // الزاوية العلوية اليمنى
          ctx.save();
          ctx.translate(bleedPx + img.width, bleedPx);
          ctx.scale(-1, -1);
          ctx.drawImage(img, img.width - strip, 0, strip, strip, 0, 0, strip, strip);
          ctx.restore();
          // الزاوية السفلية اليسرى
          ctx.save();
          ctx.translate(bleedPx, bleedPx + img.height);
          ctx.scale(-1, -1);
          ctx.drawImage(img, 0, img.height - strip, strip, strip, 0, 0, strip, strip);
          ctx.restore();
          // الزاوية السفلية اليمنى
          ctx.save();
          ctx.translate(bleedPx + img.width, bleedPx + img.height);
          ctx.scale(-1, -1);
          ctx.drawImage(img, img.width - strip, img.height - strip, strip, strip, 0, 0, strip, strip);
          ctx.restore();
        }
      }

      // رسم علامات القص
      if (showCropMarks && bleedPx > 0) {
        ctx.strokeStyle = TEXT_COLOR_DEFAULT;
        ctx.lineWidth = Math.max(1, Math.round(dpi / 150));
        const markLen = Math.min(bleedPx * 0.8, dpi * 0.2); // طول العلامة
        const offset = bleedPx;
        
        ctx.beginPath();
        // Top Left
        ctx.moveTo(offset, 0); ctx.lineTo(offset, markLen);
        ctx.moveTo(0, offset); ctx.lineTo(markLen, offset);
        
        // Top Right
        ctx.moveTo(canvas.width - offset, 0); ctx.lineTo(canvas.width - offset, markLen);
        ctx.moveTo(canvas.width, offset); ctx.lineTo(canvas.width - markLen, offset);
        
        // Bottom Left
        ctx.moveTo(offset, canvas.height); ctx.lineTo(offset, canvas.height - markLen);
        ctx.moveTo(0, canvas.height - offset); ctx.lineTo(markLen, canvas.height - offset);
        
        // Bottom Right
        ctx.moveTo(canvas.width - offset, canvas.height); ctx.lineTo(canvas.width - offset, canvas.height - markLen);
        ctx.moveTo(canvas.width, canvas.height - offset); ctx.lineTo(canvas.width - markLen, canvas.height - offset);
        
        ctx.stroke();
      }

      canvas.toBlob(
        (newBlob) => resolve(newBlob || blob),
        format === "png" ? "image/png" : "image/jpeg",
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    img.src = url;
  });
}

