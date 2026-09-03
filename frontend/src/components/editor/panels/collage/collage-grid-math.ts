/**
 * حسابات شبكة الكولاج الفوتوغرافي — المقاسات الملموسة، حدود الورقة، ومحاذاة الشبكة.
 * كانت هذه الحسابات مكررة ثلاث مرات داخل custom-collage-card (الحدود، التطبيق، الحفظ).
 */

export type GridAlignment =
  | "center"
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type PhotoGridType =
  | "stretch"
  | "passport"
  | "id"
  | "visa"
  | "iq-national-id"
  | "iq-civil-id"
  | "iq-general-id"
  | "iq-transactions";

export interface PhotoDimensions {
  wMM: number;
  hMM: number;
  label: string;
}

/** مقاسات صور الوثائق العراقية المعتمدة بالمليمتر */
export function getPhotoDimensions(photoType: PhotoGridType): PhotoDimensions {
  switch (photoType) {
    case "iq-national-id":
    case "passport":
      return { wMM: 35, hMM: 45, label: "بطاقة وطنية / جواز" };
    case "iq-civil-id":
      return { wMM: 32, hMM: 40, label: "هوية أحوال" };
    case "iq-general-id":
      return { wMM: 40, hMM: 60, label: "هوية عامة" };
    case "iq-transactions":
    case "id":
      return { wMM: 30, hMM: 40, label: "متقاعدون / معاملات" };
    case "visa":
      return { wMM: 50, hMM: 50, label: "فيزا سفر 5×5" };
    default:
      return { wMM: 35, hMM: 45, label: "بطاقة وطنية" };
  }
}

/** أزواج أبعاد الورق القياسية (ملم) المستخدمة لاستنباط DPI الفعلي من أبعاد البكسل */
const PAPER_SIZES_MM: [number, number][] = [
  [210, 297], // A4
  [148, 210], // A5
  [100, 150], // 4×6
  [127, 178], // 5×7
  [297, 420], // A3
];

/**
 * استنباط DPI الفعلي من أبعاد الكانفس — إن طابقت ورقة قياسية ضمن 2%
 * نستخرج الدقة من البكسل مقابل المليمتر، وإلا نعتمد DPI المحفوظ.
 */
export function resolveEffectiveDpi(
  canvasWidth: number,
  canvasHeight: number,
  storedDpi: number
): number {
  const W = canvasWidth;
  const H = canvasHeight;
  if (typeof W !== "number" || typeof H !== "number" || W <= 0 || H <= 0) {
    return storedDpi;
  }
  for (const [pW, pH] of PAPER_SIZES_MM) {
    const expectedW = (pW * storedDpi) / 25.4;
    const expectedH = (pH * storedDpi) / 25.4;
    if (
      Math.abs(W - expectedW) / expectedW < 0.02 &&
      Math.abs(H - expectedH) / expectedH < 0.02
    ) {
      const dpiFromW = (W * 25.4) / pW;
      const dpiFromH = (H * 25.4) / pH;
      return (dpiFromW + dpiFromH) / 2;
    }
  }
  return storedDpi;
}

export interface GridLimits {
  maxRows: number;
  maxCols: number;
}

/** أقصى صفوف/أعمدة تتسع في الورقة عند المقاس الملموس المطلوب */
export function getGridLimits(
  photoType: PhotoGridType,
  canvasWidth: number,
  canvasHeight: number,
  storedDpi: number
): GridLimits {
  if (photoType === "stretch") {
    return { maxRows: 12, maxCols: 12 };
  }
  const W = canvasWidth || 2480;
  const H = canvasHeight || 3508;
  const dpi = resolveEffectiveDpi(W, H, storedDpi);
  const { wMM, hMM } = getPhotoDimensions(photoType);
  const cellW_px = (wMM * dpi) / 25.4;
  const cellH_px = (hMM * dpi) / 25.4;
  return {
    maxRows: Math.max(1, Math.floor(H / cellH_px)),
    maxCols: Math.max(1, Math.floor(W / cellW_px)),
  };
}

/** حساب نقطة بداية الشبكة المطبوعة وفق محاذاة المرساة المطلوبة */
export function getGridAnchor(
  align: GridAlignment,
  totalGridW: number,
  totalGridH: number
): { startX: number; startY: number } {
  switch (align) {
    case "top-left":
      return { startX: 0, startY: 0 };
    case "top-center":
      return { startX: Math.max(0, (1 - totalGridW) / 2), startY: 0 };
    case "top-right":
      return { startX: Math.max(0, 1 - totalGridW), startY: 0 };
    case "center-left":
      return { startX: 0, startY: Math.max(0, (1 - totalGridH) / 2) };
    case "center":
      return { startX: Math.max(0, (1 - totalGridW) / 2), startY: Math.max(0, (1 - totalGridH) / 2) };
    case "center-right":
      return { startX: Math.max(0, 1 - totalGridW), startY: Math.max(0, (1 - totalGridH) / 2) };
    case "bottom-left":
      return { startX: 0, startY: Math.max(0, 1 - totalGridH) };
    case "bottom-center":
      return { startX: Math.max(0, (1 - totalGridW) / 2), startY: Math.max(0, 1 - totalGridH) };
    case "bottom-right":
      return { startX: Math.max(0, 1 - totalGridW), startY: Math.max(0, 1 - totalGridH) };
  }
}

export interface NormalizedCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * توليد خانات الشبكة الطبيعية (0..1) لمقاس ملموس — تُستخدم في التطبيق على الكانفس
 * وفي حفظ القالب على حد سواء (كانت مكررة في الملف الأصلي).
 */
export function buildPhysicalGridCells(
  photoType: PhotoGridType,
  rows: number,
  cols: number,
  align: GridAlignment,
  canvasWidth: number,
  canvasHeight: number,
  storedDpi: number
): NormalizedCell[] {
  const W = canvasWidth || 2480;
  const H = canvasHeight || 3508;
  const dpi = resolveEffectiveDpi(W, H, storedDpi);
  const { wMM, hMM } = getPhotoDimensions(photoType);

  const cellW_px = (wMM * dpi) / 25.4;
  const cellH_px = (hMM * dpi) / 25.4;
  const normW = cellW_px / W;
  const normH = cellH_px / H;

  const { startX, startY } = getGridAnchor(align, cols * normW, rows * normH);

  const cells: NormalizedCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        x: startX + col * normW,
        y: startY + row * normH,
        w: normW,
        h: normH,
      });
    }
  }
  return cells;
}

/** توليد خانات تمدد حر متساوية تملأ الورقة بالكامل */
export function buildStretchGridCells(rows: number, cols: number): NormalizedCell[] {
  const cellW = 1 / cols;
  const cellH = 1 / rows;
  const cells: NormalizedCell[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        x: col * cellW,
        y: row * cellH,
        w: cellW,
        h: cellH,
      });
    }
  }
  return cells;
}
