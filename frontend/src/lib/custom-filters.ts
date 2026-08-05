import Konva from "konva";

// تسجيل فلتر مخصص لتنعيم وتجميل البشرة ذكياً (Skin Glow & Smooth Filter)
if (typeof Konva !== "undefined" && Konva.Filters) {
  (Konva.Filters as any).SkinGlow = function (this: any, imageData: ImageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const len = width * height;

    const isSkin = new Uint8Array(len);
    let skinCount = 0;
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      // نطاق لون البشرة الشامل والمتوافق مع مختلف درجات الإضاءة
      if (r > 60 && g > 35 && b > 15 && r > g && (r - Math.min(g, b)) > 8) {
        isSkin[i] = 1;
        skinCount++;
      }
    }

    if (skinCount === 0) return;

    const rgbBuffer = new Uint8Array(len * 3);
    for (let i = 0; i < len; i++) {
      const idx = i * 4;
      const bufIdx = i * 3;
      rgbBuffer[bufIdx] = data[idx];
      rgbBuffer[bufIdx + 1] = data[idx + 1];
      rgbBuffer[bufIdx + 2] = data[idx + 2];
    }

    // تنعيم وإشراق دقيق بنطاق 2 بكسل لشكل البشرة النضر
    const R = 2;
    for (let y = R; y < height - R; y += 1) {
      const rowOffset = y * width;
      for (let x = R; x < width - R; x += 1) {
        const i = rowOffset + x;
        if (isSkin[i] === 0) continue;

        const idx = i * 4;
        let sumR = 0, sumG = 0, sumB = 0, count = 0;

        for (let dy = -R; dy <= R; dy++) {
          const nRow = (y + dy) * width;
          for (let dx = -R; dx <= R; dx++) {
            const ni = nRow + (x + dx);
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
          const avgR = sumR / count;
          const avgG = sumG / count;
          const avgB = sumB / count;
          // دمج تنعيم إشراقة النضارة + تعزيز تورّد البشرة الطبيعي
          data[idx] = Math.min(255, Math.round(data[idx] * 0.35 + avgR * 0.65 + 6));
          data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * 0.35 + avgG * 0.65 + 4));
          data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * 0.35 + avgB * 0.65 + 2));
        }
      }
    }
  };
}
