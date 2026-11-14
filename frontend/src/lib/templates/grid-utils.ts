import { mmToPx, pxToMm } from '@/lib/canvas/units';

import { PAPER_SIZES, DEFAULT_COLLAGE_GAP_PX, DEFAULT_COLLAGE_MARGIN_PX } from './constants';

import type { CollageTemplate } from './types';
export function getEffectiveDpi(W: number, H: number, storedDpi: number = 300): number {
  let dpi = storedDpi;
  outerLoop: for (const paper of PAPER_SIZES) {
    for (const [pW, pH] of [
      [paper.widthMM, paper.heightMM],
      [paper.heightMM, paper.widthMM],
    ] as [number, number][]) {
      const expectedW = mmToPx(pW, storedDpi);
      const expectedH = mmToPx(pH, storedDpi);
      if (
        Math.abs(W - expectedW) / expectedW < 0.02 &&
        Math.abs(H - expectedH) / expectedH < 0.02
      ) {
        const dpiFromW = (W * 25.4) / pW;
        const dpiFromH = (H * 25.4) / pH;
        dpi = (dpiFromW + dpiFromH) / 2;
        break outerLoop;
      }
    }
  }
  return dpi;
}

/** الحد الأدنى لأي خلية تولّدها مولّدات الشبكة الفيزيائية (مم) — نفس حارس
 * `getPhysicalMaxMarginMM` للمسار اليدوي حتى تتفق مسارات الهامش والفجوة. */
export const MIN_GENERATED_CELL_MM = 1;

interface FixedGapScaleInput {
  contentW: number;
  contentH: number;
  gapCountX: number;
  gapCountY: number;
  gapMM: number;
  availW: number;
  availH: number;
  smallestCellMM: number;
}

/**
 * مقياس الخلايا والفجوة النهائي لمولّدات التخطيط الفيزيائي.
 *
 * القاعدة: الفجوة المطلوبة تبقى ثابتة وتُصغَّر الخلايا وحدها (سلوك `gap`
 * في CSS Grid) — بشرط ألا تنحسر أصغر خلية عن `MIN_GENERATED_CELL_MM`.
 * عندها تُثبَّت الخلايا عند حدها الأدنى وتُضغط الفجوة بالمساحة المتبقية
 * (رفع الفجوة على هوامش كبيرة كان يُنتج خلايا مجهرية دون 1مم)، وإن استحال
 * حتى ذلك (ورقة أضيق من الخلية الدنيا نفسها) صُغِّر الكل تناسبياً كحل أخير
 * بلا خلايا سالبة.
 */
function resolveFixedGapScale(input: FixedGapScaleInput): { scale: number; finalGap: number } {
  const { contentW, contentH, gapCountX, gapCountY, gapMM, availW, availH, smallestCellMM } = input;
  const scaleFixedGap = Math.min(
    1,
    (availW - gapCountX * gapMM) / contentW,
    (availH - gapCountY * gapMM) / contentH,
  );
  // سقف المقياس 1: لا تكبير فوق المقاس المعلن، وحماية من قسمة صفرية.
  const minScale = Math.min(1, MIN_GENERATED_CELL_MM / Math.max(smallestCellMM, Number.EPSILON));
  if (scaleFixedGap >= minScale) {
    return { scale: scaleFixedGap, finalGap: gapMM };
  }
  const scale = Math.max(0, minScale);
  const gapFitX =
    gapCountX > 0 ? (availW - contentW * scale) / gapCountX : Number.POSITIVE_INFINITY;
  const gapFitY =
    gapCountY > 0 ? (availH - contentH * scale) / gapCountY : Number.POSITIVE_INFINITY;
  const gapFit = Math.min(gapFitX, gapFitY);
  if (gapFit >= 0) {
    return { scale, finalGap: Math.min(gapMM, gapFit) };
  }
  // حتى بلا فجوة لا تتسع الخلايا الدنيا — تصغير تناسبي أخير (السلوك الاحتياطي القديم).
  const rawW = contentW + gapCountX * gapMM;
  const rawH = contentH + gapCountY * gapMM;
  const scaleProportional = Math.min(availW / rawW, availH / rawH);
  return { scale: scaleProportional, finalGap: gapMM * scaleProportional };
}

