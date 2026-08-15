import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Sparkles, 
  Wand2, 
  ImagePlus, 
  Rows, 
  Columns, 
  LayoutGrid, 
  Trash2, 
  Copy, 
  ArrowUp, 
  ArrowDown, 
  X,
  Eraser,
  ScanFace,
  Loader2
} from "lucide-react";
import { openImageFileDialog } from "@/lib/file-dialog-utils";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { useBgRemoval } from "@/hooks/use-bg-removal";
import { useAiEnhance } from "@/hooks/use-ai-enhance";
import { useFaceFrame } from "@/hooks/use-face-frame";
import type { CanvasSlot, CanvasElement } from "@/lib/store/types";

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
    fillRowSlots,
    fillColumnSlots,
    updateSlot,
    updateElement,
    removeElement,
    removeElements,
    duplicateElement,
    duplicateElements,
    bringToFront,
    sendToBack,
    selectElement,
    licenseActive,
  } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      elements: state.elements,
      slots: state.slots,
      setSlotImage: state.setSlotImage,
      fillAllSlots: state.fillAllSlots,
      fillRowSlots: state.fillRowSlots,
      fillColumnSlots: state.fillColumnSlots,
      updateSlot: state.updateSlot,
      updateElement: state.updateElement,
      removeElement: state.removeElement,
      removeElements: state.removeElements,
      duplicateElement: state.duplicateElement,
      duplicateElements: state.duplicateElements,
      bringToFront: state.bringToFront,
      sendToBack: state.sendToBack,
      selectElement: state.selectElement,
      licenseActive: state.isLicenseActive(),
    }))
  );

  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

  const selectedSlot = mode === "collage" ? slots?.find((s) => s.id === selectedId) : undefined;
  const selectedElement = mode === "single" ? elements.find((e) => e.id === selectedId) : undefined;

  const onUpdateSlot = (id: string, patch: Partial<CanvasSlot>) => {
    updateSlot(id, patch);
  };

  const onUpdateElement = (id: string, patch: Partial<CanvasElement>) => {
    updateElement(id, patch);
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
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[9000] no-print font-cairo select-none animate-in fade-in-50 slide-in-from-top-3 duration-200">
      <div className="bg-card/90 backdrop-blur-2xl border border-border/80 dark:border-white/10 shadow-[0_12px_36px_rgba(0,0,0,0.22)] rounded-full px-3.5 py-1.5 flex items-center gap-1.5 text-foreground ring-1 ring-black/5 dark:ring-white/5">
        
        {/* وضع الكولاج - الخلية المحددة */}
        {selectedSlot && (
          <>
            <div className="flex items-center gap-1 text-[11px] font-bold px-2 text-primary">
              <span>خلية كولاج</span>
            </div>

            <Separator orientation="vertical" className="h-4 bg-border/40" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenFileForSlot}
                  className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-primary/10 hover:text-primary text-xs font-bold"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>تغيير</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">رفع صورة جديدة للخلية</TooltipContent>
            </Tooltip>

            {selectedSlot.imageSrc && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fillAllSlots(selectedSlot.imageSrc!, selectedSlot.id)}
                      className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-primary/10 hover:text-primary text-xs font-bold"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>كل الورقة</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تكرار الصورة بجميع خلايا الورقة</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fillRowSlots(selectedSlot.id, selectedSlot.imageSrc!)}
                      className="h-8 px-2 rounded-full hover:bg-blue-500/10 hover:text-blue-500 text-xs font-bold"
                    >
                      <Rows className="w-3.5 h-3.5" />
                      <span>الصف</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تعبئة الصف الحالي بهذه الصورة</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fillColumnSlots(selectedSlot.id, selectedSlot.imageSrc!)}
                      className="h-8 px-2 rounded-full hover:bg-indigo-500/10 hover:text-indigo-500 text-xs font-bold"
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>العمود</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تعبئة العمود الحالي بهذه الصورة</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-4 bg-border/40" />

                {/* عزل الخلفية */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRemovingBg}
                      onClick={() => handleRemoveBg(selectedSlot)}
                      className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-indigo-500/10 text-indigo-500 font-bold text-xs"
                    >
                      {isRemovingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{isRemovingBg ? (bgProgress > 0 ? `${Math.round(bgProgress)}%` : "جاري العزل...") : "عزل الخلفية"}</span>
                      {!licenseActive ? (
                        <span className="text-[7.5px] bg-primary text-primary-foreground font-black px-1 py-0.5 rounded tracking-wider uppercase">
                          PRO
                        </span>
                      ) : (
                        <span className="text-[8px] bg-primary/20 border border-primary/40 text-primary px-1 py-0.5 rounded font-bold font-mono">
                          AI
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">عزل التحديد وتفريغ خلفية الصورة</TooltipContent>
                </Tooltip>

                {/* تحسين الوجه بالذكاء الاصطناعي */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isEnhancing}
                      onClick={() => handleEnhance(selectedSlot)}
                      className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>ترميم الوجه ({remainingQuota}/{dailyLimit})</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تحسين الدقة وترميم ملامح الوجه بالذكاء الاصطناعي</TooltipContent>
                </Tooltip>

                {/* ضبط الوجه تلقائياً وفق مقاييس الهوية */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isFraming}
                      onClick={isFraming ? handleCancelFrame : () => handleFrameFace(selectedSlot)}
                      className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs"
                    >
                      <ScanFace className="w-3.5 h-3.5" />
                      <span>{isFraming ? "إلغاء..." : "ضبط الوجه"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">كشف الوجه وضبط مقاسه وموضعه تلقائياً وفق معايير الهوية</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-4 bg-border/40" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSlot(selectedSlot.id, { imageSrc: undefined, originalImageSrc: undefined })}
                      className="h-8 w-8 p-0 rounded-full text-destructive hover:bg-destructive/10"
                    >
                      <Eraser className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تفريغ هذه الخلية</TooltipContent>
                </Tooltip>
              </>
            )}
          </>
        )}

        {/* وضع التعديل الحر - عنصر عادي */}
        {selectedElement && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => bringToFront(selectedElement.id)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-accent"
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">إحضار للأمام</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sendToBack(selectedElement.id)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-accent"
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">إرسال للخلف</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateElement(selectedElement.id)}
                  className="h-8 w-8 p-0 rounded-full hover:bg-accent"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تكرار العنصر</TooltipContent>
            </Tooltip>

            {selectedElement.type === "image" && selectedElement.imageSrc && (
              <>
                <Separator orientation="vertical" className="h-4 bg-border/40" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRemovingBg}
                      onClick={() => handleRemoveBg(selectedElement)}
                      className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-indigo-500/10 text-indigo-500 font-bold text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>عزل الخلفية</span>
                      {!licenseActive ? (
                        <span className="text-[7.5px] bg-primary text-primary-foreground font-black px-1 py-0.5 rounded tracking-wider uppercase">
                          PRO
                        </span>
                      ) : (
                        <span className="text-[8px] bg-primary/20 border border-primary/40 text-primary px-1 py-0.5 rounded font-bold font-mono">
                          AI
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">عزل وتفريغ خلفية الصورة</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isEnhancing}
                      onClick={() => handleEnhance(selectedElement)}
                      className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-violet-500/10 text-violet-600 dark:text-violet-400 font-bold text-xs"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>ترميم الوجه ({remainingQuota}/{dailyLimit})</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تحسين الجودة وترميم الوجه</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isFraming}
                      onClick={isFraming ? handleCancelFrame : () => handleFrameFace(selectedElement)}
                      className="h-8 px-2.5 gap-1.5 rounded-full hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs"
                    >
                      <ScanFace className="w-3.5 h-3.5" />
                      <span>{isFraming ? "إلغاء..." : "ضبط الوجه"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">كشف الوجه وضبط مقاسه وموضعه تلقائياً وفق معايير الهوية</TooltipContent>
                </Tooltip>
              </>
            )}

            <Separator orientation="vertical" className="h-4 bg-border/40" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeElement(selectedElement.id)}
                  className="h-8 w-8 p-0 rounded-full text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">حذف العنصر</TooltipContent>
            </Tooltip>
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => selectElement(null)}
          className="h-6 w-6 p-0 rounded-full hover:bg-muted text-muted-foreground ml-1"
          title="إغلاق الشريط السريع"
        >
          <X className="w-3.5 h-3.5" />
        </Button>

      </div>
    </div>,
    document.body
  );
});
