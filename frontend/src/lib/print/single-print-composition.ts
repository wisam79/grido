// تركيب كانفاس الوضع الحر للطباعة المباشرة من العناصر (بدل لقطة الكانفس).
//
// الهدف: تجنب إعادة الترميز المزدوجة — التقاط الكانفس بدقة الطباعة ثم إعادة
// ترميزه في Go. بدلاً من ذلك نرسل الصور الأصلية + هندستها على الكانفاس،
// فيرسمها Go مرة واحدة بدقة الطباعة.
//
// الأهلية مشروطة بتطابق دلالات الرسم مع ما يعرضه Konva:
// الصور تُمدّد (stretch) داخل مستطيلها، والقلب حول المحور الأوسط، والزوايا
// المستديرة تُقصّ — أي عنصر خارج هذه المجموعة يعيد التوجيه إلى مسار الالتقاط.

import type { CanvasElement, ImageElement } from "@/lib/store/types";

export interface SingleCompositionItem {
  imageSrc: string;
  x: number;
  y: number;
  w: number;
  h: number;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  flipX: boolean;
  flipY: boolean;
  cornerRadius: number;
  rotation: number;
  bgColor?: string;
}

export interface SingleComposition {
  canvasWidthPx: number;
  canvasHeightPx: number;
  canvasWidthMM: number;
  canvasHeightMM: number;
  backgroundColor: string;
  items: SingleCompositionItem[];
}

export interface SingleCompositionInput {
  elements: CanvasElement[];
  canvasWidth: number;
  canvasHeight: number;
  canvasWidthMM: number;
  canvasHeightMM: number;
  backgroundColor: string;
}

export interface SingleCompositionResult {
  eligible: boolean;
  reason?: string;
  composition?: SingleComposition;
}

// المرشحات التي تنفذها خوارزمية Go في applyFilter — أي مرشح خارجها يُهمَل هناك
const GO_SUPPORTED_FILTERS = new Set([
  "none",
  "grayscale",
  "invert",
  "blur",
  "sepia",
  "enhance",
  "skinGlow",
  "clarity",
  "lowlight",
  "cinematic",
  "monoPro",
]);

const LOCAL_IMAGE_PREFIX = "/local-image/";

export function buildSingleComposition(input: SingleCompositionInput): SingleCompositionResult {
  const { elements, canvasWidth, canvasHeight, canvasWidthMM, canvasHeightMM, backgroundColor } = input;

  const fail = (reason: string): SingleCompositionResult => ({ eligible: false, reason });

  if (typeof backgroundColor !== "string" || !/^#[0-9a-fA-F]{6}$/.test(backgroundColor)) {
    return fail("خلفية الكانفاس ليست لوناً صلباً");
  }

  const visible = elements.filter((el) => el.visible !== false);

  for (const el of visible) {
    if (el.type !== "image") {
      return fail(`عنصر غير صورة (${el.type})`);
    }
    if (!el.imageSrc || !el.imageSrc.startsWith(LOCAL_IMAGE_PREFIX)) {
      return fail("مصدر الصورة غير قابل للقراءة في الخدمة");
    }
    if (el.rotation && el.rotation !== 0) {
      return fail("عنصر مدوّر (Konva يدور حول الأصل بينما Go حول المركز)");
    }
    if (el.opacity !== undefined && el.opacity < 1) {
      return fail("عنصر شفاف جزئياً");
    }
    if (el.blur && el.blur > 0) {
      return fail("عنصر بضبابية");
    }
    if (el.shadowColor && (el.shadowOpacity ?? 0) > 0) {
      return fail("عنصر بظل");
    }
    if (el.globalCompositeOperation && el.globalCompositeOperation !== "source-over") {
      return fail("عنصر بنمط دمج مخصص");
    }
    if (el.filter && !GO_SUPPORTED_FILTERS.has(el.filter)) {
      return fail(`مرشح غير مدعوم في الخدمة (${el.filter})`);
    }
  }

  const sorted = [...visible].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  // الأهلية أعلاه تكفل أن كل عنصر مرئي صورة — لذا التحويل آمن
  const items: SingleCompositionItem[] = (sorted as ImageElement[])
    .filter((el) => !!el.imageSrc)
    .map((el) => ({
      imageSrc: el.imageSrc,
      x: el.x * canvasWidth,
      y: el.y * canvasHeight,
      w: el.width * canvasWidth,
      h: el.height * canvasHeight,
      filter: el.filter || "none",
      brightness: el.brightness ?? 100,
      contrast: el.contrast ?? 100,
      saturation: el.saturation ?? 100,
      flipX: el.flipX === true,
      flipY: el.flipY === true,
      cornerRadius: el.cornerRadius || 0,
      rotation: 0,
      bgColor: el.bgColor && el.bgColor !== "transparent" ? el.bgColor : undefined,
    }));

  return {
    eligible: true,
    composition: {
      canvasWidthPx: canvasWidth,
      canvasHeightPx: canvasHeight,
      canvasWidthMM,
      canvasHeightMM,
      backgroundColor,
      items,
    },
  };
}
