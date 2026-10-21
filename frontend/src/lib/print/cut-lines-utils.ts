import { computeBlockPosition, computeSlotRectMM } from '@/lib/print/print-layout-math';

import type { SheetGrid } from '@/lib/print/print-layout-math';
import type { CanvasSlot } from '@/lib/store/types';

export type CutLineStyle = 'dashed' | 'dotted' | 'solid' | 'cropmarks';

export interface CutLineMM {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isBottomEnd?: boolean;
}

/** فترة مشغولة على محور واحد (بداية/نهاية) — قاعدة حساب خطوط القص */
export interface AxisInterval {
  /** بداية الفترة المشغولة */
  start: number;
  /** نهاية الفترة المشغولة */
  end: number;
}

export interface MidpointCutLinesInput {
  /** الفترات الأفقية المشغولة (إحداثيات الخانات على محور paperWidth) */
  xIntervals: AxisInterval[];
  /** الفترات الرأسية المشغولة (إحداثيات الخانات على محور paperHeight) */
  yIntervals: AxisInterval[];
  /** نصف الفجوة بين خانتين متجاورتين على المحور الأفقي (0 في التخطيط الفيزيائي) */
  gapX: number;
  /** نصف الفجوة بين خانتين متجاورتين على المحور الرأسي */
  gapY: number;
  /** حد الورقة الأفقي — أي تجاوز يُقصّ صامتاً من المحرك فيختفي الخط */
  paperWidth: number;
  /** حد الورقة الرأسي */
  paperHeight: number;
}

export interface MidpointCutLines {
  /** مواضع الخطوط الرأسية على المحور الأفقي (تصاعدية، مقصورة بالورقة) */
  xCutLines: number[];
  /** مواضع الخطوط الأفقية على المحور الرأسي (تصاعدية، مقصورة بالورقة) */
  yCutLines: number[];
  /** أول خط رأسي (يسار التخطيط) — نقطة البداية العمودية لبقية الخطوط */
  minX: number;
  /** آخر خط رأسي (يمين التخطيط) */
  maxX: number;
  /** أول خط أفقي (أعلى التخطيط) */
  minY: number;
  /** آخر خط أفقي (أسفل التخطيط — خط نهاية منطقة الطباعة) */
  maxY: number;
}

export interface CalculateCutLinesParams {
  mode: 'single' | 'collage';
  actualCopies: number;
  imageWidthMM: number;
  imageHeightMM: number;
  gapMM: number;
  paperWidth: number;
  paperHeight: number;
  showEndCutLine?: boolean;
  slots?: CanvasSlot[];
  collageMargin?: number;
  collageGap?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  hasPhysical?: boolean;
  cutLineStyle?: 'dashed' | 'dotted' | 'solid' | 'cropmarks';
  // الشبكة المحسوبة مسبقاً من computeSheetGrid — المصدر الوحيد للصيغ،
  // لا يُعاد حسابها هنا (كانت مكررة وتسبب انحراف المعاينة عن الطباعة)
  grid: SheetGrid;
}

/**
 * دالة موحدة لحساب إحداثيات خطوط القص بالمليمتر على ورقة الطباعة.
 * تضمن المطابقة التامة بين معاينة الواجهة (PrintPreview) والمخرجات في Go Backend.
 */