/**
 * يحدد مقاس الخلية الفيزيائية (مم) لنوع القالب — مصدر واحد تستخدمه مولّدات
 * الخلايا وحاسبة الهامش الأقصى وواجهة الشبكة المخصصة حتى لا تنحرف ثوابت
 * المقاسات بين المسارات (كان `id` يعطي 40×60 هنا و35×45 في الواجهة).
 */
export function getPhysicalCellSizeMM(
  type: string,
  template?: Pick<CollageTemplate, 'id'>,
): { wMM: number; hMM: number } | null {
  if (type === 'iq-national-id' || type === 'passport') {
    return { wMM: 35, hMM: 45 };
  }
  if (type === 'iq-civil-id') {
    return { wMM: 32, hMM: 40 };
  }
  if (type === 'iq-general-id') {
    // قالب «المعاملات العامة» بالكتالوج أفقي 60×40، والبقية عمودية 40×60
    return template?.id === 'collage-iq-general' ? { wMM: 60, hMM: 40 } : { wMM: 40, hMM: 60 };
  }
  if (type === 'id') {
    return { wMM: 35, hMM: 45 };
  }
  if (type === 'iq-transactions') {
    return { wMM: 30, hMM: 40 };
  }
  if (type === 'visa') {
    return { wMM: 35, hMM: 45 };
  }
  if (type === 'us-visa') {
    return { wMM: 51, hMM: 51 };
  }
  return null;
}

/**
 * خلايا شبكة فيزيائية منتظمة (0..1) — المصدر الوحيد لبناء الشبكة عند التطبيق
 * والحفظ وسحب الفواصل. التجاوز عن المساحة المتاحة يُصغّر الخلايا وحدها مع
 * الإبقاء على الفجوة المطلوبة ثابتة (كسلوك `gap` في CSS Grid)، بدل تصغير
 * الفجوة معها فيختفي التباعد الذي اختاره المستخدم بصمت. لا يوجد تسامح: أي
 * تجاوز ولو 0.1 مم يعني خلية تخرج عن الهامش المطلوب. إذا استهلكت الفجوة
 * المساحة كلها (بسبب هامش/عدد أعمدة متطرف) نعود لتصغير الاثنين معاً حتى
 * لا تنتج خلايا بأبعاد سالبة.
 */
export function buildPhysicalGridCellsMM(
  cols: number,
  rows: number,
  wMM: number,
  hMM: number,
  gapMM: number,
  paperW: number,
  paperH: number,
  align: string = 'center',
  marginMM: number = 0,
) {
  const marginX = marginMM;
  const marginY = marginMM;
  const availW = paperW - 2 * marginX;
  const availH = paperH - 2 * marginY;

  const contentW = cols * wMM;
  const contentH = rows * hMM;

  const { scale, finalGap } = resolveFixedGapScale({
    contentW,
    contentH,
    gapCountX: cols - 1,
    gapCountY: rows - 1,
    gapMM,
    availW,
    availH,
    smallestCellMM: Math.min(wMM, hMM),
  });

  const finalCellW = wMM * scale;
  const finalCellH = hMM * scale;

  const gridW = cols * finalCellW + (cols - 1) * finalGap;
  const gridH = rows * finalCellH + (rows - 1) * finalGap;

  let startX = (paperW - gridW) / 2;
  let startY = (paperH - gridH) / 2;

  if (align === 'top-left') {
    startX = marginX;
    startY = marginY;
  } else if (align === 'top-center') {
    startX = (paperW - gridW) / 2;
    startY = marginY;
  } else if (align === 'top-right') {
    startX = paperW - marginX - gridW;
    startY = marginY;
  } else if (align === 'center-left') {
    startX = marginX;
    startY = (paperH - gridH) / 2;
  } else if (align === 'center-right') {
    startX = paperW - marginX - gridW;
    startY = (paperH - gridH) / 2;
  } else if (align === 'bottom-left') {
    startX = marginX;
    startY = paperH - marginY - gridH;
  } else if (align === 'bottom-center') {
    startX = (paperW - gridW) / 2;
    startY = paperH - marginY - gridH;
  } else if (align === 'bottom-right') {
    startX = paperW - marginX - gridW;
    startY = paperH - marginY - gridH;
  }

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        x: (startX + c * (finalCellW + finalGap)) / paperW,
        y: (startY + r * (finalCellH + finalGap)) / paperH,
        w: finalCellW / paperW,
        h: finalCellH / paperH,
      });
    }
  }
  return cells;
}

