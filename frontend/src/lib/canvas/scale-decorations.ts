import type { CanvasElement } from "@/lib/store/types";

// الزخارف (حد/ظل/استدارة) مخزنة بكسل مطلق بينما الهندسة نسبية (0..1) — عند أي
// تحجيم يجب قياسها بالنسبة نفسها حتى تبقى متناسبة مع العنصر (WYSIWYG عبر
// الطباعة والتصدير). النص والخط المستقيم يتبعان محور Y اتساقاً مع fontSize،
// وغيرهما المتوسط الهندسي للمحورين ليكون التكبير المنتظم دقيقاً.

const round1 = (v: number) => Math.round(v * 10) / 10;

export function scaleElementDecorations(
  el: CanvasElement,
  absScaleX: number,
  absScaleY: number
): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  const isLineShape = el.type === "shape" && el.shape === "line";
  const factor =
    el.type === "text" || isLineShape
      ? Math.abs(absScaleY)
      : Math.sqrt(Math.abs(absScaleX * absScaleY));

  if (!Number.isFinite(factor) || factor <= 0 || Math.abs(factor - 1) <= 0.001) {
    return out;
  }

  // تقريب إلى منزلة واحدة يمنع تسرّب كسور عائمة طويلة إلى الحالة ولوحة الخصائص
  const scaleDeco = (v: number | undefined): number | undefined =>
    v === undefined ? undefined : Math.max(0, round1(v * factor));
  // سمك الحد يلتزم شبكة سلايدره (خطوة 0.5)
  const scaleStroke = (v: number | undefined): number | undefined =>
    v === undefined ? undefined : Math.max(0.5, Math.round(v * factor * 2) / 2);

  if (el.shadowBlur) out.shadowBlur = scaleDeco(el.shadowBlur);
  if (el.shadowOffsetX) out.shadowOffsetX = scaleDeco(el.shadowOffsetX);
  if (el.shadowOffsetY) out.shadowOffsetY = scaleDeco(el.shadowOffsetY);
  if (el.cornerRadius) out.cornerRadius = scaleDeco(el.cornerRadius);

  // حد بسمك 0 يعني «بلا حدود» — أرضية 0.5 تمنع اختفاءه بصرياً
  if (el.type === "shape") {
    if (el.strokeWidth) out.strokeWidth = scaleStroke(el.strokeWidth);
    if (el.radius) out.radius = scaleDeco(el.radius);
  } else if (el.type === "text") {
    if (el.strokeWidth) out.strokeWidth = scaleStroke(el.strokeWidth);
    if (el.textBgBorderWidth) out.textBgBorderWidth = scaleDeco(el.textBgBorderWidth);
    if (el.textBgRadius) out.textBgRadius = scaleDeco(el.textBgRadius);
  }
  return out;
}
