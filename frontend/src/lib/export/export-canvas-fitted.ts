/**
 * فرع العناصر (صورة/نص/شكل) من التصدير اليدوي — الوضع الحر.
 * مستخرج من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { gradientStart, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { drawCurvedText } from '@/lib/canvas/curved-text-utils';
import { createElementGlyphPainter, resolveElementFill } from '@/lib/canvas/fill-paint';
import { resolveRingInnerRadius, ringOuterRadius } from '@/lib/canvas/ring-geometry';
import { resolveLineCap, resolveStrokeDash } from '@/lib/canvas/shape-pattern';
import { getSvgPathBounds } from '@/lib/canvas/svg-path-bounds';
import { measureTextContentHeightPx } from '@/lib/canvas/text-fit';
import { resolveTextRenderState } from '@/lib/canvas/text-helpers';
import { wrapTextLines } from '@/lib/canvas/text-layout';
import { ensureTextStrokeFilter } from '@/lib/canvas/text-stroke-filter';
import { isPixelFilter } from '@/lib/filters/pixel-filters';
import { ensureElementsFontsLoaded } from '@/lib/io/fonts';
import { createLogger } from '@/lib/logger';
import { buildAdjustmentCSS, buildCSSFilter } from '@/lib/utils';

import { colorWithAlpha, getRoundedPool } from './export-color';
import { renderWithPixelFilter } from './export-pixel-filter';
import { drawImageCover, drawRoundRect, drawStar, loadImage } from './export-primitives';

import type { useEditorStore } from '@/lib/editor-store';

const logger = createLogger('export-canvas-fitted');

type StoreState = ReturnType<typeof useEditorStore.getState>;

export async function renderFittedBranch(
  ctx: CanvasRenderingContext2D,
  elements: StoreState['elements'],
  canvasWidth: number,
  canvasHeight: number,
): Promise<void> {
  const sorted = [...elements]
    .filter((el) => el.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

  await ensureElementsFontsLoaded(sorted);

  const elImageMap: Record<string, HTMLImageElement> = {};
  const elLoadPromises = sorted
    .filter(
      (el) =>
        (el.type === 'image' && !!el.imageSrc) ||
        // صورة تعبئة الشكل/النص تُحمَّل مسبقاً بنفس المسبح حتى لا تُحجب شبكة النقش
        (el.fillType === 'image' && !!el.fillImageSrc),
    )
    .map(async (el) => {
      const src = el.type === 'image' ? el.imageSrc : el.fillImageSrc;
      if (!src) return;
      try {
        const img = await loadImage(src);
        elImageMap[el.id] = img;
      } catch (e) {
        logger.error('Failed to pre-load element image:', src, e);
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

    // 🔁 مطابقة عقد العرض في Konva حرفياً: الدوران حول **أصل العنصر** (x,y)
    // لا حول مركز الصندوق، والقلب حول مركز الصندوق داخل الفضاء المدوّر (هكذا
    // تُبنى المجموعة الداخلية في text/image/shape-node). الدوران حول المركز كان
    // يزيح كل عنصر مدوّر بمئات البكسلات بين التصدير اليدوي والمعاينة.
    ctx.translate(x, y);
    ctx.rotate(((el.rotation || 0) * Math.PI) / 180);
    if (el.flipX || el.flipY) {
      ctx.translate(w / 2, h / 2);
      ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
      ctx.translate(-w / 2, -h / 2);
    }

    // نمط الدمج والظل — مطابقة خصائص Konva المشتركة (shadowOpacity تُدمج في ألفا اللون)
    ctx.globalCompositeOperation = (el.globalCompositeOperation ||
      'source-over') as GlobalCompositeOperation;
    if (el.shadowColor && (el.shadowOpacity ?? 0) > 0) {
      const glow = el.type === 'text' && el.shadowGlow === true;
      ctx.shadowColor = colorWithAlpha(el.shadowColor, el.shadowOpacity ?? 1);
      ctx.shadowBlur = el.shadowBlur || 0;
      ctx.shadowOffsetX = glow ? 0 : el.shadowOffsetX || 0;
      ctx.shadowOffsetY = glow ? 0 : el.shadowOffsetY || 0;
    }

    if (el.type === 'image' && el.imageSrc && elImageMap[el.id]) {
      const img = elImageMap[el.id];
      const radius = el.cornerRadius || 0;
      const maskShape = el.maskShape && el.maskShape !== 'none' ? el.maskShape : null;
      // يقصّ الصورة (قناع/زوايا مستديرة) داخل كانفس بعرض العنصر — يُستخدم في مسار
      // مرشّح البكسل فقط، بينما يبقى الرسم المباشر بالفلاتر CSS كما كان
      const clipImage = (target: CanvasRenderingContext2D) => {
        target.beginPath();
        if (maskShape === 'circle') {
          target.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        } else if (maskShape === 'star') {
          drawStar(target, w / 2, h / 2, 5, Math.min(w, h) / 2, Math.min(w, h) / 4);
        } else if (maskShape === 'heart') {
          const topCurveHeight = h * 0.3;
          target.moveTo(w / 2, topCurveHeight);
          target.bezierCurveTo(w / 2, 0, 0, 0, 0, topCurveHeight);
          target.bezierCurveTo(
            0,
            (h + topCurveHeight) / 2,
            w / 2,
            (h + topCurveHeight) / 2,
            w / 2,
            h,
          );
          target.bezierCurveTo(
            w / 2,
            (h + topCurveHeight) / 2,
            w,
            (h + topCurveHeight) / 2,
            w,
            topCurveHeight,
          );
          target.bezierCurveTo(w, 0, w / 2, 0, w / 2, topCurveHeight);
        } else if (radius > 0) {
          drawRoundRect(target, 0, 0, w, h, radius);
        } else {
          return;
        }
        target.closePath();
        target.clip();
      };

      if (el.bgColor && el.bgColor !== 'transparent') {
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

      if (isPixelFilter(el.filter)) {
        const off = renderWithPixelFilter(w, h, el.filter, (octx) => {
          // تعديلات اللون قبل مرشّح البكسل (ترتيب Go)
          octx.filter = buildAdjustmentCSS(el);
          octx.save();
          clipImage(octx);
          drawImageCover(octx, img, 0, 0, w, h);
          octx.restore();
        });
        if (off) ctx.drawImage(off, 0, 0, w, h);
      } else {
        const filterStr = buildCSSFilter(el);
        if (maskShape) {
          ctx.save();
          clipImage(ctx);
          ctx.filter = filterStr;
          drawImageCover(ctx, img, 0, 0, w, h);
          ctx.filter = 'none';
          ctx.restore();
        } else if (radius > 0) {
          // قص cornerRadius على كانفس وسيط مشترك ليأخذ الظل شكل ألفا الصورة المقصوصة (مطابقة KonvaImage)
          const pooled = getRoundedPool(w, h);
          if (pooled) {
            const { canvas: off, ctx: octx } = pooled;
            if (filterStr && filterStr !== 'none') octx.filter = filterStr;
            drawRoundRect(octx, 0, 0, off.width, off.height, radius);
            octx.clip();
            drawImageCover(octx, img, 0, 0, off.width, off.height);
            octx.filter = 'none';
            ctx.drawImage(off, 0, 0, w, h);
          }
        } else {
          ctx.filter = filterStr;
          drawImageCover(ctx, img, 0, 0, w, h);
          ctx.filter = 'none';
        }
      }
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 32;
      // تجهيز النص الموحّد — نفس دالة المعاينة (أرقام مشرقية/حالة/تباعد عربي)
      const { text: rawText, direction, letterSpacing } = resolveTextRenderState(el);
      const fontStyle = el.fontStyle === 'italic' ? 'italic ' : '';
      const fontFamily = el.fontFamily || 'Cairo, Tajawal, sans-serif';
      const isCurved = typeof el.curve === 'number' && el.curve !== 0;
      const lineHeight = fontSize * (el.lineHeight ?? 1.2);

      let wrappedLines: string[] = [];
      let contentHeight = 0;
      if (!isCurved) {
        ctx.font = `${fontStyle}${el.fontWeight || 400} ${fontSize}px ${fontFamily}`;
        ctx.direction = direction;
        // letterSpacing: متاح في Chromium/Electron (بيئة Wails)
        if (letterSpacing) {
          (ctx as unknown as Record<string, unknown>).letterSpacing = `${letterSpacing}px`;
        }
        // التقسيم يطابق خوارزمية Konva بما فيها قطع الكلمة الأعرض من السطر
        wrappedLines = wrapTextLines(ctx, rawText, w, el.wrap || 'word');
        contentHeight = wrappedLines.length * lineHeight;
      }

      // الارتفاع دائمًا من المحتوى — الصندوق يلتصق بالكتلة في الوضعين.
      // المنحني يشمل هبوط القوس (sagitta) المحسوب بنفس دالة عقدة المعاينة.
      const layoutH = isCurved ? (measureTextContentHeightPx(el, w) ?? h) : contentHeight;
      const fillImage = elImageMap[el.id];

      const hasBg = !!el.textBgColor && el.textBgColor !== 'transparent';
      const bgPadX = el.textBgPaddingX ?? el.textBgPadding ?? 0;
      const bgPadY = el.textBgPaddingY ?? el.textBgPadding ?? 0;
      const bgRadius = el.textBgRadius ?? 0;
      const bgBorderW = el.textBgBorderWidth ?? 0;
      const bgBorderCol = el.textBgBorderColor ?? TEXT_COLOR_DEFAULT;

      // خلفية وشارة النص الاختيارية
      if (hasBg) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = el.textBgColor!;
        drawRoundRect(ctx, -bgPadX, -bgPadY, w + bgPadX * 2, layoutH + bgPadY * 2, bgRadius);
        ctx.fill();

        if (bgBorderW > 0) {
          ctx.strokeStyle = bgBorderCol;
          ctx.lineWidth = bgBorderW;
          ctx.stroke();
        }
        ctx.restore();
      }

      if (isCurved) {
        drawCurvedText(ctx, {
          text: rawText,
          x: 0,
          y: 0,
          width: w,
          height: layoutH,
          fontSize,
          fontFamily,
          fontWeight: el.fontWeight || 400, // #6 — موحَّد مع المعاينة
          fontStyle: el.fontStyle || 'normal',
          color: el.color || TEXT_COLOR_DEFAULT,
          // تدرج/صورة في فضاء العنصر رغم دوران كل حرف على القوس
          createFill: (target) => createElementGlyphPainter(target, el, w, layoutH, fillImage),
          stroke: el.strokeWidth ? el.stroke || TEXT_COLOR_DEFAULT : undefined,
          strokeWidth: el.strokeWidth || 0,
          textAlign: el.textAlign || 'center',
          direction,
          curve: el.curve || 0,
          letterSpacing,
        });
      } else {
        ctx.fillStyle = resolveElementFill(ctx, el, w, layoutH, fillImage);
        // Konva يرسم بخط أساس ألفبائي مع إزاحة (صعود-هبوط)/2؛ استخدام middle
        // كان يزيح النص والخطوط الزخرفية بضعة بكسلات عن المعاينة.
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        const metrics = ctx.measureText('M');
        const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? 0;
        const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? 0;
        const baselineOffset = (ascent - descent) / 2 + lineHeight / 2;
        // الصندوق يطابق المحتوى تمامًا، فلا إزاحة رأسية للكتلة
        const alignY = 0;

        const strokeW = el.strokeWidth || 0;
        let strokeFilterId = '';
        if (strokeW > 0) {
          strokeFilterId = ensureTextStrokeFilter(strokeW, el.stroke || TEXT_COLOR_DEFAULT);
          if (strokeFilterId) {
            ctx.filter = `url(#${strokeFilterId})`;
          }
        }

        const deco = el.textDecoration || 'none';
        // سماكة وإزاحة الزخرفة مطابقة لـ Konva (fontSize/15 و fontSize/4)
        const decoThickness = Math.max(1, fontSize / 15);
        const decoOffset = Math.round(fontSize / 4);
        // تجميع مسارات التزيين لكل الأسطر ثم stroke واحد — beginPath+stroke
        // لكل سطر كان مضاعفاً تكاليف الرسم في النصوص متعددة الأسطر
        const decoSegments: { x: number; y: number; w: number }[] = [];

        // رسم أسطر النص (يتم تطبيق الحدود النظيفة الموحدة عبر الفلتر بدون تقطيع الوصلات)
        wrappedLines.forEach((line, i) => {
          const lineWidth = ctx.measureText(line).width;
          const lineX =
            el.textAlign === 'left'
              ? 0
              : el.textAlign === 'right'
                ? w - lineWidth
                : (w - lineWidth) / 2;
          const baselineY = alignY + i * lineHeight + baselineOffset;
          ctx.fillText(line, lineX, baselineY);

          if (deco !== 'none' && line.trim()) {
            const decoY = deco === 'underline' ? baselineY + decoOffset : baselineY - decoOffset;
            decoSegments.push({ x: lineX, y: decoY, w: lineWidth });
          }
        });

        if (decoSegments.length > 0) {
          ctx.save();
          // نفس تعبئة النص (تدرج/نقش) بدل السقوط للون المصمت فقط
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = decoThickness;
          ctx.beginPath();
          for (const seg of decoSegments) {
            ctx.moveTo(seg.x, seg.y);
            ctx.lineTo(seg.x + seg.w, seg.y);
          }
          ctx.stroke();
          ctx.restore();
        }

        // بعد الزخارف: Konva يرسمها داخل sceneFunc تحت الفلتر نفسه أيضاً
        if (strokeFilterId) {
          ctx.filter = 'none';
        }
      }
    } else if (el.type === 'shape') {
      const isLinear = el.shape === 'line' || el.shape === 'arrow';
      const strokeW = isLinear ? Math.max(1, el.strokeWidth || 4) : el.strokeWidth || 0;
      ctx.lineWidth = strokeW;
      // نمط الحد وطرفه — نفس دالتي resolveStrokeDash/resolveLineCap في عقدة Konva
      ctx.setLineDash(resolveStrokeDash(el.strokeStyle, strokeW) ?? []);
      ctx.lineCap = resolveLineCap(el.strokeStyle, el.lineCap);
      ctx.strokeStyle = el.stroke || TEXT_COLOR_DEFAULT;

      // التعبئة: نفس دالة الرسم المشتركة (نقش صورة/تدرج/لون) — لا نسخة
      // ثانية من مصفوفة النقش هنا، فالمعاينة والتصدير يتشاركان fill-paint.
      const fillImg = elImageMap[el.id];
      // 🛡️ حدود المسار من المصدر المشترك مع عقدة Konva: كان التصدير يفترض
      // viewBox ثابت 24×24 لأي مسار، فيتضاعف مقياس الأشكال المدموجة (وهي
      // خارج كتالوج الأشكال) خطأً ويُهمل إزاحة أدنى إحداثي فينزاح الرسم.
      const pathBounds = el.shape === 'path' && el.svgPath ? getSvgPathBounds(el.svgPath) : null;
      const pathScaleX = pathBounds ? w / pathBounds.w : 1;
      const pathScaleY = pathBounds ? h / pathBounds.h : 1;
      ctx.fillStyle = resolveElementFill(
        ctx,
        el,
        w,
        h,
        fillImg,
        // نفس تعويض مقياس عقدة المسار المستخدم في المعاينة
        pathBounds ? { scaleX: pathScaleX, scaleY: pathScaleY } : undefined,
      );

      if (el.shape === 'rect') {
        // مصفوفة الزوايا المستقلة تتقدم على الاستدارة الموحدة (نفس عقد Konva)
        drawRoundRect(ctx, 0, 0, w, h, el.radiusCorners ?? el.radius ?? 0);
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      } else if (el.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      } else if (el.shape === 'line') {
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.strokeStyle = el.fill || gradientStart();
        ctx.stroke();
      } else if (el.shape === 'star') {
        const outerR = Math.min(w, h) / 2;
        drawStar(
          ctx,
          w / 2,
          h / 2,
          Math.max(3, Math.round(el.starPoints ?? 5)),
          outerR,
          outerR * (el.starInnerRatio ?? 0.5),
        );
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      } else if (el.shape === 'polygon') {
        const sides = el.sides || 6;
        const radius = Math.min(w, h) / 2;
        const cx = w / 2;
        const cy = h / 2;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
          const px = cx + radius * Math.cos(angle);
          const py = cy + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      } else if (el.shape === 'ring') {
        const outerR = ringOuterRadius(w, h);
        const innerR = resolveRingInnerRadius(el.innerRadius, w, h);
        const cx = w / 2;
        const cy = h / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2, false);
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      } else if (el.shape === 'arc') {
        // قوس حلقي: يبدأ من أعلى الشكل (-90°) كما في Konva.Arc مع rotation=-90
        const outerR = ringOuterRadius(w, h);
        const innerR = resolveRingInnerRadius(el.innerRadius, w, h);
        const start = -Math.PI / 2;
        const end = start + ((el.arcAngle ?? 270) * Math.PI) / 180;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, outerR, start, end, false);
        ctx.arc(w / 2, h / 2, innerR, end, start, true);
        ctx.closePath();
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      } else if (el.shape === 'wedge') {
        // قطاع دائري: يبدأ من أعلى الشكل (-90°) كما في Konva.Wedge مع rotation=-90
        const radius = Math.min(w, h) / 2;
        const start = -Math.PI / 2;
        const end = start + ((el.arcAngle ?? 90) * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(w / 2, h / 2);
        ctx.arc(w / 2, h / 2, radius, start, end, false);
        ctx.closePath();
        ctx.fill();
        if (strokeW > 0) ctx.stroke();
      } else if (el.shape === 'arrow') {
        const pLen = el.pointerLength || 14;
        const pWidth = el.pointerWidth || 14;
        const arrowH = Math.max(h, strokeW, 16);
        const arrowY = arrowH / 2;
        ctx.strokeStyle = el.stroke || el.fill || gradientStart();
        ctx.fillStyle = el.fill || el.stroke || gradientStart();
        ctx.beginPath();
        ctx.moveTo(0, arrowY);
        ctx.lineTo(Math.max(0, w - pLen), arrowY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w, arrowY);
        ctx.lineTo(w - pLen, arrowY - pWidth / 2);
        ctx.lineTo(w - pLen, arrowY + pWidth / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // رأس في البداية (سهم مزدوج) — نفس عقد Konva.pointerAtBeginning
        if (el.pointerAtBeginning) {
          ctx.beginPath();
          ctx.moveTo(0, arrowY);
          ctx.lineTo(pLen, arrowY - pWidth / 2);
          ctx.lineTo(pLen, arrowY + pWidth / 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (el.shape === 'path' && el.svgPath && pathBounds) {
        // قياس المسار المتجه ليملأ صندوق العنصر — نفس منطق KonvaPath:
        // إزاحة بأدنى إحداثي داخل المسار ثم مقياس الصندوق إلى حدود الحبر
        const path2d = new Path2D(el.svgPath);
        ctx.save();
        ctx.translate(-pathBounds.minX * pathScaleX, -pathBounds.minY * pathScaleY);
        ctx.scale(pathScaleX, pathScaleY);
        ctx.fill(path2d);
        if (strokeW > 0) ctx.stroke(path2d);
        ctx.restore();
      }
    }
    ctx.restore();
  }
}
