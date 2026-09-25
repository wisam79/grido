/**
 * فرع العناصر (صورة/نص/شكل) من التصدير اليدوي — الوضع الحر.
 * مستخرج من export-image.ts (P1 تفكيك الملفات) بلا أي تغيير سلوكي.
 */
import { ImageElement, useEditorStore } from '@/lib/editor-store';
import { buildCSSFilter } from '@/lib/utils';
import { drawCurvedText } from '@/lib/canvas/curved-text-utils';
import { ensureTextStrokeFilter } from '@/lib/canvas/text-stroke-filter';
import { gradientStart, TEXT_COLOR_DEFAULT } from '@/lib/canvas/canvas-colors';
import { VECTOR_SHAPES } from '@/lib/io/svg-paths';
import { drawImageCover, drawRoundRect, drawStar, loadImage } from './export-primitives';
import { buildGradientFill, colorWithAlpha, getRoundedPool } from './export-color';

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

  const elImageMap: Record<string, HTMLImageElement> = {};
  const elLoadPromises = sorted
    .filter((el): el is ImageElement => el.type === 'image' && !!el.imageSrc)
    .map(async (el) => {
      try {
        const img = await loadImage(el.imageSrc);
        elImageMap[el.id] = img;
      } catch (e) {
        console.error('Failed to pre-load element image:', el.imageSrc, e);
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
      'source-over') as GlobalCompositeOperation;
    if (el.shadowColor && (el.shadowOpacity ?? 0) > 0) {
      ctx.shadowColor = colorWithAlpha(el.shadowColor, el.shadowOpacity ?? 1);
      ctx.shadowBlur = el.shadowBlur || 0;
      ctx.shadowOffsetX = el.shadowOffsetX || 0;
      ctx.shadowOffsetY = el.shadowOffsetY || 0;
    }

    if (el.type === 'image' && el.imageSrc && elImageMap[el.id]) {
      const img = elImageMap[el.id];
      const filterStr = buildCSSFilter(el);
      const radius = el.cornerRadius || 0;
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
      if (radius > 0) {
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
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 32;
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
        drawRoundRect(ctx, -bgPadX, -bgPadY, w + bgPadX * 2, h + bgPadY * 2, bgRadius);
        ctx.fill();

        if (bgBorderW > 0) {
          ctx.strokeStyle = bgBorderCol;
          ctx.lineWidth = bgBorderW;
          ctx.stroke();
        }
        ctx.restore();
      }

      let rawText = el.text || '';
      if (el.arabicNumerals) {
        rawText = rawText.replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
      }

      // #1 — تطبيق textTransform قبل الرسم (uppercase/lowercase/capitalize)
      const textTransform = el.textTransform || 'none';
      if (textTransform === 'uppercase') rawText = rawText.toUpperCase();
      else if (textTransform === 'lowercase') rawText = rawText.toLowerCase();
      else if (textTransform === 'capitalize')
        rawText = rawText.replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());

      const fontStyle = el.fontStyle === 'italic' ? 'italic ' : '';
      const fontFamily = el.fontFamily || 'Cairo, Tajawal, sans-serif';
      const isCurved = typeof el.curve === 'number' && el.curve !== 0;

      if (isCurved) {
        drawCurvedText(ctx, {
          text: rawText,
          x: 0,
          y: 0,
          width: w,
          height: h,
          fontSize,
          fontFamily,
          fontWeight: el.fontWeight || 400, // #6 — موحَّد مع المعاينة
          fontStyle: el.fontStyle || 'normal',
          color: el.color || TEXT_COLOR_DEFAULT,
          stroke: el.strokeWidth ? el.stroke || TEXT_COLOR_DEFAULT : undefined,
          strokeWidth: el.strokeWidth || 0,
          textAlign: el.textAlign || 'center',
          curve: el.curve || 0,
          letterSpacing: el.letterSpacing || 0,
        });
      } else {
        ctx.font = `${fontStyle}${el.fontWeight || 400} ${fontSize}px ${fontFamily}`; // #6
        ctx.fillStyle = buildGradientFill(ctx, el, w, h) || el.color || TEXT_COLOR_DEFAULT;
        ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'center';
        ctx.textBaseline = 'middle';
        // #5 — كشف تلقائي للاتجاه بدلاً من RTL الثابت الذي يكسر اللاتيني
        const _isArabicBlock = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
          rawText.slice(0, 30),
        );
        ctx.direction =
          ((el as unknown as Record<string, unknown>).direction as CanvasDirection | undefined) ??
          (_isArabicBlock ? 'rtl' : 'ltr');
        // #2 — letterSpacing: متاح في Chromium/Electron (بيئة Wails)
        if (el.letterSpacing) {
          (ctx as unknown as Record<string, unknown>).letterSpacing = `${el.letterSpacing}px`;
        }

        if (el.shadowColor && ((el.shadowBlur ?? 0) > 0 || (el.shadowOpacity ?? 0) > 0)) {
          ctx.shadowColor = el.shadowColor;
          ctx.shadowBlur = el.shadowBlur || 0;
          ctx.shadowOffsetX = el.shadowGlow ? 0 : el.shadowOffsetX || 0;
          ctx.shadowOffsetY = el.shadowGlow ? 0 : el.shadowOffsetY || 0;
        }

        // تقسيم الأسطر مع مراعاة التفاف الكلمات (Word-wrap)
        const rawParagraphs = rawText.split('\n');
        const wrappedLines: string[] = [];

        for (const para of rawParagraphs) {
          const words = para.split(' ');
          let currentLine = '';
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
        const textX = el.textAlign === 'left' ? 0 : el.textAlign === 'right' ? w : w / 2;
        const strokeW = el.strokeWidth || 0;
        let strokeFilterId = '';
        if (strokeW > 0) {
          strokeFilterId = ensureTextStrokeFilter(strokeW, el.stroke || TEXT_COLOR_DEFAULT);
          if (strokeFilterId) {
            ctx.filter = `url(#${strokeFilterId})`;
          }
        }

        const deco = el.textDecoration || 'none';
        const decoThickness = Math.max(1, fontSize / 16);
        // تجميع مسارات التزيين لكل الأسطر ثم stroke واحد — beginPath+stroke
        // لكل سطر كان مضاعفاً تكاليف الرسم في النصوص متعددة الأسطر
        const decoSegments: { x: number; y: number; w: number }[] = [];

        // رسم أسطر النص (يتم تطبيق الحدود النظيفة الموحدة عبر الفلتر بدون تقطيع الوصلات)
        wrappedLines.forEach((line, i) => {
          const lineY = startY + i * lineHeight;
          ctx.fillText(line, textX, lineY);

          if (deco !== 'none' && line.trim()) {
            const lineW = ctx.measureText(line).width;
            const fromX =
              el.textAlign === 'left'
                ? textX
                : el.textAlign === 'right'
                  ? textX - lineW
                  : textX - lineW / 2;
            const decoY = deco === 'underline' ? lineY + fontSize / 2 : lineY;
            decoSegments.push({ x: fromX, y: decoY, w: lineW });
          }
        });

        if (strokeFilterId) {
          ctx.filter = 'none';
        }

        if (decoSegments.length > 0) {
          ctx.save();
          ctx.strokeStyle =
            typeof ctx.fillStyle === 'string' ? ctx.fillStyle : el.color || TEXT_COLOR_DEFAULT;
          ctx.lineWidth = decoThickness;
          ctx.beginPath();
          for (const seg of decoSegments) {
            ctx.moveTo(seg.x, seg.y);
            ctx.lineTo(seg.x + seg.w, seg.y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }
    } else if (el.type === 'shape') {
      ctx.fillStyle = buildGradientFill(ctx, el, w, h) || el.fill || gradientStart();
      ctx.strokeStyle = el.stroke || TEXT_COLOR_DEFAULT;
      ctx.lineWidth = el.strokeWidth || 0;
      if (el.shape === 'rect') {
        const r = el.radius || 0;
        drawRoundRect(ctx, 0, 0, w, h, r);
        ctx.fill();
        if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
      } else if (el.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
      } else if (el.shape === 'line') {
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.lineWidth = Math.max(1, el.strokeWidth || 4);
        ctx.strokeStyle = el.fill || gradientStart();
        ctx.stroke();
      } else if (el.shape === 'star') {
        drawStar(ctx, w / 2, h / 2, 5, Math.min(w, h) / 2, Math.min(w, h) / 4);
        ctx.fill();
        if (el.strokeWidth && el.strokeWidth > 0) ctx.stroke();
      } else if (el.shape === 'path' && el.svgPath) {
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
