import Konva from "konva";

// سبيا بنسبة شدة (0..1) مطابقة تماماً لـ CSS filter: sepia(N%) وهي المرجع
// المشترك للمعاينة والطباعة والتصدير. فلتر Konva المدمج Sepia يكون بكامل
// الشدة دائماً ولا يقبل نسبة — كان يجعل المحرر يظهر سبياً أقوى من المطبوع.
// تُقرأ الشدة من خاصية العقدة sepiaRatio (Konva يستدعي الفلتر بـ this = العقدة).
if (typeof Konva !== "undefined" && Konva.Filters) {
  (Konva.Filters as unknown as Record<string, unknown>).SepiaBlend = function (this: Konva.Node & { sepiaRatio?: () => number }, imageData: ImageData) {
    const ratio = Math.max(0, Math.min(1, Number(this.sepiaRatio?.() ?? 1)));
    if (!ratio || ratio <= 0) return;
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      // مصفوفة sepia القياسية ذاتها المستخدمة في CSS وفي مسار Go (applySepiaRatio)
      const tr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
      const tg = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      const tb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
      d[i] = r + (tr - r) * ratio;
      d[i + 1] = g + (tg - g) * ratio;
      d[i + 2] = b + (tb - b) * ratio;
    }
  };
}