export function calculatePrintCutLines(params: CalculateCutLinesParams): CutLineMM[] {
  const {
    mode,
    actualCopies,
    imageWidthMM,
    imageHeightMM,
    gapMM,
    paperWidth,
    paperHeight,
    showEndCutLine = true,
    slots,
    collageMargin = 0,
    collageGap = 0,
    canvasWidth = 2480,
    canvasHeight = 3508,
    hasPhysical = false,
    grid,
  } = params;

  if (actualCopies <= 0) return [];

  const cutLines: CutLineMM[] = [];
  const { safeCols, actualRows, gridWidth, gridHeight, offsetX, offsetY } = grid;

  // 🧩 فرع الكولاج: الاعتماد على الإحداثيات الفعلية للخلايا (slots)
  if (mode === 'collage' && slots && slots.length > 0) {
    // 🧩 نجمع **فترات** (بداية/نهاية) لا حواف منفصلة: الاقتران بالحافة
    // اليسرى التالية يتطلّب معرفة أيّ حافة يمين ينتمي إليها أيّ حافة يسار،
    // وحواف منفصلة تفقد هذا الربط (مصدر خط القص داخل الصور).
    const colIntervals: AxisInterval[] = [];
    const rowIntervals: AxisInterval[] = [];

    // 🛡️ إصلاح: مقياسان منفصلان لكل محور — كان يستخدم مقياس العرض لكلا المحورين
    // مما يسبب انحرافاً عمودياً في مواضع خطوط القص بين المعاينة والطباعة
    const scaleXPxToMM = imageWidthMM / Math.max(1, canvasWidth);
    const scaleYPxToMM = imageHeightMM / Math.max(1, canvasHeight);
    const marginPx = hasPhysical ? 0 : collageMargin;
    const gapPx = hasPhysical ? 0 : collageGap;
    const marginXMM = marginPx * scaleXPxToMM;
    const marginYMM = marginPx * scaleYPxToMM;
    const gapXMM = gapPx * scaleXPxToMM;
    const gapYMM = gapPx * scaleYPxToMM;

    for (let i = 0; i < actualCopies; i++) {
      const block = computeBlockPosition(i, grid);

      for (const slot of slots) {
        // الحارس كان `!slot.imageSrc && (w<=0 || h<=0)` — أي ميت عملياً: الخلية
        // الفارغة بلا صورة وبأبعاد صحيحة كانت تمر دائماً (وهو المطلوب، لأن خطوط
        // القص تخص الشبكة لا الصور)، بينما خلية بأبعاد صفرية ومعها صورة كانت
        // تُحسب فتشوّه مواضع الخطوط. الشرط الصحيح: تجاهل الأبعاد غير الصالحة فقط
        // (و`!(w > 0)` يستبعد NaN أيضاً فلا تصل إحداثيات غير منتهية إلى Go).
        if (!(slot.w > 0 && slot.h > 0)) continue;
        const rect = computeSlotRectMM(
          block,
          { x: slot.x, y: slot.y, w: slot.w, h: slot.h },
          { widthMM: imageWidthMM, heightMM: imageHeightMM },
          { marginXMM, marginYMM },
          { gapXMM, gapYMM },
        );

        colIntervals.push({
          start: Math.round(rect.xMM * 100) / 100,
          end: Math.round((rect.xMM + rect.wMM) * 100) / 100,
        });
        rowIntervals.push({
          start: Math.round(rect.yMM * 100) / 100,
          end: Math.round((rect.yMM + rect.hMM) * 100) / 100,
        });
      }
    }

    // 📐 الرياضيات من مصدر واحد مشترك مع طبقة الكانفاس (konva-collage-layer)
    // — انظر buildMidpointCutLines أعلاه (توحيد إصلاح P1 للتقاصد المتراكب).
    const cut = buildMidpointCutLines({
      xIntervals: colIntervals,
      yIntervals: rowIntervals,
      gapX: gapXMM,
      gapY: gapYMM,
      paperWidth,
      paperHeight,
    });

    if (cut) {
      const { xCutLines, yCutLines, minX, maxX, minY, maxY } = cut;

      for (const x of xCutLines) {
        cutLines.push({
          x1: Math.min(paperWidth, Math.max(0, x)),
          y1: Math.min(paperHeight, Math.max(0, minY)),
          x2: Math.min(paperWidth, Math.max(0, x)),
          y2: Math.min(paperHeight, Math.max(0, maxY)),
        });
      }

      for (let i = 0; i < yCutLines.length; i++) {
        const y = yCutLines[i];
        const isBottomEnd = i === yCutLines.length - 1;
        if (isBottomEnd && !showEndCutLine) continue;
        const lineMinX = isBottomEnd ? 0 : minX;
        const lineMaxX = isBottomEnd ? paperWidth : maxX;
        cutLines.push({
          x1: Math.min(paperWidth, Math.max(0, lineMinX)),
          y1: Math.min(paperHeight, Math.max(0, y)),
          x2: Math.min(paperWidth, Math.max(0, lineMaxX)),
          y2: Math.min(paperHeight, Math.max(0, y)),
          isBottomEnd,
        });
      }

      return cutLines;
    }
  }

  // 🖼️ الوضع الافتراضي (الوضع الحر single أو كولاج بدون خلايا)
  const effectiveCols = actualRows === 1 ? Math.max(1, Math.min(safeCols, actualCopies)) : safeCols;
  const xCutLines: number[] = [];
  xCutLines.push(Math.max(0, offsetX));
  for (let c = 1; c < effectiveCols; c++) {
    const cx = offsetX + c * (imageWidthMM + gapMM) - gapMM / 2;
    if (cx > 0 && cx < paperWidth) {
      xCutLines.push(cx);
    }
  }
  xCutLines.push(Math.min(paperWidth, offsetX + gridWidth));

  const yCutLines: number[] = [];
  yCutLines.push(Math.max(0, offsetY));
  for (let r = 1; r < actualRows; r++) {
    const cy = offsetY + r * (imageHeightMM + gapMM) - gapMM / 2;
    if (cy > 0 && cy < paperHeight) {
      yCutLines.push(cy);
    }
  }
  const gridBottomY = Math.min(paperHeight, offsetY + gridHeight);
  yCutLines.push(gridBottomY);

  const minX = xCutLines[0];
  const maxX = xCutLines[xCutLines.length - 1];
  const minY = yCutLines[0];
  const maxY = yCutLines[yCutLines.length - 1];

  for (const x of xCutLines) {
    cutLines.push({
      x1: Math.min(paperWidth, Math.max(0, x)),
      y1: Math.min(paperHeight, Math.max(0, minY)),
      x2: Math.min(paperWidth, Math.max(0, x)),
      y2: Math.min(paperHeight, Math.max(0, maxY)),
    });
  }

  for (let i = 0; i < yCutLines.length; i++) {
    const y = yCutLines[i];
    const isBottomEnd = i === yCutLines.length - 1;
    if (isBottomEnd && !showEndCutLine) continue;
    const lineMinX = isBottomEnd ? 0 : minX;
    const lineMaxX = isBottomEnd ? paperWidth : maxX;
    cutLines.push({
      x1: Math.min(paperWidth, Math.max(0, lineMinX)),
      y1: Math.min(paperHeight, Math.max(0, y)),
      x2: Math.min(paperWidth, Math.max(0, lineMaxX)),
      y2: Math.min(paperHeight, Math.max(0, y)),
      isBottomEnd,
    });
  }

  return cutLines;
}

