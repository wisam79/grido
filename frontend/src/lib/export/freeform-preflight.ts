import { resolveBatchImageDimensions } from '@/lib/canvas/image-dimensions';
import { MM_PER_INCH } from '@/lib/canvas/units';

import type { CanvasElement, ImageElement } from '@/lib/store/types';

/* ═══════════════════════════════════════════════════════════════
   فحص محتوى الوضع الحر (عناصر الصور الحرة: ملصقات، أختام…) قبل
   الطباعة والتصدير — مصدر واحد للتحذيرات.

   يكمل `runCollagePreflight` الذي يغطي الخانات فقط: عناصر الوضع الحر
   كانت تُطبع/تُصدَّر بلا أي حراسة، فأي تكبير لملصق على الكانفس فوق
   مقاس راسترها يخفض الدقة الفعالة بصمت.

   التصنيف (نفس عقد الكولاج):
   - blocking: مصدر غير مقروء — الناتج سيكون ناقصاً بصمت.
   - warnings: دقة فعالة منخفضة بعد التمديد على مقاسها المطبوع.
   ═══════════════════════════════════════════════════════════════ */

export interface FreeformPreflightInput {
  elements: CanvasElement[];
  /** الحجم الفيزيائي لورقة الكانفس كاملة بالمم (layout.imageWidthMM بالطباعة، pxToMm(canvas, dpi) بالتصدير) */
  canvasWidthMM: number;
  canvasHeightMM: number;
  /** أبعاد الكانفس بالبكسل — الإحداثيات النسبية للعناصر تُضرب فيها */
  canvasWidthPx: number;
  canvasHeightPx: number;
  /** أبعاد المصادر الكاملة بعد EXIF — الغياب لمصدر مستخدم = غير مقروء (حاجب) */
  imageDimensions?: ReadonlyMap<string, { width: number; height: number }>;
  /** أصغر دقة مقبولة للطباعة (افتراضي 250DPI — نفس عقد الكولاج) */
  minDpi?: number;
}

export interface FreeformPreflightIssue {
  elementId: string;
  kind: 'unreadable' | 'low-resolution';
  message: string;
}

export interface FreeformPreflightResult {
  blocking: FreeformPreflightIssue[];
  warnings: FreeformPreflightIssue[];
}

/** عناصر الصور المرئية ذات المصدر — الفحص يستهدفها حصراً */
function printableImageElements(elements: CanvasElement[]): ImageElement[] {
  return elements.filter(
    (el): el is ImageElement => el.type === 'image' && el.visible !== false && !!el.imageSrc,
  );
}

/** فحص متزامن نقي — الأبعاد تُمرَّر جاهزة من المستدعي أو من المحلل الدفعي أدناه */
export function runFreeformPreflight(input: FreeformPreflightInput): FreeformPreflightResult {
  const { elements, canvasWidthMM, canvasHeightMM, imageDimensions, minDpi = 250 } = input;
  const blocking: FreeformPreflightIssue[] = [];
  const warnings: FreeformPreflightIssue[] = [];

  if (
    !Number.isFinite(canvasWidthMM) ||
    !(canvasWidthMM > 0) ||
    !Number.isFinite(canvasHeightMM) ||
    !(canvasHeightMM > 0)
  ) {
    // هندسة غير قابلة للقياس لا تُنتج إنذارات وهمية — تُسقط بصمت كما يفعل الكولاج
    return { blocking, warnings };
  }

  for (const el of printableImageElements(elements)) {
    const src = el.imageSrc!;
    const dims = imageDimensions?.get(src);
    if (
      !dims ||
      !(dims.width > 0 && Number.isFinite(dims.width)) ||
      !(dims.height > 0 && Number.isFinite(dims.height))
    ) {
      blocking.push({
        elementId: el.id,
        kind: 'unreadable',
        message: 'عنصر صورة غير قابل للقراءة — أعد إدراجه أو استبدله',
      });
      continue;
    }

    const widthMM = el.width * canvasWidthMM;
    const heightMM = el.height * canvasHeightMM;
    if (!(widthMM > 0) || !(heightMM > 0)) continue;

    // العنصر يُمدَّد داخل مستطيله (stretch مطابق للمحرر ومسار Go) — لذا نقارن
    // كل محور من محاور المصدر بمحور الرسم الفيزيائي المقابل.
    const dpiX = dims.width / (widthMM / MM_PER_INCH);
    const dpiY = dims.height / (heightMM / MM_PER_INCH);
    const effectiveDpi = Math.min(dpiX, dpiY);
    if (Number.isFinite(effectiveDpi) && effectiveDpi < minDpi) {
      warnings.push({
        elementId: el.id,
        kind: 'low-resolution',
        message: `دقة عنصر صورة ≈ ${Math.round(effectiveDpi)}DPI (أقل من ${minDpi}) — كبّره أقل أو استبدل مصدره بدقة أعلى`,
      });
    }
  }

  return { blocking, warnings };
}

/**
 * حل أبعاد كل مصادر عناصر الصور الحرة دفعة واحدة (كاش ← Go دفعي ← فردي)
 * لتهيئة مدخل `imageDimensions` — تُستدعى مرة واحدة قبل الفحص.
 */
export async function resolveFreeformImageDimensions(
  elements: CanvasElement[],
): Promise<Map<string, { width: number; height: number }>> {
  const srcs = [
    ...new Set(
      printableImageElements(elements)
        .map((el) => el.imageSrc!)
        .filter(Boolean),
    ),
  ];
  return resolveBatchImageDimensions(srcs);
}
