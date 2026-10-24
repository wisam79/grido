/**
 * محاكاة كانفس ثنائي الأبعاد في jsdom (jsdom لا ينفّذ Canvas فعلياً).
 * تدعم الصيغ الثلاث لـ drawImage: 3 و5 و9 وسائط.
 *
 * المصدر الوحيد لهذا المحاكي: اختبار golden للاستعدال
 * (test/scanner-warp-golden.test.ts) وwarp-pipeline.test.ts يشتركان فيه،
 * وأي تعديل هنا يغيّر مخرجات الكانفاس الملتقطة في fixtures — لا تلمسه
 * إلا مع إعادة توليد الـfixtures (FIXTURE_GEN=1).
 */

export interface MockCanvas {
  width: number;
  height: number;
  _mockData: Uint8ClampedArray;
}

export function createMockContext(canvas: MockCanvas) {
  const ensure = () => {
    const needed = (canvas.width || 1) * (canvas.height || 1) * 4;
    if (!canvas._mockData || canvas._mockData.length !== needed) {
      canvas._mockData = new Uint8ClampedArray(needed);
    }
    return canvas._mockData;
  };

  return {
    canvas,
    createImageData: (cw: number, ch: number) => ({
      data: new Uint8ClampedArray(cw * ch * 4),
      width: cw,
      height: ch,
    }),
    putImageData: (
      imgData: { data: Uint8ClampedArray; width: number; height: number },
      dx = 0,
      dy = 0,
    ) => {
      const dest = ensure();
      const destW = canvas.width || 1;
      for (let y = 0; y < imgData.height; y++) {
        for (let x = 0; x < imgData.width; x++) {
          const sIdx = (y * imgData.width + x) * 4;
          const dIdx = ((dy + y) * destW + (dx + x)) * 4;
          if (dIdx >= 0 && dIdx + 3 < dest.length) {
            dest[dIdx] = imgData.data[sIdx];
            dest[dIdx + 1] = imgData.data[sIdx + 1];
            dest[dIdx + 2] = imgData.data[sIdx + 2];
            dest[dIdx + 3] = imgData.data[sIdx + 3];
          }
        }
      }
    },
    getImageData: (sx = 0, sy = 0, sw?: number, sh?: number) => {
      const gw = sw ?? canvas.width ?? 1;
      const gh = sh ?? canvas.height ?? 1;
      const src = ensure();
      const srcW = canvas.width || 1;
      const out = new Uint8ClampedArray(gw * gh * 4);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const sIdx = ((sy + y) * srcW + (sx + x)) * 4;
          const dIdx = (y * gw + x) * 4;
          if (sIdx >= 0 && sIdx + 3 < src.length) {
            out[dIdx] = src[sIdx];
            out[dIdx + 1] = src[sIdx + 1];
            out[dIdx + 2] = src[sIdx + 2];
            out[dIdx + 3] = src[sIdx + 3];
          }
        }
      }
      return { data: out, width: gw, height: gh } as unknown as ImageData;
    },
    drawImage: (src: MockCanvas, ...args: number[]) => {
      if (!src || !src._mockData) return;
      const dest = ensure();
      const destW = canvas.width || 1;
      const srcW = src.width || 1;

      let sx = 0;
      let sy = 0;
      let sw = srcW;
      let sh = src.height || 1;
      let dx = 0;
      let dy = 0;
      let dw = sw;
      let dh = sh;

      if (args.length === 2) {
        [dx, dy] = args;
      } else if (args.length === 4) {
        [dx, dy, dw, dh] = args;
      } else if (args.length >= 8) {
        [sx, sy, sw, sh, dx, dy, dw, dh] = args;
      }

      const srcData = src._mockData;
      for (let y = 0; y < dh; y++) {
        for (let x = 0; x < dw; x++) {
          const srcX = sx + Math.floor((x * sw) / dw);
          const srcY = sy + Math.floor((y * sh) / dh);
          const sIdx = (srcY * srcW + srcX) * 4;
          const dIdx = ((dy + y) * destW + (dx + x)) * 4;
          if (sIdx >= 0 && sIdx + 3 < srcData.length && dIdx >= 0 && dIdx + 3 < dest.length) {
            dest[dIdx] = srcData[sIdx];
            dest[dIdx + 1] = srcData[sIdx + 1];
            dest[dIdx + 2] = srcData[sIdx + 2];
            dest[dIdx + 3] = srcData[sIdx + 3];
          }
        }
      }
    },
    translate: () => {},
    rotate: () => {},
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    save: () => {},
    restore: () => {},
  };
}

/** يركّب المحاكي على HTMLCanvasElement.getContext لجلسة الاختبار كلها. */
export function installScannerCanvasMock(): void {
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).getContext = function (
    this: HTMLCanvasElement,
  ) {
    const mock = this as unknown as MockCanvas;
    mock._mockData = mock._mockData ?? new Uint8ClampedArray(0);
    return createMockContext(mock);
  };
}

/** كانفاس مصدر بتعبئة لون واحدة. */
export function makeSourceCanvas(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): MockCanvas {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = rgba[0];
    data[i * 4 + 1] = rgba[1];
    data[i * 4 + 2] = rgba[2];
    data[i * 4 + 3] = rgba[3];
  }
  return attachContext({ width, height, _mockData: data });
}

/** كانفاس مصدر من مصفوفة RGBA خام (طول w*h*4). */
export function makeRgbaCanvas(width: number, height: number, rgba: Uint8ClampedArray): MockCanvas {
  if (rgba.length !== width * height * 4) {
    throw new Error(`makeRgbaCanvas: expected ${width * height * 4} bytes, got ${rgba.length}`);
  }
  return attachContext({ width, height, _mockData: new Uint8ClampedArray(rgba) });
}

/** يزوّد كائن المحاكي بـgetContext حتى تعمل عليه الدوال المشتركة (كالفلاتر). */
function attachContext(canvas: MockCanvas): MockCanvas {
  Object.defineProperty(canvas, 'getContext', {
    value: () => createMockContext(canvas),
    enumerable: false,
  });
  return canvas;
}
