import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { toast } from "sonner";
import {
  MAX_EXPORT_PIXELS,
  CanvasTooLargeError,
  assertExportablePixels,
} from "../src/lib/export/export-limits";
import { exportCanvas, exportSlotCanvas } from "../src/lib/export/export-image";
import { quickExportPNG } from "../src/lib/export/export-project";
import { useEditorStore } from "../src/lib/editor-store";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// صورة وهمية تُطلق onload فوراً — loadImage في تصدير الخانة المفردة تعتمد عليها
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

describe("export-limits — 50MP explicit guard", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    setLicenseActive();
    vi.clearAllMocks();
    vi.stubGlobal("Image", FakeImage);
    HTMLCanvasElement.prototype.toBlob = function (cb: any, type?: string) {
      cb(new Blob(["mock-image-data"], { type: type || "image/png" }));
    };
    HTMLCanvasElement.prototype.getContext = function () {
      return {} as never;
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("boundary: 50MP exactly passes, one pixel over throws with details", () => {
    expect(() => assertExportablePixels(5000, 10000)).not.toThrow();
    expect(5000 * 10000).toBe(MAX_EXPORT_PIXELS);

    expect(() => assertExportablePixels(5000, 10001)).toThrowError(CanvasTooLargeError);
    try {
      assertExportablePixels(5000, 10001);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CanvasTooLargeError);
      const err = e as CanvasTooLargeError;
      expect(err.width).toBe(5000);
      expect(err.height).toBe(10001);
      expect(err.pixelCount).toBe(50005000);
      expect(err.name).toBe("CanvasTooLargeError");
    }
  });

  it("exportCanvas throws CanvasTooLargeError instead of silent null", async () => {
    useEditorStore.setState({
      mode: "fitted",
      canvasWidth: 8000,
      canvasHeight: 7000, // 56MP
      backgroundColor: "#ffffff",
      elements: [],
    } as never);

    await expect(exportCanvas("png", 0.95, null)).rejects.toThrowError(CanvasTooLargeError);
  });

  it("exportSlotCanvas throws when a single slot exceeds the limit", async () => {
    useEditorStore.setState({
      mode: "collage",
      canvasWidth: 8000,
      canvasHeight: 7000, // 56MP
      backgroundColor: "#ffffff",
      slots: [
        {
          id: "s1",
          x: 0,
          y: 0,
          w: 1,
          h: 1,
          imageSrc: "/local-image/s1.png",
          zoom: 1,
          dragX: 0,
          dragY: 0,
          flipX: false,
          flipY: false,
          rotation: 0,
        },
      ],
    } as never);

    await expect(exportSlotCanvas("s1", "png", 0.95)).rejects.toThrowError(CanvasTooLargeError);
  });

  it("quickExportPNG shows the explicit size message instead of a generic one", async () => {
    useEditorStore.setState({
      mode: "fitted",
      canvasWidth: 8000,
      canvasHeight: 7000, // 56MP
      backgroundColor: "#ffffff",
      elements: [],
    } as never);
    const saveDialogSpy = vi.fn().mockResolvedValue("success");
    (window as any).go = { main: { App: { SaveFileDialog: saveDialogSpy } } };

    await quickExportPNG();

    expect(saveDialogSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("50 ميجابكسل"));
    expect(toast.error).not.toHaveBeenCalledWith("تعذر تصدير الصورة");
  });
});
