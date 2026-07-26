import Konva from "konva";

// تسجيل فلتر مخصص لتنعيم وتجميل البشرة ذكياً (Skin-Aware Bilateral-Like Smoothing Filter)
if (typeof Konva !== "undefined" && Konva.Filters) {
  (Konva.Filters as any).SkinGlow = function (this: any, imageData: ImageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const len = width * height;

    // حساب مسبق لعلامة لون البشرة — Uint8Array بدلاً من Uint8Array كامل
    const isSkin = new Uint8Array(len);
    let skinCount = 0;
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r > 95 && g > 40 && b > 20 && r > g && r > b) {
        const min = g < b ? g : b;
        if (r - min > 15 && r - g > 15) {
          isSkin[i] = 1;
          skinCount++;
        }
      }
    }

    // إذا كانت البيكسلات القليلة جداً، لا داعي للمعالجة
    if (skinCount < len * 0.01) return;

    // نسخة مصغرة — RGB فقط (3 قنوات بدلاً من 4) لتوفير 25% من الذاكرة
    const rgbBuffer = new Uint8Array(len * 3);
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const bufIdx = i * 3;
      rgbBuffer[bufIdx] = data[idx];
      rgbBuffer[bufIdx + 1] = data[idx + 1];
      rgbBuffer[bufIdx + 2] = data[idx + 2];
    }

    // تطبيق فلتر التنعيم الانتقائي (Selective Box Blur)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const i = y * width + x;
        if (isSkin[i] === 0) continue;

        const idx = i * 4;
        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ni = (y + dy) * width + (x + dx);
            if (isSkin[ni] === 1) {
              const nBufIdx = ni * 3;
              sumR += rgbBuffer[nBufIdx];
              sumG += rgbBuffer[nBufIdx + 1];
              sumB += rgbBuffer[nBufIdx + 2];
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
  };
}