function getMixedCells(
  paperW: number,
  paperH: number,
  gapMM: number,
  align: string = 'center',
  marginMM: number = 0,
) {
  const marginX = marginMM;
  const marginY = marginMM;
  const availW = paperW - 2 * marginX;
  const availH = paperH - 2 * marginY;

  const leftW = 2 * 35;
  const leftH = 2 * 45;
  const rightW = 60;
  const rightH = 2 * 40;

  const contentW = leftW + rightW;
  const contentH = Math.max(leftH, rightH);

  // نفس قاعدة buildPhysicalGridCellsMM مع حارس الحد الأدنى للخلية.
  const { scale, finalGap } = resolveFixedGapScale({
    contentW,
    contentH,
    gapCountX: 2,
    gapCountY: 1,
    gapMM,
    availW,
    availH,
    smallestCellMM: Math.min(35, 45, 60, 40),
  });

  const final35 = 35 * scale;
  const final45 = 45 * scale;
  const final60 = 60 * scale;
  const final40 = 40 * scale;

  const finalLeftW = 2 * final35 + finalGap;
  const finalLeftH = 2 * final45 + finalGap;
  const finalRightW = final60;
  const finalRightH = 2 * final40 + finalGap;

  const gridW = finalLeftW + finalGap + finalRightW;
  const gridH = Math.max(finalLeftH, finalRightH);

  let startX = (paperW - gridW) / 2;
  let startY = (paperH - gridH) / 2;

  if (align === 'top-left') {
    startX = marginX;
    startY = marginY;
  } else if (align === 'top-center') {
    startX = (paperW - gridW) / 2;
    startY = marginY;
  } else if (align === 'top-right') {
    startX = paperW - marginX - gridW;
    startY = marginY;
  } else if (align === 'center-left') {
    startX = marginX;
    startY = (paperH - gridH) / 2;
  } else if (align === 'center-right') {
    startX = paperW - marginX - gridW;
    startY = (paperH - gridH) / 2;
  } else if (align === 'bottom-left') {
    startX = marginX;
    startY = paperH - marginY - gridH;
  } else if (align === 'bottom-center') {
    startX = (paperW - gridW) / 2;
    startY = paperH - marginY - gridH;
  } else if (align === 'bottom-right') {
    startX = paperW - marginX - gridW;
    startY = paperH - marginY - gridH;
  }

  const cells = [];

  // Left 2x2 grid of 35x45 mm (4 slots)
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      cells.push({
        x: (startX + c * (final35 + finalGap)) / paperW,
        y: (startY + (gridH - finalLeftH) / 2 + r * (final45 + finalGap)) / paperH,
        w: final35 / paperW,
        h: final45 / paperH,
      });
    }
  }

  // Right 1x2 grid of 60x40 mm (2 slots)
  for (let r = 0; r < 2; r++) {
    cells.push({
      x: (startX + finalLeftW + finalGap) / paperW,
      y: (startY + (gridH - finalRightH) / 2 + r * (final40 + finalGap)) / paperH,
      w: final60 / paperW,
      h: final40 / paperH,
    });
  }

  return cells;
}

