import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { useFaceFrame } from "@/hooks/use-face-frame";
import { QuickBarSlotSection } from "./quick-bar/quick-bar-slot-section";
import { QuickBarMultiSelectionSection } from "./quick-bar/quick-bar-multi-selection-section";
import { QuickBarElementSection } from "./quick-bar/quick-bar-element-section";

/**
 * CanvasQuickBar — الشريط السريع العائم أعلى الكانفاس (Portal إلى document.body).
 * 🧭 الأقسام الثلاثة (خلية الكولاج / التحديد المتعدد / العنصر الحر) كانت
 * مضمّنة بالكامل هنا (798 سطراً) — الآن كل قسم في ملف مستقل تحت quick-bar/.
 */
export const CanvasQuickBar = React.memo(function CanvasQuickBar({
  printMode = false,
  isContextMenuOpen = false,
}: {
  printMode?: boolean;
  isContextMenuOpen?: boolean;
}) {
  const {
    mode,
    selectedId,
    selectedIds,
    elements,
    slots,
    setSlotImage,
    fillAllSlots,
    licenseActive,
    selectElement,
  } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      elements: state.elements,
      slots: state.slots,
      setSlotImage: state.setSlotImage,
      fillAllSlots: state.fillAllSlots,
      selectElement: state.selectElement,
      licenseActive: state.isLicenseActive(),
    }))
  );

  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

  const selectedSlot = mode === "collage" ? slots?.find((s) => s.id === selectedId) : undefined;
  const selectedElement = mode === "single" ? elements.find((e) => e.id === selectedId) : undefined;

  const onUpdateSlot = (id: string, patch: Partial<import("@/lib/store/types").CanvasSlot>) => {
    useEditorStore.getState().updateSlot(id, patch);
  };
  const onUpdateElement = (id: string, patch: Partial<import("@/lib/store/types").CanvasElement>) => {
    useEditorStore.getState().updateElement(id, patch);
  };

  const { isRemovingBg, handleRemoveBg, bgProgress } = useBgRemoval(selectedSlot ? onUpdateSlot : onUpdateElement);
  const { isEnhancing, handleEnhance, remainingQuota, dailyLimit } = useAiEnhance(selectedSlot ? onUpdateSlot : onUpdateElement);
  const { isFraming, handleFrameFace, handleCancelFrame } = useFaceFrame(selectedSlot ? onUpdateSlot : onUpdateElement);

  if (printMode || isContextMenuOpen || (!selectedSlot && !selectedElement && selectedIds.length === 0)) {
    return null;
  }

  const handleOpenFileForSlot = async () => {
    if (!selectedSlot || isFileDialogOpen) return;
    setIsFileDialogOpen(true);
    try {
      const [b64] = await openImageFileDialog(false);
      if (b64) {
        let srcToUse = b64;
        if (b64.startsWith("data:image/")) {
          try {
            const localPath = await SaveImageFromBase64(b64);
            if (localPath) srcToUse = localPath;
          } catch (e) {
            console.error("Failed to save image locally:", e);
          }
        }
        setSlotImage(selectedSlot.id, srcToUse);
        const autoFill = localStorage.getItem("grido_auto_fill_grid") !== "false";
        if (autoFill) {
          fillAllSlots(srcToUse, selectedSlot.id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFileDialogOpen(false);
    }
  };

  return createPortal(
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-(--z-quick-bar) no-print font-cairo select-none animate-in fade-in-50 slide-in-from-top-3 duration-200">
      <div className="bg-card backdrop-blur-xl border border-border shadow-lg shadow-black/10 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-foreground fluent-specular">

        {/* وضع الكولاج - الخلية المحددة */}
        {selectedSlot && (
          <QuickBarSlotSection
            slot={selectedSlot}
            licenseActive={licenseActive}
            isRemovingBg={isRemovingBg}
            bgProgress={bgProgress}
            isFraming={isFraming}
            isEnhancing={isEnhancing}
            remainingQuota={remainingQuota}
            dailyLimit={dailyLimit}
            onOpenFileForSlot={handleOpenFileForSlot}
            onRemoveBg={() => handleRemoveBg(selectedSlot)}
            onFrameFace={() => handleFrameFace(selectedSlot)}
            onCancelFrame={handleCancelFrame}
            onEnhance={() => handleEnhance(selectedSlot)}
          />
        )}

        {/* وضع التحديد المتعدد (Multi-Selection Mode) */}
        {selectedIds.length > 1 && (
          <QuickBarMultiSelectionSection selectedIds={selectedIds} />
        )}

        {/* وضع التعديل الحر - عنصر فردي */}
        {selectedElement && selectedIds.length <= 1 && (
          <QuickBarElementSection
            element={selectedElement}
            licenseActive={licenseActive}
            isRemovingBg={isRemovingBg}
            bgProgress={bgProgress}
            isFraming={isFraming}
            isEnhancing={isEnhancing}
            remainingQuota={remainingQuota}
            dailyLimit={dailyLimit}
            onRemoveBg={() => handleRemoveBg(selectedElement)}
            onFrameFace={() => handleFrameFace(selectedElement)}
            onCancelFrame={handleCancelFrame}
            onEnhance={() => handleEnhance(selectedElement)}
          />
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectElement(null)}
              className="h-7 w-7 p-0 rounded-md hover:bg-muted text-muted-foreground ms-1"
              aria-label="إغلاق الشريط السريع"
            >
              <X className="w-3.5 h-3.5" weight="regular" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">إغلاق الشريط السريع</TooltipContent>
        </Tooltip>

      </div>
    </div>,
    document.body
  );
});
