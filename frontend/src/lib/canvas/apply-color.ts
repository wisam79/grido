import type { CanvasElement } from "@/lib/store/types";

/* ═══════════════════════════════════════════════════════════════
   تطبيق لون على أي نوع عنصر — كان منطق الشرط الثلاثي هذا مكرّراً
   في كل لوحة ألوان، وهو ما جعل بعض اللوحات تُلوّن النصوص فقط.
   ═══════════════════════════════════════════════════════════════ */

/** الحقل الذي يحمل اللون في كل نوع عنصر (النص: color، الشكل: fill، الصورة: bgColor) */
export function colorFieldFor(element: CanvasElement): "color" | "fill" | "bgColor" {
  if (element.type === "text") return "color";
  if (element.type === "shape") return "fill";
  return "bgColor";
}

/** التعديل اللازم لتلوين العنصر — الشكل يُعاد إلى تعبئة صلبة حتى لا يخفي التدرج اللون الجديد */
export function colorPatchFor(element: CanvasElement, color: string): Partial<CanvasElement> {
  if (element.type === "text") return { color };
  if (element.type === "shape") return { fill: color, fillType: "solid" };
  return { bgColor: color };
}