function getTravelerCells(
  paperW: number,
  paperH: number,
  gapMM: number,
  align: string = 'center',
  marginMM: number = 0,
) {
  const marginX = marginMM;
  const marginY = marginMM;
  const availW = paperW - 2 * marginX;
  const availH = paperH - 2 * marginY;

  // الصف العلوي: جوازات رسمية 35×45 (المصدر الموحد photo-templates.ts) — كان 50×50 خطأً.
  const topW = 2 * 35;
  const topH = 45;
  const bottomW = 2 * 35;
  const bottomH = 2 * 45;

  const contentW = Math.max(topW, bottomW);
  const contentH = topH + bottomH;

  // نفس قاعدة buildPhysicalGridCellsMM مع حارس الحد الأدنى للخلية.
  const { scale, finalGap } = resolveFixedGapScale({
    contentW,
    contentH,
    gapCountX: 1,
    gapCountY: 2,
    gapMM,
    availW,
    availH,
    smallestCellMM: Math.min(35, 45),
  });

  const final35 = 35 * scale;
  const final45 = 45 * scale;

  const finalTopW = 2 * final35 + finalGap;
  const finalTopH = final45;
  const finalBottomW = 2 * final35 + finalGap;
  const finalBottomH = 2 * final45 + finalGap;

  const gridW = Math.max(finalTopW, finalBottomW);
  const gridH = finalTopH + finalGap + finalBottomH;

  let startX = (paperW - gridW) / 2;
  let startY = (paperH - gridH) / 2;

  if (align === 'top-left') {
    startX = marginX;
    startY = marginY;
  } else if (align === 'top-center') {
    startX = (paperW - gridW) / 2;
    startY = marginY;
  } else if (align === 'top-right') {
    startX = paperW - marginX - gridW;
    startY = marginY;
  } else if (align === 'center-left') {
    startX = marginX;
    startY = (paperH - gridH) / 2;
  } else if (align === 'center-right') {
    startX = paperW - marginX - gridW;
    startY = (paperH - gridH) / 2;
  } else if (align === 'bottom-left') {
    startX = marginX;
    startY = paperH - marginY - gridH;
  } else if (align === 'bottom-center') {
    startX = (paperW - gridW) / 2;
    startY = paperH - marginY - gridH;
  } else if (align === 'bottom-right') {
    startX = paperW - marginX - gridW;
    startY = paperH - marginY - gridH;
  }

  const cells = [];

  // Top row: 2 slots of 35x45 mm (centered horizontally relative to gridW)
  const topOffsetX = (gridW - finalTopW) / 2;
  for (let c = 0; c < 2; c++) {
    cells.push({
      x: (startX + topOffsetX + c * (final35 + finalGap)) / paperW,
      y: startY / paperH,
      w: final35 / paperW,
      h: final45 / paperH,
    });
  }

  // Bottom 2x2 grid of 35x45 mm (4 slots, centered horizontally relative to gridW)
  const bottomOffsetX = (gridW - finalBottomW) / 2;
  const bottomStartY = startY + finalTopH + finalGap;
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      cells.push({
        x: (startX + bottomOffsetX + c * (final35 + finalGap)) / paperW,
        y: (bottomStartY + r * (final45 + finalGap)) / paperH,
        w: final35 / paperW,
        h: final45 / paperH,
      });
    }
  }

  return cells;
}

/**
 * خلايا التخطيط الفيزيائي محسوبة من أبعاد الورقة والفواصل المخزنة.
 *
 * 🛑 القاعدة: الصفر قيمة صريحة — لا استبدال خفي بقيم افتراضية (2 مم فجوة /
 * 4 مم هامش). كان ذلك يجعل ورقة «تُعرض بلا هوامش» بينما الخلايا المولّدة
 * تحمل 4 مم، فتنحرف الحدود التي تراها الواجهة وخلايا التصدير والطباعة.
 */
