import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportCanvas, downloadBlob, quickExportPNG } from "../src/lib/export";
import { useEditorStore } from "../src/lib/editor-store";
import { toast } from "sonner";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("export-utils - Image/Project Export Utilities Tests", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    useEditorStore.setState({
      user: {
        plan: 'pro',
        status: 'active',
        expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
      } as any
    });
    vi.clearAllMocks();

    // Mock Canvas context and toBlob for jsdom compatibility
    HTMLCanvasElement.prototype.toBlob = function(callback: any, type?: string, quality?: any) {
      callback(new Blob(["mock-image-data"], { type: type || "image/png" }));
    };
    HTMLCanvasElement.prototype.getContext = function() {
      return {
        fillRect: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        beginPath: () => {},
        rect: () => {},
        strokeRect: () => {},
        fillText: () => {},
        ellipse: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        closePath: () => {},
        roundRect: () => {},
      } as any;
    };
  });

  it("should fall back to manual canvas when stageRef is absent", async () => {
    // Mock HTMLCanvasElement to prevent actually rendering, but verify fallback gets triggered
    const spy = vi.spyOn(document, "createElement");
    
    // We expect exportCanvas to execute fallback logic using document.createElement("canvas")
    const blob = await exportCanvas("png", 0.95, null);
    
    expect(spy).toHaveBeenCalledWith("canvas");
    expect(blob).toBeInstanceOf(Blob);
    spy.mockRestore();
  });

  it("should call SaveFileDialog during downloadBlob for image files", async () => {
    const mockSaveFileDialog = vi.fn().mockResolvedValue("success");
    // Inject custom mock for SaveFileDialog in the Wails global object
    (window as any).go.main.App.SaveFileDialog = mockSaveFileDialog;

    const blob = new Blob(["mock-image-data"], { type: "image/png" });
    const result = await downloadBlob(blob, "photo.png");

    expect(mockSaveFileDialog).toHaveBeenCalled();
    expect(result).toBe("success");
  });

  it("should trigger toast notifications for quickExportPNG success, cancel, and failures", async () => {
    const mockSaveFileDialog = vi.fn().mockResolvedValue("success");
    (window as any).go.main.App.SaveFileDialog = mockSaveFileDialog;

    // Case 1: Success
    await quickExportPNG();
    expect(toast.success).toHaveBeenCalledWith("تم تصدير الصورة بنجاح");

    // Case 2: SaveFileDialog returns error
    vi.clearAllMocks();
    mockSaveFileDialog.mockResolvedValue("error");
    await quickExportPNG();
    expect(toast.error).toHaveBeenCalledWith("فشل تصدير الصورة");
    expect(toast.success).not.toHaveBeenCalled();

    // Case 3: User cancelled dialog (returns empty string)
    vi.clearAllMocks();
    mockSaveFileDialog.mockResolvedValue("");
    await quickExportPNG();
    expect(toast.info).toHaveBeenCalledWith("تم إلغاء تصدير الصورة");
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});

