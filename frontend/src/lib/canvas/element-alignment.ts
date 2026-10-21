/**
 * element-alignment.ts — دوال حسابية نقية لمحاذاة وتوزيع عناصر الكانفاس
 *
 * مسؤولية أحادية: حساب إزاحات المحاذاة (اليسار، المنتصف، اليمين، الأعلى، الوسط، الأسفل)
 * وتوزيع المسافات بالتساوي أفقياً وعمودياً مع دعم المجموعات الذرية (Groups).
 * مستخرج من element-slice.ts لتحقيق النقاء الحسابي وقابلية الفحص الآلي المستقل.
 */

import { getElementVisualBox } from './element-geometry';

import type { CanvasElement } from '../store/types';

export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
export type DistributionAxis = 'horizontal' | 'vertical';

export interface ElementPatch {
  id: string;
  patch: Partial<CanvasElement>;
}

/**
 * حساب ترقيعات المحاذاة لمجموعة عناصر مستهدفة
 */
export function calculateAlignmentPatches(
  elements: CanvasElement[],
  targetIds: string[],
  alignment: AlignmentType,
  canvasWidth: number,
  canvasHeight: number,
): ElementPatch[] {
  const elementsToAlign = elements.filter(
    (e: CanvasElement) => targetIds.includes(e.id) && !e.locked,
  );
  if (elementsToAlign.length === 0) return [];

  // تقسيم العناصر إلى وحدات منطقية (مجموعات متماسكة أو عناصر مفردة)
  const unitMap = new Map<string, CanvasElement[]>();
  let ungroupedCounter = 0;

  elementsToAlign.forEach((el) => {
    const key = el.groupId ? `group_${el.groupId}` : `single_${ungroupedCounter++}`;
    if (!unitMap.has(key)) {
      unitMap.set(key, []);
    }
    unitMap.get(key)!.push(el);
  });

  const units = Array.from(unitMap.values());
  const isSingleUnit = units.length === 1;

  const getBox = (e: CanvasElement) => getElementVisualBox(e, canvasWidth, canvasHeight);

  let overallMinX = Math.min(...elementsToAlign.map((e) => getBox(e).x));
  let overallMaxX = Math.max(
    ...elementsToAlign.map((e) => {
      const b = getBox(e);
      return b.x + b.width;
    }),
  );
  let overallMinY = Math.min(...elementsToAlign.map((e) => getBox(e).y));
  let overallMaxY = Math.max(
    ...elementsToAlign.map((e) => {
      const b = getBox(e);
      return b.y + b.height;
    }),
  );

  if (isSingleUnit) {
    // محاذاة الوحدة الواحدة بالنسبة لحدود الكانفس الكاملة (0..1)
    overallMinX = 0;
    overallMaxX = 1;
    overallMinY = 0;
    overallMaxY = 1;
  }

  const overallCenterX = (overallMinX + overallMaxX) / 2;
  const overallCenterY = (overallMinY + overallMaxY) / 2;

  const patches: ElementPatch[] = [];

  units.forEach((unitElements) => {
    const uMinX = Math.min(...unitElements.map((e) => getBox(e).x));
    const uMaxX = Math.max(
      ...unitElements.map((e) => {
        const b = getBox(e);
        return b.x + b.width;
      }),
    );
    const uMinY = Math.min(...unitElements.map((e) => getBox(e).y));
    const uMaxY = Math.max(
      ...unitElements.map((e) => {
        const b = getBox(e);
        return b.y + b.height;
      }),
    );
    const uWidth = uMaxX - uMinX;
    const uHeight = uMaxY - uMinY;

    let dx = 0;
    let dy = 0;

    switch (alignment) {
      case 'left':
        dx = overallMinX - uMinX;
        break;
      case 'center':
        dx = overallCenterX - uWidth / 2 - uMinX;
        break;
      case 'right':
        dx = overallMaxX - uWidth - uMinX;
        break;
      case 'top':
        dy = overallMinY - uMinY;
        break;
      case 'middle':
        dy = overallCenterY - uHeight / 2 - uMinY;
        break;
      case 'bottom':
        dy = overallMaxY - uHeight - uMinY;
        break;
    }

    unitElements.forEach((el) => {
      patches.push({
        id: el.id,
        patch: {
          x: el.x + dx,
          y: el.y + dy,
        },
      });
    });
  });

  return patches;
}

