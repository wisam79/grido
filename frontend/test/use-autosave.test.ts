import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAutoSave } from "../src/hooks/use-autosave";
import { useEditorStore } from "../src/lib/editor-store";
import { renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useAutoSave - Auto Save Hook Tests", () => {
  beforeEach(() => {
    useEditorStore.getState().reset();
    vi.clearAllMocks();
  });

  it("should load auto saved project on initialization", async () => {
    const savedDraft = JSON.stringify({
      version: 1,
      mode: "single",
      canvasWidth: 800,
      canvasHeight: 600,
      backgroundColor: "#FFFFFF",
      elements: [],
      slots: [],
    });

    const mockLoadAutoSave = vi.fn().mockResolvedValue(savedDraft);
    (window as any).go.main.App.LoadAutoSave = mockLoadAutoSave;

    renderHook(() => useAutoSave());

    await waitFor(() => {
      expect(mockLoadAutoSave).toHaveBeenCalled();
      expect(useEditorStore.getState().canvasWidth).toBe(800);
      expect(toast.info).toHaveBeenCalledWith("تم استعادة مسودة العمل السابقة تلقائياً", expect.any(Object));
    });
  });

  it("should trigger SaveAutoSave after editing canvas elements", async () => {
    const mockSaveAutoSave = vi.fn().mockResolvedValue(undefined);
    (window as any).go.main.App.SaveAutoSave = mockSaveAutoSave;
    (window as any).go.main.App.LoadAutoSave = vi.fn().mockResolvedValue("");

    renderHook(() => useAutoSave());

    // Add elements to trigger store change
    useEditorStore.getState().addTextElement("Initial Element");

    // Wait for the 2000ms debounce
    await waitFor(() => {
      expect(mockSaveAutoSave).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
