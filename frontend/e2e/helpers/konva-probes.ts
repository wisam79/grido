import type { Page } from '@playwright/test';

/**
 * مجسّات حالة Konva عبر المرجع المكشوف window.__gridoStage
 * (يضبطه konva-canvas.tsx بعد تهيئة المسرح) — للتحقق من أثر فعلي
 * على عقد الكانفاس بدل الاكتفاء بثبات الواجهة.
 */

interface StageLike {
  find: (selector: string) => unknown[];
}

/** مصادر صور الكانفس (src لكل عقدة Image) — يكشف استبدال صورة عنصر فعلياً */
export function stageImageSources(page: Page): Promise<string> {
  return page.evaluate(() => {
    const stage = (window as unknown as { __gridoStage?: StageLike }).__gridoStage;
    if (!stage) return '';
    return stage
      .find('Image')
      .map((node) => {
        const attrs = (node as { attrs?: { image?: { src?: string }; src?: string } }).attrs;
        return attrs?.image?.src ?? attrs?.src ?? '';
      })
      .join('|');
  });
}

/** عدد عقد النص على الكانفس — يكشف إدراج نصاً أو التراجع عنه فعلياً (-1 بلا مسرح) */
export function stageTextCount(page: Page): Promise<number> {
  return page.evaluate(() => {
    const stage = (window as unknown as { __gridoStage?: StageLike }).__gridoStage;
    return stage ? stage.find('Text').length : -1;
  });
}
