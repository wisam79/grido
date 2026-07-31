import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useAutoSave } from "../src/hooks/use-autosave";
import { useEditorStore } from "../src/lib/editor-store";
import { renderHook, waitFor, act } from "@testing-library/react";
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

  afterEach(() => {
    vi.useRealTimers();
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

    // مؤقتات وهمية بدل انتظار debounce الحقيقي (ثانيتان) — أسرع ودون اعتماد على توقيت حقيقي
    vi.useFakeTimers();
    try {
      renderHook(() => useAutoSave());
      await act(async () => {});

      // Add elements to trigger store change
      useEditorStore.getState().addTextElement("Initial Element");

      // Fast-forward past the 2000ms debounce
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(mockSaveAutoSave).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
