import type Konva from "konva";

/**
 * إطفاء الظلال أثناء السحب بلا حالة React (و بلا إعادة رسم).
 *
 * تمريرة الضبابية خارج الشاشة (offscreen blur) هي أغلى عملية رسم لكل
 * إطار أثناء السحب/التحويل. هذا المساعد يطفئ `shadowEnabled` على كامل
 * الشجرة الفرعية عند بدء السحب ويعيدها عند انتهائه — مع صمام أمان
 * (`pointerup`/`blur` لمرة واحدة) لأن Konva قد لا يطلق `dragend` إن انتهى
 * السحب خارج النافذة أو فقد التطبيق التركيز.
 */

type ShadowRoot = Konva.Container | null | undefined;

export function setSubtreeShadows(root: ShadowRoot, enabled: boolean): void {
  if (!root || typeof root.find !== "function") return;
  try {
    root.find("Shape").forEach((s) => {
      const shape = s as unknown as { shadowEnabled?: (v: boolean) => void };
      if (typeof shape.shadowEnabled === "function") shape.shadowEnabled(enabled);
    });
  } catch {
    // تجاهل آمن — الظل تحسين بصري وليس شرطاً للرسم
  }
}

export function withShadowlessDrag<E>(
  getRoot: () => ShadowRoot,
  onStart: (e: E) => void,
  onEnd: (e: E) => void
): { handleStart: (e: E) => void; handleEnd: (e: E) => void } {
  const restore = () => setSubtreeShadows(getRoot(), true);
  const handleStart = (e: E) => {
    setSubtreeShadows(getRoot(), false);
    if (typeof window !== "undefined") {
      window.addEventListener("pointerup", restore, { once: true });
      window.addEventListener("blur", restore, { once: true });
    }
    onStart(e);
  };
  const handleEnd = (e: E) => {
    restore();
    onEnd(e);
  };
  return { handleStart, handleEnd };
}
