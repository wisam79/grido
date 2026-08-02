import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportCanvas } from "../src/lib/export/export-image";
import { useEditorStore } from "../src/lib/editor-store";
import { computeSlotRectMM } from "../src/lib/print-layout-math";
import { calculatePrintCutLines } from "../src/lib/cut-lines-utils";

const CANVAS_W = 2480;
const CANVAS_H = 3508;

type DrawCall = { op: string; args: unknown[] };

function makeRecordingContext() {
  const calls: DrawCall[] = [];
  let strokeStyle = "";
  let fillStyle = "";
  const ctx: any = {
    calls,
    lineWidth: 0,
    _filter: "none",
    get filter() {
      return this._filter;
    },
    set filter(v: string) {
      this._filter = v;
    },
    get strokeStyle() {
      return strokeStyle;
    },
    set strokeStyle(v: string) {
      strokeStyle = v;
      calls.push({ op: "setStrokeStyle", args: [v] });
    },
    get fillStyle() {
      return fillStyle;
    },
    set fillStyle(v: string) {
      fillStyle = v;
      calls.push({ op: "setFillStyle", args: [v] });
    },
  };
  const ops = [
    "fillRect", "drawImage", "save", "restore", "translate", "rotate", "scale",
    "beginPath", "rect", "roundRect", "closePath", "clip", "moveTo", "lineTo",
    "stroke", "fill", "setLineDash",
  ];
  for (const op of ops) {
    ctx[op] = (...args: unknown[]) => {
      calls.push({ op, args });
    };
  }
  return { ctx, calls };
}

// صورة وهمية تُطلق onload فوراً — loadImage في المسار الاحتياطي تعتمد عليها
class FakeImage {
  crossOrigin = "anonymous";
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  private _src = "";
  set src(v: string) {
    this._src = v;
    setTimeout(() => this.onload?.(), 0);
  }
  get src() {
    return this._src;
  }
}

function setLicenseActive() {
  useEditorStore.setState({
    user: {
      plan: "pro",
      status: "active",
      expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
    } as never,
  });
}

function baseSlot(overrides: Record<string, unknown>) {
  return {
    id: "s1",
    x: 0,
    y: 0,
    w: 0.5,
    h: 1,
    imageSrc: "/local-image/s1.png",
    zoom: 1,
    dragX: 0,
    dragY: 0,
    flipX: false,
    flipY: false,
    rotation: 0,
    ...overrides,
  };
}

function setupCollageState(slots: unknown[]) {
  useEditorStore.setState({
    mode: "collage",
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    backgroundColor: "#ffffff",
    elements: [],
    slots,
    collageMargin: 100,
    collageGap: 50,
    collageRadius: 0,
    collageShowCutLines: true,
    collageShowEndCutLine: true,
    collageStrokeWidth: 0,
    collageStrokeColor: "#000000",
    collageTemplate: null,
  } as never);
}

// الاستدعاءات المتسلسلة moveTo → lineTo التي تشكّل خطوط القص المرسومة
function recordedCutLineSegments(calls: DrawCall[]) {
  const segments: Array<[number, number, number, number]> = [];
  let start: [number, number] | null = null;
  for (const c of calls) {
    if (c.op === "moveTo") start = [c.args[0] as number, c.args[1] as number];
    else if (c.op === "lineTo" && start) {
      segments.push([start[0], start[1], c.args[0] as number, c.args[1] as number]);
      start = null;
    }
  }
  return segments;
}

// مقاطع خطوط القص المتوقعة من المصدر المشترك بعد تقريب الرسم إلى بكسل صحيح
function expectedCutLineSegments(slots: unknown[]) {
  return calculatePrintCutLines({
    mode: "collage",
    cols: 1,
    actualCopies: 1,
    imageWidthMM: CANVAS_W,
    imageHeightMM: CANVAS_H,
    gapMM: 50,
    effectiveMarginMM: 0,
    availableWidthMM: CANVAS_W,
    availableHeightMM: CANVAS_H,
    paperWidth: CANVAS_W,
    paperHeight: CANVAS_H,
    showEndCutLine: true,
    slots,
    collageMargin: 100,
    collageGap: 50,
    canvasWidth: CANVAS_W,
    canvasHeight: CANVAS_H,
    hasPhysical: false,
  }).map((l) => [Math.round(l.x1), Math.round(l.y1), Math.round(l.x2), Math.round(l.y2)]);
}

