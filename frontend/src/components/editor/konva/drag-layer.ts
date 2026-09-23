import type Konva from "konva";

/**
 * طبقة السحب الرسمية (Official Drag-Layer Pattern).
 *
 * المصدر: توثيق Konva الرسمي — «Optimise dragging costs: move the shape
 * to a dedicated layer while dragging, then move it back at drag end»
 * (konvajs.org/docs/performance/All_Performance_Tips.html).
 *
 * قبل هذا النمط كان كل حدث سحب يعيد رسم الطبقة كاملة (كل العقد) عبر
 * `getLayer().batchDraw()`. الآن تُرفع العقدة المسحوبة (+ المحوّل والشارة)
 * إلى طبقة سحب خفيفة، فيُعاد رسم عقدة واحدة فقط لكل إطار، وتُعاد الطبقة
 * الأصلية مرة واحدة عند بدء السحب ومرة عند انتهائه.
 *
 * ضمانات السلامة:
 * - كل الطبقات بلا تحويلات (identity) في Grido، فالإحداثيات المطلقة
 *   محفوظة عند النقل بين الطبقات.
 * - الترتيب العمقي (zIndex) والأب الأصلي محفوظان ويُستعادان بدقة.
 * - الاستعادة تتم قبل كتابة الـ store في onDragEnd، فلا ترى React
 *   العقد خارج موضعها المعلن أبداً.
 * - عقد بلا مسرح (unmounted أثناء السحب) تُتجاهل ولا تُعاد إضافتها.
 */

let dragLayer: Konva.Layer | null = null;
let extrasProvider: (() => Konva.Node[]) | null = null;
const home = new Map<Konva.Node, { parent: Konva.Container; index: number }>();
const touchedLayers = new Set<Konva.Layer>();

export function registerDragLayer(layer: Konva.Layer | null): void {
  dragLayer = layer;
  if (!layer) {
    home.clear();
    touchedLayers.clear();
  }
}

export function registerDragExtrasProvider(provider: (() => Konva.Node[]) | null): void {
  extrasProvider = provider;
}

function redrawTouched(): void {
  try {
    touchedLayers.forEach((l) => l.batchDraw());
    dragLayer?.batchDraw();
  } catch {
    // تجاهل آمن — الرسم تحسين وليس شرطاً للسلامة
  }
  touchedLayers.clear();
}

/**
 * يصعد من العقدة إلى جذر السحب: في الوضع الحر عقدة العنصر (ابن الطبقة
 * مباشرة)، وفي الكولاج مجموعة الخانة `slot-<id>` (تحمل القص clip معها).
 */
export function findLiftRoot(node: Konva.Node | null | undefined): Konva.Node | null {
  if (!node) return null;
  let last: Konva.Node = node;
  let cur: Konva.Node | null | undefined = node;
  while (cur) {
    if (typeof cur.id === "function" && cur.id().startsWith("slot-")) {
      last = cur;
      break;
    }
    const parent = typeof cur.getParent === "function" ? cur.getParent() : null;
    if (!parent || (typeof parent.getClassName === "function" && parent.getClassName() === "Layer")) {
      break;
    }
    last = cur;
    cur = parent as Konva.Node;
  }
  return last;
}

function liftOne(node: Konva.Node | null | undefined): void {
  if (!node || !dragLayer) return;
  if (home.has(node)) return;
  const parent = typeof node.getParent === "function" ? node.getParent() : null;
  if (!parent || parent === (dragLayer as unknown as Konva.Container)) return;
  home.set(node, { parent: parent as unknown as Konva.Container, index: node.zIndex() });
  const homeLayer = node.getLayer();
  if (homeLayer) touchedLayers.add(homeLayer);
  node.moveTo(dragLayer);
}

/**
 * يرفع العقد إلى طبقة السحب. يعيد true إن تم الرفع فعلاً.
 */
export function liftToDragLayer(nodes: (Konva.Node | null | undefined)[]): boolean {
  if (!dragLayer || nodes.length === 0) return false;
  for (const n of nodes) liftOne(n);
  const extras = extrasProvider?.() ?? [];
  for (const n of extras) liftOne(n);
  if (home.size === 0) return false;
  redrawTouched();
  return true;
}

/**
 * يعيد كل العقد المرفوعة إلى آبائها وترتيبها الأصلي. يُستدعى أولاً في
 * onDragEnd قبل أي كتابة للـ store.
 */
export function dropFromDragLayer(): void {
  if (home.size === 0) return;
  home.forEach((h, n) => {
    try {
      // عقدة بلا مسرح تعني unmount أثناء السحب — لا تعيد إضافتها أبداً.
      if (typeof n.getStage !== "function" || !n.getStage()) return;
      n.moveTo(h.parent);
      n.zIndex(h.index);
      const layer = n.getLayer();
      if (layer) touchedLayers.add(layer);
    } catch {
      // تجاهل آمن لعقدة ميتة
    }
  });
  home.clear();
  redrawTouched();
}