// فرق أدنى لاعتبار موضعين خطين مختلفين — يحمي الترتيب التصاعدي الصارم من
// التكرارات الناتجة عن فجوة صفرية أو حواف متطابقة بعد التقريب.
const CUT_LINE_DEDUPE_EPSILON = 1e-6;

/** إسقاط التكرارات من سلسلة مرتبة تصاعدياً (فارغتان أو أكثر بنفس الموضع = خط واحد). */
function dedupeAscending(values: readonly number[]): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (out.length === 0 || v > out[out.length - 1] + CUT_LINE_DEDUPE_EPSILON) out.push(v);
  }
  return out;
}

/**
 * 🧩 دمج الفترات المتداخلة على محور واحد.
 *
 * - الفترات المتداخلة **تداخلاً صارماً** (start < end السابقة) تُدمج في
 *   واحدة: التداخل يعني أن الصور تتقاطع على هذا المحور فلا يجوز وضع خط
 *   قصّ داخل أيٍّ منها (هذا هو إصلاح «خط القص يمرّ عبر الصورة»).
 * - الفترات **المتلاصقة** (start === end السابقة) تبقى منفصلة: حدّها
 *   المشترك هو خط قصّ حقيقي — وهي الحالة الطبيعية في التخطيط الفيزيائي
 *   حيث الفجوة = 0 فحدود الخانات متلاصقة تماماً.
 */