describe("export-image manual fallback — golden tests", () => {
  let calls: DrawCall[];

  beforeEach(() => {
    useEditorStore.getState().reset();
    setLicenseActive();
    vi.clearAllMocks();
    vi.stubGlobal("Image", FakeImage);
    HTMLCanvasElement.prototype.toBlob = function (cb: any, type?: string) {
      cb(new Blob(["mock-image-data"], { type: type || "image/png" }));
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function recordContext() {
    const recorder = makeRecordingContext();
    HTMLCanvasElement.prototype.getContext = function () {
      return recorder.ctx;
    };
    calls = recorder.calls;
  }

  it("golden: slot rects and cut lines are bit-identical to shared print math", async () => {
    const slots = [
      baseSlot({ id: "s1", x: 0, y: 0, w: 0.5, h: 1 }),
      baseSlot({ id: "s2", x: 0.5, y: 0, w: 0.5, h: 1 }),
    ];
    setupCollageState(slots);
    recordContext();

    const blob = await exportCanvas("png", 0.95, null);
    expect(blob).not.toBeNull();

    // خلفية الورقة البيضاء تغطي الكانفاس كاملاً
    expect(calls.find((c) => c.op === "fillRect")).toEqual({
      op: "fillRect",
      args: [0, 0, CANVAS_W, CANVAS_H],
    });

    const translates = calls
      .filter((c) => c.op === "translate")
      .map((c) => [c.args[0], c.args[1]] as number[])
      // drawSlotImage تصدر ترجمتين لكل خانة: مركز الصندوق ثم العودة للأصل
      .filter((_, i) => i % 2 === 0);
    const drawImages = calls.filter((c) => c.op === "drawImage");

    // كل خانة مرسومة مرة واحدة (صورة + قص)
    expect(drawImages).toHaveLength(2);

    // مراكز الخانات تطابق computeSlotRectMM تماماً (x + w/2، y + h/2)
    const expectedCenters = slots.map((s: any) => {
      const r = computeSlotRectMM(
        { xMM: 0, yMM: 0 },
        { x: s.x, y: s.y, w: s.w, h: s.h },
        { widthMM: CANVAS_W, heightMM: CANVAS_H },
        { marginXMM: 100, marginYMM: 100 },
        { gapXMM: 50, gapYMM: 50 }
      );
      return [r.xMM + r.wMM / 2, r.yMM + r.hMM / 2];
    });
    expect(translates).toEqual(expectedCenters);

    // خطوط القص المرسومة تطابق calculatePrintCutLines بعد تقريب البكسل
    expect(recordedCutLineSegments(calls)).toEqual(expectedCutLineSegments(slots));
  });

  it("golden: hard-coded positions for a fixed 2-slot scenario", async () => {
    const slots = [
      baseSlot({ id: "s1", x: 0, y: 0, w: 0.5, h: 1 }),
      baseSlot({ id: "s2", x: 0.5, y: 0, w: 0.5, h: 1 }),
    ];
    setupCollageState(slots);
    recordContext();

    await exportCanvas("png", 0.95, null);

    // قيم محسوبة يدوياً: margin 100، gap 50، canvas 2480×3508
    // s1: left = 100 + 0×2280 + 25 = 125، width = 0.5×2280 − 50 = 1090
    // s2: left = 100 + 0.5×2280 + 25 = 1265
    const translates = calls
      .filter((c) => c.op === "translate")
      .map((c) => [c.args[0], c.args[1]] as number[])
      .filter((_, i) => i % 2 === 0);
    expect(translates).toEqual([
      [125 + 545, 125 + 1629], // s1 center (670, 1754)
      [1265 + 545, 125 + 1629], // s2 center (1810, 1754)
    ]);

    const segments = recordedCutLineSegments(calls);
    expect(segments).toEqual([
      [100, 100, 100, 3408], // خط رأس أول (يسار الورقة)
      [1240, 100, 1240, 3408], // منتصف الفجوة
      [2380, 100, 2380, 3408], // خط رأس أخير
      [100, 100, 2380, 100], // خط أفقي علوي
      [0, 3408, 2480, 3408], // خط نهاية منطقة الطباعة كامل العرض
    ]);

    // خط النهاية يُرسم أخيراً باللون الأزرق (السمة المميزة له)
    const strokeStyles = calls.filter((c) => c.op === "setStrokeStyle");
    expect(strokeStyles.map((c) => c.args[0])).toEqual([
      "#a0aec0",
      "#a0aec0",
      "#a0aec0",
      "#a0aec0",
      "#3182ce",
    ]);
  });

  it("behavior change: dead slots (no image, zero size) add no phantom cut lines", async () => {
    const slots = [
      baseSlot({ id: "s1", x: 0, y: 0, w: 0.5, h: 1 }),
      baseSlot({ id: "s2", x: 0.5, y: 0, w: 0.5, h: 1 }),
      { id: "dead", x: 0, y: 0, w: 0, h: 0, imageSrc: "" },
    ];
    setupCollageState(slots);
    recordContext();

    await exportCanvas("png", 0.95, null);

    // نفس الخطوط تماماً كما لو أن الخانة الميتة غير موجودة — موحّد مع المعاينة
    expect(recordedCutLineSegments(calls)).toEqual(expectedCutLineSegments(slots));
    expect(recordedCutLineSegments(calls)).toEqual([
      [100, 100, 100, 3408],
      [1240, 100, 1240, 3408],
      [2380, 100, 2380, 3408],
      [100, 100, 2380, 100],
      [0, 3408, 2480, 3408],
    ]);
  });
});
