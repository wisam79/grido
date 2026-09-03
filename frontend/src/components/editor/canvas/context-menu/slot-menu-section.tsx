import { useEditorStore } from "@/lib/editor-store";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Broom,
  Sparkle,
  MagicWand,
  ImageSquare,
  Crop,
  ArrowClockwise,
  FlipHorizontal,
  Crosshair,
  GridFour,
  Columns,
  Rows,
} from "@phosphor-icons/react";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { SaveImageFromBase64 } from "../../../../../wailsjs/go/main/App";
import type { CanvasSlot } from "@/lib/store/types";
import {
  menuItemClassName,
  menuItemDangerClassName,
  menuItemSpinnerClassName,
  menuSectionLabelClassName,
  menuSeparatorClassName,
} from "./menu-item-styles";

export interface SlotMenuShared {
  targetId: string;
  onClose: () => void;
  handleActionWithHistory: (action: () => void) => void;
  setCropTarget: (target: {
    imageSrc: string;
    originalImageSrc?: string;
    onSave: (croppedB64: string, dims?: { width: number; height: number }) => void;
  }) => void;
  isRemovingBg: boolean;
  isEnhancing: boolean;
  handleRemoveBg: (slot: CanvasSlot) => void;
  handleEnhance: (slot: CanvasSlot) => void;
  onUpdateSlot: (id: string, patch: Partial<CanvasSlot>) => void;
}

/**
 * 🧭 قسم قائمة السياق لخلايا الكولاج: استبدال/تفريغ الصورة، معالجة AI،
 * التحويل والمحاذاة (توسيط/تدوير/قلب)، والتعبئة والتكرار الخطي —
 * كان JSX هذا مضمّناً في ContextMenu.
 */
export function SlotMenuSection({
  targetId,
  onClose,
  handleActionWithHistory,
  setCropTarget,
  isRemovingBg,
  isEnhancing,
  handleRemoveBg,
  handleEnhance,
  onUpdateSlot,
}: SlotMenuShared) {
  const { updateSlot, pushHistory } = useEditorStore((state) => ({
    updateSlot: state.updateSlot,
    pushHistory: state.pushHistory,
  }));
  const slot = useEditorStore((state) => state.slots?.find((s) => s.id === targetId));

  return (
    <div className="space-y-1">
      {/* قسم إدارة الصورة والذكاء الاصطناعي */}
      <div className={menuSectionLabelClassName}>
        الصورة والذكاء الاصطناعي
      </div>
      <div className="space-y-0.5">
        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={async () => {
            const [b64] = await openImageFileDialog(false);
            if (b64) {
              let srcToUse = b64;
              if (b64.startsWith("data:image/")) {
                try {
                  const localPath = await SaveImageFromBase64(b64);
                  if (localPath) srcToUse = localPath;
                } catch {
                  // Fallback
                }
              }
              useEditorStore.getState().setSlotImage(targetId, srcToUse);
              onClose();
            }
          }}
        >
          <ImageSquare className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">استبدال الصورة</span>
        </button>

        {slot?.imageSrc && (
          <>
            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => {
                if (!slot.imageSrc) return;
                setCropTarget({
                  imageSrc: slot.imageSrc,
                  originalImageSrc: slot.originalImageSrc,
                  onSave: async (croppedB64) => {
                    try {
                      let finalPath = croppedB64;
                      if (croppedB64.startsWith("data:image/")) {
                        try {
                          const localPath = await SaveImageFromBase64(croppedB64);
                          if (localPath) finalPath = localPath;
                        } catch (e) {
                          console.error("Failed to save cropped slot image:", e);
                        }
                      }

                      updateSlot(slot.id, {
                        imageSrc: finalPath,
                        dragX: 0,
                        dragY: 0,
                        zoom: 1,
                        originalImageSrc: slot.originalImageSrc || slot.imageSrc,
                      });
                      pushHistory();
                    } catch (err) {
                      console.error("Failed to save cropped slot image:", err);
                    }
                  }
                });
              }}
            >
              <Crop className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
              <span className="truncate">قص وتدوير</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              disabled={isRemovingBg}
              className={menuItemSpinnerClassName}
              onClick={() => {
                if (slot) {
                  handleRemoveBg(slot);
                  onClose();
                }
              }}
            >
              {isRemovingBg ? <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} /> : <Sparkle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="duotone" />}
              <span className="truncate">{isRemovingBg ? "جاري العزل ..." : "عزل الخلفية"}</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              disabled={isEnhancing}
              className={menuItemSpinnerClassName}
              onClick={() => {
                if (slot) {
                  handleEnhance(slot);
                  onClose();
                }
              }}
            >
              {isEnhancing ? <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} /> : <MagicWand className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="duotone" />}
              <span className="truncate">{isEnhancing ? "جاري المعالجة ..." : "ترميم الوجه"}</span>
            </button>
          </>
        )}

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemDangerClassName}
          onClick={() => handleActionWithHistory(() => updateSlot(targetId, { imageSrc: undefined, originalImageSrc: undefined }))}
        >
          <Broom className="w-3.5 h-3.5 text-destructive shrink-0" weight="regular" />
          <span className="truncate">تفريغ الخلية</span>
        </button>
      </div>

      {/* قسم التحويل والمحاذاة */}
      {slot?.imageSrc && (
        <>
          <div className={menuSeparatorClassName} />
          <div className={menuSectionLabelClassName}>
            التحويل والمحاذاة
          </div>
          <div className="space-y-0.5">
            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => handleActionWithHistory(() => updateSlot(targetId, { dragX: 0, dragY: 0, zoom: 1 }))}
            >
              <Crosshair className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
              <span className="truncate">توسيط</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => handleActionWithHistory(() => updateSlot(targetId, { rotation: (((slot.rotation ?? 0) + 90) % 360) }))}
            >
              <ArrowClockwise className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="bold" />
              <span className="truncate">تدوير 90° ({slot.rotation ?? 0}°)</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => handleActionWithHistory(() => updateSlot(targetId, { flipX: !slot.flipX }))}
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="bold" />
              <span className="truncate">قلب أفقي</span>
            </button>
          </div>
        </>
      )}

      {/* قسم التعبئة والتكرار الخطي */}
      {slot?.imageSrc && (
        <>
          <div className={menuSeparatorClassName} />

          <div className={menuSectionLabelClassName}>
            التعبئة والتكرار
          </div>
          <div className="space-y-0.5">
            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => handleActionWithHistory(() => useEditorStore.getState().fillAllSlots(slot.imageSrc!, targetId))}
            >
              <GridFour className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
              <span className="truncate">تعبئة الكل</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => handleActionWithHistory(() => useEditorStore.getState().fillEmptySlots(slot.imageSrc!, targetId))}
            >
              <Sparkle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="duotone" />
              <span className="truncate">تعبئة الفارغ</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => handleActionWithHistory(() => useEditorStore.getState().fillRowSlots(targetId, slot.imageSrc!))}
            >
              <Rows className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
              <span className="truncate">تعبئة الصف</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => handleActionWithHistory(() => useEditorStore.getState().fillColumnSlots(targetId, slot.imageSrc!))}
            >
              <Columns className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
              <span className="truncate">تعبئة العمود</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
