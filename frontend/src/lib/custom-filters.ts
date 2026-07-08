import Konva from "konva";

// تسجيل فلتر مخصص لتنعيم وتجميل البشرة ذكياً (Skin-Aware Bilateral-Like Smoothing Filter)
if (typeof Konva !== "undefined" && Konva.Filters) {
  (Konva.Filters as any).SkinGlow = function (this: any, imageData: ImageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // ذاكرة وسيطة لقراءة البيكسلات الأصلية دون تغيير أثناء المعالجة
    const buffer = new Uint8ClampedArray(data);

    // دالة تحقق ذكية لتحديد ما إذا كان البيكسل يمثل لون بشرة بشرية (Human Skin-Tone Heuristics)
    // تعتمد على النطاق اللوني القياسي في فضاء الألوان RGB لتمييز الوجوه بدقة
    function isSkinColor(r: number, g: number, b: number): boolean {
      return r > 95 && g > 40 && b > 20 &&
             (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
             Math.abs(r - g) > 15 &&
             r > g && r > b;
    }

    // تطبيق فلتر التنعيم الانتقائي (Selective Box Blur) على البشرة فقط لحفظ التفاصيل الأخرى كالعينين والشفاه والشعر حادة
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const r = buffer[idx];
        const g = buffer[idx + 1];
        const b = buffer[idx + 2];

        if (isSkinColor(r, g, b)) {
          let sumR = 0, sumG = 0, sumB = 0, count = 0;

          // فحص النطاق المحيط 3x3
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              const nr = buffer[nIdx];
              const ng = buffer[nIdx + 1];
              const nb = buffer[nIdx + 2];

              // دمج جيران البشرة فقط وتخطي العناصر غير البشرية (مثل الشعر أو الحواجب أو الخلفية) لمنع تداخل ألوانها مع الوجه
              if (isSkinColor(nr, ng, nb)) {
                sumR += nr;
                sumG += ng;
                sumB += nb;
                count++;
              }
            }
          }

          if (count > 0) {
            data[idx] = Math.round(sumR / count);
            data[idx + 1] = Math.round(sumG / count);
            data[idx + 2] = Math.round(sumB / count);
          }
        }
      }
    }
  };
}