interface Unit {
  ids: string[];
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * حساب ترقيعات التوزيع المتساوي لمسافات العناصر (3 عناصر على الأقل)
 */
export function calculateDistributionPatches(
  elements: CanvasElement[],
  targetIds: string[],
  axis: DistributionAxis,
  canvasWidth: number,
  canvasHeight: number,
): ElementPatch[] {
  if (targetIds.length < 3) return [];

  const elementsToDistribute = elements.filter(
    (e: CanvasElement) => targetIds.includes(e.id) && !e.locked,
  );
  if (elementsToDistribute.length < 3) return [];

  const getBox = (e: CanvasElement) => getElementVisualBox(e, canvasWidth, canvasHeight);

  // تقسيم العناصر إلى وحدات ذرية (مجموعة متماسكة واحدة أو عنصر مفرد) —
  // التوزيع الفردي كان يشتت عناصر المجموعة الواحدة بين بقية العناصر
  const unitMap = new Map<string, CanvasElement[]>();
  let ungroupedCounter = 0;
  elementsToDistribute.forEach((el) => {
    const key = el.groupId ? `group_${el.groupId}` : `single_${ungroupedCounter++}`;
    const bucket = unitMap.get(key) ?? [];
    bucket.push(el);
    unitMap.set(key, bucket);
  });

  const units: Unit[] = Array.from(unitMap.values()).map((unitElements) => {
    const boxes = unitElements.map((e) => getBox(e));
    return {
      ids: unitElements.map((e) => e.id),
      minX: Math.min(...boxes.map((b) => b.x)),
      minY: Math.min(...boxes.map((b) => b.y)),
      maxX: Math.max(...boxes.map((b) => b.x + b.width)),
      maxY: Math.max(...boxes.map((b) => b.y + b.height)),
    };
  });

  if (units.length < 3) return [];

  const patches: ElementPatch[] = [];

  if (axis === 'horizontal') {
    const sorted = [...units].sort((a, b) => a.minX - b.minX);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const totalSpan = last.maxX - first.minX;
    const totalWidths = sorted.reduce((sum, u) => sum + (u.maxX - u.minX), 0);
    const gap = (totalSpan - totalWidths) / (sorted.length - 1);

    let currentX = first.minX;
    sorted.forEach((u, index) => {
      const dx = currentX - u.minX;
      if (dx !== 0 && index > 0 && index < sorted.length - 1) {
        const unitElements = elementsToDistribute.filter((e) => u.ids.includes(e.id));
        unitElements.forEach((el) => {
          patches.push({ id: el.id, patch: { x: el.x + dx } });
        });
      }
      currentX += u.maxX - u.minX + gap;
    });

    return patches;
  }

  const sorted = [...units].sort((a, b) => a.minY - b.minY);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const totalSpan = last.maxY - first.minY;
  const totalHeights = sorted.reduce((sum, u) => sum + (u.maxY - u.minY), 0);
  const gap = (totalSpan - totalHeights) / (sorted.length - 1);

  let currentY = first.minY;
  sorted.forEach((u, index) => {
    const dy = currentY - u.minY;
    if (dy !== 0 && index > 0 && index < sorted.length - 1) {
      const unitElements = elementsToDistribute.filter((e) => u.ids.includes(e.id));
      unitElements.forEach((el) => {
        patches.push({ id: el.id, patch: { y: el.y + dy } });
      });
    }
    currentY += u.maxY - u.minY + gap;
  });

  return patches;
}
