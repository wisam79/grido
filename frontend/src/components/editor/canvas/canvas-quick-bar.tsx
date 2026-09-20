import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "@phosphor-icons/react";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { SaveImageFromBase64 } from "../../../../wailsjs/go/main/App";
import { QuickBarSlotSection } from "./quick-bar/quick-bar-slot-section";
import { QuickBarMultiSelectionSection } from "./quick-bar/quick-bar-multi-selection-section";
import { QuickBarElementSection } from "./quick-bar/quick-bar-element-section";
import { useCanvasOverlayHost } from "./canvas-overlay-host";

/**
 * CanvasQuickBar — الشريط السريع العائم **داخل منطقة الكانفاس**.
 * 🧭 الأقسام الثلاثة (خلية الكولاج / التحديد المتعدد / العنصر الحر) كانت
 * مضمّنة بالكامل هنا (798 سطراً) — الآن كل قسم في ملف مستقل تحت quick-bar/.
 *
 * 📐 التموضع: كان `createPortal(document.body)` + `fixed top-16` فيطفو فوق
 * شريط الأدوات ويمتد على الشريط الجانبي والألواح. الآن يُرسم في حاوية اللوح
 * (CanvasOverlayHost) بـ`absolute` على حدوده العلوية، فلا يغطي أي عنصر واجهة
 * خارج الكانفاس ولا يحتاج `z` يتجاوز طبقات الواجهة.
 *
 * 🎯 نطاق هذا الشريط: **الموضع على الورقة** (ترتيب الطبقة، تدوير، قلب،
 * توزيع، تعبئة الصف/العمود، تفريغ الخلية، مقارنة بالأصل).
 * أما خصائص العنصر — تكرار، حذف، محاذاة، تجميع، مرشحات، وأدوات الذكاء
 * الاصطناعي — فموطنها الشريط العلوي (ToolbarSelectionTools)، وقد أُزيلت
 * من هنا لأنها كانت مكرّرة حرفياً في السطحين.
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
    }))
  );

  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const overlayHost = useCanvasOverlayHost();

  const selectedSlot = mode === "collage" ? slots?.find((s) => s.id === selectedId) : undefined;
  const selectedElement = mode === "single" ? elements.find((e) => e.id === selectedId) : undefined;

  // أقسام الشريط: خلية كولاج · عنصر فردي · تحديد متعدد (3 عناصر أو أكثر
  // للتوزيع فقط). الشريط يُخفى كلياً إن لم يكن لأي قسم محتوى — فلا يبقى
  // هيكل فارغ بزر إغلاق وحده بعد أن انتقلت إجراءات العناصر للشريط العلوي.
  const hasSlotSection = Boolean(selectedSlot);
  const hasElementSection = Boolean(selectedElement) && selectedIds.length <= 1;
  const hasMultiSection = selectedIds.length >= 3;

  if (printMode || isContextMenuOpen || (!hasSlotSection && !hasElementSection && !hasMultiSection)) {
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

  const bar = (
    <div
      dir="rtl"
      data-testid="canvas-quick-bar"
      className="absolute top-3 left-1/2 -translate-x-1/2 z-(--z-quick-bar) pointer-events-auto no-print font-cairo select-none animate-in fade-in-50 slide-in-from-top-3 duration-200 max-w-[calc(100%-1.5rem)]"
    >
      <div className="bg-card/95 backdrop-blur-xl border border-border/80 dark:border-white/10 shadow-fluent-16 rounded-xl px-2.5 py-1 flex items-center gap-1.5 text-foreground fluent-specular max-w-full overflow-x-auto">

        {/* وضع الكولاج - الخلية المحددة */}
        {hasSlotSection && selectedSlot && (
          <QuickBarSlotSection slot={selectedSlot} onOpenFileForSlot={handleOpenFileForSlot} />
        )}

        {/* وضع التحديد المتعدد (Multi-Selection Mode) */}
        {hasMultiSection && <QuickBarMultiSelectionSection selectedIds={selectedIds} />}

        {/* وضع التعديل الحر - عنصر فردي */}
        {hasElementSection && selectedElement && <QuickBarElementSection element={selectedElement} />}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectElement(null)}
              className="h-7 w-7 p-0 rounded-md hover:bg-muted text-muted-foreground ms-1"
              aria-label="إغلاق الشريط"
            >
              <X className="w-3.5 h-3.5" weight="regular" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">إغلاق الشريط</TooltipContent>
        </Tooltip>

      </div>
    </div>
  );

  // داخل لوح الكانفاس إن توفّر؛ وإلا يُرسم في مكانه (السقوط على حاوية الكانفاس
  // نفسها) — فلا يعتمد المكوّن على تركيبه في اللوح ليعمل.
  return overlayHost ? createPortal(bar, overlayHost) : bar;
});
