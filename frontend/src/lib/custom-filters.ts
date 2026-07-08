import Konva from "konva";

// تسجيل فلتر مخصص لتنعيم وتجميل البشرة ذكياً (Skin-Aware Bilateral-Like Smoothing Filter)
if (typeof Konva !== "undefined" && Konva.Filters) {
  (Konva.Filters as any).SkinGlow = function (this: any, imageData: ImageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // ذاكرة وسيطة لقراءة البيكسلات الأصلية دون تغيير أثناء المعالجة
    const buffer = new Uint8ClampedArray(data);

    // دالة تحقق ذكية ومحسنة لتحديد ما إذا كان البيكسل يمثل لون بشرة بشرية (Human Skin-Tone Heuristics)
    function isSkinColor(r: number, g: number, b: number): boolean {
      if (r <= 95 || g <= 40 || b <= 20 || r <= g || r <= b) {
        return false;
      }
      const min = g < b ? g : b;
      return r - min > 15 && r - g > 15;
    }

    // حساب مسبق لعلامة لون البشرة لكل البيكسلات لمنع العمليات المكررة
    const isSkin = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      if (isSkinColor(buffer[idx], buffer[idx + 1], buffer[idx + 2])) {
        isSkin[i] = 1;
      }
    }

    // تطبيق فلتر التنعيم الانتقائي (Selective Box Blur) باستخدام الحسابات المسبقة وتقسيم الأعداد الصحيحة السريع
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (isSkin[i] === 1) {
          const idx = i * 4;
          let sumR = 0, sumG = 0, sumB = 0, count = 0;

          // فحص النطاق المحيط 3x3
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const ni = (y + dy) * width + (x + dx);
              if (isSkin[ni] === 1) {
                const nIdx = ni * 4;
                sumR += buffer[nIdx];
                sumG += buffer[nIdx + 1];
                sumB += buffer[nIdx + 2];
                count++;
              }
            }
          }

          if (count > 0) {
            data[idx] = (sumR / count) | 0;
            data[idx + 1] = (sumG / count) | 0;
            data[idx + 2] = (sumB / count) | 0;
          }
        }
      }
    }
  };
}