function mergeIntervals(intervals: readonly AxisInterval[]): AxisInterval[] {
  const sorted = intervals
    .filter((iv) => Number.isFinite(iv.start) && Number.isFinite(iv.end) && iv.end > iv.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: AxisInterval[] = [];
  for (const iv of sorted) {
    const last = merged[merged.length - 1];
    if (last && iv.start < last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ start: iv.start, end: iv.end });
    }
  }
  return merged;
}

/**
 * خطوط القص على محور واحد: حدّ التخطيط الأول، منتصف كل فجوة فعلية بين
 * مجموعتين متجاورتين، ثم حدّ التخطيط الأخير.
 *
 * 🛡️ القاعدة الصحيحة: اتحاد الفترات المشغولة على المحور، ثم وضع خط في
 * منتصف كل فجوة **فعلية** بين مجموعتين غير متداخلتين. الفجوة الصفرية
 * (خانات متلاصقة) تعطي الحدّ المشترك نفسه — وهو الخط المطلوب.
 */
function axisMidpointCutLines(
  intervals: readonly AxisInterval[],
  gap: number,
  paperSize: number,
): number[] {
  // القص حد الورقة إلزامي: أي إحداثي خارجها يُقصّ صامتاً في الكانفاس النهائي
  // فيختفي الخط من الطباعة تماماً (ثابت محرك الرسم).
  const clamp = (v: number) => Math.min(paperSize, Math.max(0, v));
  const merged = mergeIntervals(intervals);
  if (merged.length === 0) return [];

  const lines: number[] = [clamp(merged[0].start - gap / 2)];
  for (let i = 1; i < merged.length; i++) {
    lines.push(clamp((merged[i - 1].end + merged[i].start) / 2));
  }
  lines.push(clamp(merged[merged.length - 1].end + gap / 2));
  return dedupeAscending(lines);
}

/**
 * 🧩 المصدر الوحيد لرياضيات خطوط قص الكولاج بنقاط منتصف الفجوات.
 *
 * يستهلكها مسارَان يحتاجان نفس النتيجة بوحدتين مختلفتين:
 * - `calculatePrintCutLines` (فرع الكولاج) بالمليمتر → معاينة الطباعة وخطوط Go.
 * - طبقة الكانفاس `konva-collage-layer` بالبكسل → المعاينة داخل المحرر.
 *
 * النتيجة `null` حين لا توجد حواف يسرى/علوية صالحة (لا خلايا مرسومة).
 */
export function buildMidpointCutLines(input: MidpointCutLinesInput): MidpointCutLines | null {
  // حواجز أخيرة: قيمة غير منتهية في الفجوة أو الورقة تُفسد كل المواضع،
  // فنسقط إلى قيم محيّدة (فجوة صفرية / بلا قصّ للحدود) بدل تمرير NaN إلى Go.
  const gapX = Number.isFinite(input.gapX) ? input.gapX : 0;
  const gapY = Number.isFinite(input.gapY) ? input.gapY : 0;
  const paperWidth = Number.isFinite(input.paperWidth) ? input.paperWidth : Number.MAX_SAFE_INTEGER;
  const paperHeight = Number.isFinite(input.paperHeight)
    ? input.paperHeight
    : Number.MAX_SAFE_INTEGER;

  const xCutLines = axisMidpointCutLines(input.xIntervals, gapX, paperWidth);
  const yCutLines = axisMidpointCutLines(input.yIntervals, gapY, paperHeight);

  if (xCutLines.length === 0 || yCutLines.length === 0) return null;

  return {
    xCutLines,
    yCutLines,
    minX: xCutLines[0],
    maxX: xCutLines[xCutLines.length - 1],
    minY: yCutLines[0],
    maxY: yCutLines[yCutLines.length - 1],
  };
}