export function computeDynamicCollageCells(
  template: CollageTemplate,
  canvasW: number,
  canvasH: number,
  dpi: number,
  collageGap: number = DEFAULT_COLLAGE_GAP_PX,
  collageMargin: number = DEFAULT_COLLAGE_MARGIN_PX,
): { x: number; y: number; w: number; h: number }[] | null {
  if (!template.physicalLayout) return null;

  const { type, rows, cols, align = 'center' } = template.physicalLayout;
  const paperW_mm = pxToMm(canvasW, dpi);
  const paperH_mm = pxToMm(canvasH, dpi);

  const gap = Number.isFinite(collageGap) ? pxToMm(Math.max(0, collageGap), dpi) : 0;
  const margin = Number.isFinite(collageMargin) ? pxToMm(Math.max(0, collageMargin), dpi) : 0;

  // حارس: هامش يبتلع الورقة (>= نصف قياسها) يجعل المساحة المتاحة سالبة، فيخرج
  // scale سالباً وخلايا بأبعاد سالبة تُكتب في الخانات كما هي وتُحفظ مع المشروع.
  // إرجاع null يجعل كل المستدعين (`if (dynamicCells)`) يحتفظون بالخلايا السابقة.
  if (paperW_mm - 2 * margin <= 0 || paperH_mm - 2 * margin <= 0) {
    return null;
  }

  if (type === 'iq-mixed') {
    return getMixedCells(paperW_mm, paperH_mm, gap, align, margin);
  }

  if (type === 'combo-traveler') {
    return getTravelerCells(paperW_mm, paperH_mm, gap, align, margin);
  }

  const size = getPhysicalCellSizeMM(type, template);
  if (!size) {
    return null;
  }

  return buildPhysicalGridCellsMM(
    cols,
    rows,
    size.wMM,
    size.hMM,
    gap,
    paperW_mm,
    paperH_mm,
    align,
    margin,
  );
}

/**
 * أقصى هامش (مم) يُسمح به للتخطيط الفيزيائي بحيث تبقى أصغر خلية >= حد أدنى معلوم
 * بعد تصغير الشبكة، فلا تنتج خلايا سالبة أو شبحية (أقل من 1 مم).
 * يُعيد null عندما لا يوجد تخطيط فيزيائي أو نوعه غير معروف — عندها لا يُقيَّد الهامش.
 */
export function getPhysicalMaxMarginMM(
  template: CollageTemplate,
  paperWmm: number,
  paperHmm: number,
  gapMM: number,
  minCellMM: number = 1,
): number | null {
  const layout = template.physicalLayout;
  if (!layout) return null;

  let contentW: number;
  let contentH: number;
  let gapCountW: number;
  let gapCountH: number;
  let minCellRaw: number;
  if (layout.type === 'iq-mixed') {
    // نفس ثوابت getMixedCells: يسار 2×2 من 35×45 + يمين 60×40
    contentW = 2 * 35 + 60;
    contentH = Math.max(2 * 45, 2 * 40);
    gapCountW = 2; // فجوة داخل العمودين + فجوة بين الكتلتين
    gapCountH = 1; // فجوة بين صفي البطاقات اليسرى
    minCellRaw = 35;
  } else if (layout.type === 'combo-traveler') {
    // نفس ثوابت getTravelerCells: صف علوي 2×35×45 + شبكة سفلية 2×2 من 35×45
    contentW = 2 * 35;
    contentH = 45 + 2 * 45;
    gapCountW = 1; // بين الجوازين
    gapCountH = 2; // بين الصف العلوي والكتلة السفلية + بين صفيها
    minCellRaw = 35;
  } else {
    const size = getPhysicalCellSizeMM(layout.type, template);
    if (!size) return null;
    contentW = layout.cols * size.wMM;
    contentH = layout.rows * size.hMM;
    gapCountW = layout.cols - 1;
    gapCountH = layout.rows - 1;
    minCellRaw = Math.min(size.wMM, size.hMM);
  }

  // الفجوة تبقى ثابتة عند التصغير، لذا المساحة المطلوبة =
  // (محتوى الخلايا × مقياس الحد الأدنى) + (عدد الفجوات × الفجوة الكاملة).
  const minScale = minCellMM / minCellRaw;
  const requiredW = minScale * contentW + gapCountW * gapMM;
  const requiredH = minScale * contentH + gapCountH * gapMM;
  return Math.max(0, Math.min((paperWmm - requiredW) / 2, (paperHmm - requiredH) / 2));
}
