import { describe, it, expect } from 'vitest';
import { clampStagePos } from '../src/components/editor/canvas/use-canvas-viewport';

describe('use-canvas-viewport — clampStagePos boundaries', () => {
  it('wheel mode: يثبّت الورقة في المنتصف تماماً عندما تكون أصغر من النافذة أو تلائمها', () => {
    const viewportW = 1000;
    const viewportH = 800;
    const displayW = 600;
    const displayH = 500;

    // محاولة التمرير بعيداً بعجلة الفأرة العادية
    const scrolledAway = { x: -500, y: -2000 };
    const clamped = clampStagePos(scrolledAway, displayW, displayH, viewportW, viewportH, 'wheel');

    // يجب أن تبقى في المنتصف بالضبط
    expect(clamped.x).toBe((viewportW - displayW) / 2); // 200
    expect(clamped.y).toBe((viewportH - displayH) / 2); // 150
  });

  it('wheel mode: يسمح بالتمرير الرأسي فقط بين أعلى وأسفل الورقة عندما تكون أطول من النافذة', () => {
    const viewportW = 1000;
    const viewportH = 800;
    const displayW = 600;
    const displayH = 1600; // أطول من النافذة بمرتين

    // التمرير لأعلى نقطة (تجاوز السقف)
    const topExcess = clampStagePos(
      { x: 200, y: 500 },
      displayW,
      displayH,
      viewportW,
      viewportH,
      'wheel',
    );
    expect(topExcess.y).toBe(40); // لا يتجاوز هامش 40px من الأعلى

    // التمرير لأسفل نقطة (تجاوز القاع)
    const bottomExcess = clampStagePos(
      { x: 200, y: -2500 },
      displayW,
      displayH,
      viewportW,
      viewportH,
      'wheel',
    );
    // minY = viewportH - displayH - 40 = 800 - 1600 - 40 = -840
    expect(bottomExcess.y).toBe(-840);

    // التمرير في المنتصف يُقبل كما هو
    const midScroll = clampStagePos(
      { x: 200, y: -400 },
      displayW,
      displayH,
      viewportW,
      viewportH,
      'wheel',
    );
    expect(midScroll.y).toBe(-400);
  });

  it('freePan mode: يمنع هروب الورقة كلياً خارج حدود الشاشة عند التحريك الحر بمفتاح المسافة', () => {
    const viewportW = 1200;
    const viewportH = 900;
    const displayW = 800;
    const displayH = 600;

    // محاولة رمي الورقة لليسار في الفراغ اللانهائي
    const farLeft = clampStagePos(
      { x: -10000, y: 150 },
      displayW,
      displayH,
      viewportW,
      viewportH,
      'freePan',
    );
    // minX = 150 - displayW = 150 - 800 = -650
    expect(farLeft.x).toBe(-650);
    // الورقة تحتفظ بـ 150px مرئية على يسار الشاشة (-650 + 800 = 150px)
    expect(farLeft.x + displayW).toBe(150);

    // محاولة رمي الورقة لليمين في الفراغ اللانهائي
    const farRight = clampStagePos(
      { x: 10000, y: 150 },
      displayW,
      displayH,
      viewportW,
      viewportH,
      'freePan',
    );
    // maxX = viewportW - 150 = 1200 - 150 = 1050
    expect(farRight.x).toBe(1050);

    // محاولة رمي الورقة لأعلى في الفراغ اللانهائي
    const farTop = clampStagePos(
      { x: 200, y: -10000 },
      displayW,
      displayH,
      viewportW,
      viewportH,
      'freePan',
    );
    expect(farTop.y + displayH).toBe(150);

    // محاولة رمي الورقة لأسفل في الفراغ اللانهائي
    const farBottom = clampStagePos(
      { x: 200, y: 10000 },
      displayW,
      displayH,
      viewportW,
      viewportH,
      'freePan',
    );
    expect(farBottom.y).toBe(viewportH - 150);
  });

  it('KonvaOverlayLayer: يتم تصدير مكوّن الطبقة التفاعلية العلوية بنجاح لفصل الأدوات عن المحتوى', async () => {
    const { KonvaOverlayLayer } =
      await import('../src/components/editor/konva/layers/konva-overlay-layer');
    expect(KonvaOverlayLayer).toBeDefined();
    expect(typeof KonvaOverlayLayer).toBe('object'); // React.memo component
  });
});
