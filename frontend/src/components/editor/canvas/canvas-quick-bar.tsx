import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Sparkle,
  MagicWand,
  UserFocus,
  ImageSquare,
  GridFour,
  Trash,
  Copy,
  ArrowUp,
  ArrowDown,
  ArrowClockwise,
  FlipHorizontal,
  ArrowCounterClockwise,
  Eye,
  Broom,
  BoundingBox,
  X,
  Columns,
  Rows,
  Stack,
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignTop,
  AlignCenterVertical,
  AlignBottom,
  ArrowsHorizontal,
  ArrowsVertical,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
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
    alignSelectedElements,
    distributeSelectedElements,
    groupSelectedElements,
    rotateSlot,
    flipSlotX,
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
      alignSelectedElements: state.alignSelectedElements,
      distributeSelectedElements: state.distributeSelectedElements,
      groupSelectedElements: state.groupSelectedElements,
      rotateSlot: state.rotateSlot,
      flipSlotX: state.flipSlotX,
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
      <div className="bg-card backdrop-blur-xl border border-border shadow-lg shadow-black/10 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-foreground fluent-specular">
        
        {/* وضع الكولاج - الخلية المحددة */}
        {selectedSlot && (
          <>
            <div className="flex items-center gap-1 text-[11px] font-bold px-1.5 text-primary">
              <span>خلية كولاج</span>
            </div>

            <Separator orientation="vertical" className="h-4 bg-border/40" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenFileForSlot}
                  className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
                >
                  <ImageSquare className="w-3.5 h-3.5" weight="regular" />
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
                      className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
                    >
                      <GridFour className="w-3.5 h-3.5" weight="regular" />
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
                      className="h-7 px-2 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
                    >
                      <Rows className="w-3.5 h-3.5" weight="regular" />
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
                      className="h-7 px-2 rounded-md hover:bg-primary/10 hover:text-primary text-xs font-bold"
                    >
                      <Columns className="w-3.5 h-3.5" weight="regular" />
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
                      className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
                    >
                      {isRemovingBg ? <Spinner className="w-3.5 h-3.5" size={14} /> : <Sparkle className="w-3.5 h-3.5" weight="duotone" />}
                      <span>{isRemovingBg ? (bgProgress > 0 ? `جاري العزل ... (${Math.round(bgProgress)}%)` : "جاري العزل ...") : "عزل الخلفية"}</span>
                      {!licenseActive ? (
                        <span className="text-[7.5px] bg-primary text-primary-foreground font-black px-1 py-0.5 rounded-sm tracking-wider uppercase">
                          PRO
                        </span>
                      ) : (
                        <span className="text-[8px] bg-primary/20 border border-primary/40 text-primary px-1 py-0.5 rounded-sm font-bold font-mono">
                          AI
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">عزل التحديد وتفريغ خلفية الصورة</TooltipContent>
                </Tooltip>

                {/* ضبط الوجه تلقائياً وفق مقاييس الهوية — الترتيب موحّد مع شريط
                    الأدوات: عزل → ضبط → ترميم (تحسين الترتيب) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isFraming}
                      onClick={isFraming ? handleCancelFrame : () => handleFrameFace(selectedSlot)}
                      className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
                    >
                      {isFraming ? <Spinner className="w-3.5 h-3.5" size={14} /> : <UserFocus className="w-3.5 h-3.5" weight="duotone" />}
                      <span>{isFraming ? "جاري الضبط ..." : "ضبط الوجه"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">كشف الوجه وضبط مقاسه وموضعه تلقائياً وفق معايير الهوية</TooltipContent>
                </Tooltip>

                {/* تحسين الوجه بالذكاء الاصطناعي */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isEnhancing}
                      onClick={() => handleEnhance(selectedSlot)}
                      className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
                    >
                      {isEnhancing ? <Spinner className="w-3.5 h-3.5" size={14} /> : <MagicWand className="w-3.5 h-3.5" weight="duotone" />}
                      <span>{isEnhancing ? "جاري الترميم ..." : `ترميم الوجه (${remainingQuota}/${dailyLimit})`}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تحسين الدقة وترميم ملامح الوجه بالذكاء الاصطناعي</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-4 bg-border/40" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => rotateSlot(selectedSlot.id, 90)}
                      className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                    >
                      <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تدوير 90 درجة</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => flipSlotX(selectedSlot.id)}
                      className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" weight="bold" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">قلب أفقي</TooltipContent>
                </Tooltip>

                {selectedSlot.originalImageSrc && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateSlot(selectedSlot.id, {
                              imageSrc: selectedSlot.originalImageSrc,
                              originalImageSrc: undefined,
                              bgColor: undefined
                            });
                            useEditorStore.getState().pushHistory();
                            toast.success("تمت استعادة الصورة الأصلية");
                          }}
                          className="h-7 w-7 p-0 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                          <ArrowCounterClockwise className="w-3.5 h-3.5" weight="regular" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">استعادة الصورة الأصلية</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onMouseDown={() => {
                            const curr = selectedSlot.imageSrc;
                            updateSlot(selectedSlot.id, { imageSrc: selectedSlot.originalImageSrc });
                            const restore = () => {
                              updateSlot(selectedSlot.id, { imageSrc: curr });
                              window.removeEventListener("mouseup", restore);
                            };
                            window.addEventListener("mouseup", restore);
                          }}
                          className="h-7 w-7 p-0 rounded-md text-primary hover:bg-primary/10 select-none active:bg-primary active:text-primary-foreground"
                        >
                          <Eye className="w-3.5 h-3.5" weight="regular" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">اضغط مطولاً لمعاينة الأصل</TooltipContent>
                    </Tooltip>
                  </>
                )}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateSlot(selectedSlot.id, { imageSrc: undefined, originalImageSrc: undefined });
                        useEditorStore.getState().pushHistory();
                      }}
                      className="h-7 w-7 p-0 rounded-md text-destructive hover:bg-destructive/10"
                    >
                      <Broom className="w-3.5 h-3.5" weight="regular" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تفريغ هذه الخلية</TooltipContent>
                </Tooltip>
              </>
            )}
          </>
        )}

        {/* وضع التحديد المتعدد (Multi-Selection Mode) */}
        {selectedIds.length > 1 && (
          <>
            <div className="flex items-center gap-1 text-[11px] font-bold px-1.5 text-primary">
              <Stack className="w-3.5 h-3.5" weight="regular" />
              <span>{selectedIds.length} عناصر</span>
            </div>

            <Separator orientation="vertical" className="h-4 bg-border/40" />

            {/* أزرار المحاذاة */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alignSelectedElements("left")}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <AlignLeft className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">محاذاة لليسار</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alignSelectedElements("center")}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <AlignCenterHorizontal className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">محاذاة للوسط أفقياً</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alignSelectedElements("right")}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <AlignRight className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">محاذاة لليمين</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alignSelectedElements("top")}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <AlignTop className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">محاذاة للأعلى</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alignSelectedElements("middle")}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <AlignCenterVertical className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">محاذاة للمنتصف عمودياً</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => alignSelectedElements("bottom")}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <AlignBottom className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">محاذاة للأسفل</TooltipContent>
            </Tooltip>

            {/* التوزيع المتساوي (عند تحديد 3 عناصر أو أكثر) */}
            {selectedIds.length >= 3 && (
              <>
                <Separator orientation="vertical" className="h-4 bg-border/40" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => distributeSelectedElements("horizontal")}
                      className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                    >
                      <ArrowsHorizontal className="w-3.5 h-3.5" weight="bold" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">توزيع أفقي متساوٍ</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => distributeSelectedElements("vertical")}
                      className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                    >
                      <ArrowsVertical className="w-3.5 h-3.5" weight="bold" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">توزيع عمودي متساوٍ</TooltipContent>
                </Tooltip>
              </>
            )}

            <Separator orientation="vertical" className="h-4 bg-border/40" />

            {/* تجميع */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={groupSelectedElements}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <BoundingBox className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تجميع العناصر (Group)</TooltipContent>
            </Tooltip>

            {/* تكرار */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => duplicateElements(selectedIds)}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <Copy className="w-3.5 h-3.5" weight="regular" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تكرار العناصر</TooltipContent>
            </Tooltip>

            {/* حذف */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeElements(selectedIds)}
                  className="h-7 w-7 p-0 rounded-md text-destructive hover:bg-destructive/10"
                >
                  <Trash className="w-3.5 h-3.5" weight="regular" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">حذف العناصر</TooltipContent>
            </Tooltip>
          </>
        )}

        {/* وضع التعديل الحر - عنصر فردي */}
        {selectedElement && selectedIds.length <= 1 && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => bringToFront(selectedElement.id)}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <ArrowUp className="w-3.5 h-3.5" weight="bold" />
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
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <ArrowDown className="w-3.5 h-3.5" weight="bold" />
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
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <Copy className="w-3.5 h-3.5" weight="regular" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تكرار العنصر</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateElement(selectedElement.id, { rotation: (selectedElement.rotation + 90) % 360 });
                    useEditorStore.getState().pushHistory();
                  }}
                  className="h-7 w-7 p-0 rounded-md hover:bg-accent"
                >
                  <ArrowClockwise className="w-3.5 h-3.5" weight="bold" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">تدوير 90 درجة</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateElement(selectedElement.id, { flipX: !selectedElement.flipX });
                    useEditorStore.getState().pushHistory();
                  }}
                  className={cn("h-7 w-7 p-0 rounded-md hover:bg-accent", selectedElement.flipX && "bg-primary/10 text-primary")}
                >
                  <FlipHorizontal className="w-3.5 h-3.5" weight={selectedElement.flipX ? "fill" : "bold"} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">قلب أفقي</TooltipContent>
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
                      className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
                    >
                      {isRemovingBg ? <Spinner className="w-3.5 h-3.5" size={14} /> : <Sparkle className="w-3.5 h-3.5" weight="duotone" />}
                      <span>{isRemovingBg ? (bgProgress > 0 ? `جاري العزل ... (${Math.round(bgProgress)}%)` : "جاري العزل ...") : "عزل الخلفية"}</span>
                      {!licenseActive ? (
                        <span className="text-[7.5px] bg-primary text-primary-foreground font-black px-1 py-0.5 rounded-sm tracking-wider uppercase">
                          PRO
                        </span>
                      ) : (
                        <span className="text-[8px] bg-primary/20 border border-primary/40 text-primary px-1 py-0.5 rounded-sm font-bold font-mono">
                          AI
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">عزل وتفريغ خلفية الصورة</TooltipContent>
                </Tooltip>

                {/* الترتيب الموحد مع شريط الأدوات: عزل → ضبط → ترميم */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isFraming}
                      onClick={isFraming ? handleCancelFrame : () => handleFrameFace(selectedElement)}
                      className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
                    >
                      {isFraming ? <Spinner className="w-3.5 h-3.5" size={14} /> : <UserFocus className="w-3.5 h-3.5" weight="duotone" />}
                      <span>{isFraming ? "جاري الضبط ..." : "ضبط الوجه"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">كشف الوجه وضبط مقاسه وموضعه تلقائياً وفق معايير الهوية</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isEnhancing}
                      onClick={() => handleEnhance(selectedElement)}
                      className="h-7 px-2 gap-1 rounded-md hover:bg-primary/10 text-primary font-bold text-xs"
                    >
                      {isEnhancing ? <Spinner className="w-3.5 h-3.5" size={14} /> : <MagicWand className="w-3.5 h-3.5" weight="duotone" />}
                      <span>{isEnhancing ? "جاري الترميم ..." : `ترميم الوجه (${remainingQuota}/${dailyLimit})`}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">تحسين الجودة وترميم الوجه</TooltipContent>
                </Tooltip>

                {selectedElement.originalImageSrc && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            updateElement(selectedElement.id, {
                              imageSrc: selectedElement.originalImageSrc,
                              originalImageSrc: undefined,
                              bgColor: "transparent"
                            });
                            useEditorStore.getState().pushHistory();
                            toast.success("تمت استعادة الصورة الأصلية");
                          }}
                          className="h-7 w-7 p-0 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                          <ArrowCounterClockwise className="w-3.5 h-3.5" weight="regular" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">استعادة الصورة الأصلية</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onMouseDown={() => {
                            const curr = selectedElement.imageSrc;
                            updateElement(selectedElement.id, { imageSrc: selectedElement.originalImageSrc });
                            const restore = () => {
                              updateElement(selectedElement.id, { imageSrc: curr });
                              window.removeEventListener("mouseup", restore);
                            };
                            window.addEventListener("mouseup", restore);
                          }}
                          className="h-7 w-7 p-0 rounded-md text-primary hover:bg-primary/10 select-none active:bg-primary active:text-primary-foreground"
                        >
                          <Eye className="w-3.5 h-3.5" weight="regular" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">اضغط مطولاً لمعاينة الأصل</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </>
            )}

            <Separator orientation="vertical" className="h-4 bg-border/40" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeElement(selectedElement.id)}
                  className="h-7 w-7 p-0 rounded-md text-destructive hover:bg-destructive/10"
                >
                  <Trash className="w-3.5 h-3.5" weight="regular" />
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
          className="h-7 w-7 p-0 rounded-md hover:bg-muted text-muted-foreground ms-1"
          title="إغلاق الشريط السريع"
        >
          <X className="w-3.5 h-3.5" weight="regular" />
        </Button>

      </div>
    </div>,
    document.body
  );
});
