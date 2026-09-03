import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { Spinner } from "@/components/ui/huge-icon";
import {
  Copy,
  Scissors,
  Trash,
  ArrowUp,
  ArrowDown,
  Sparkle,
  MagicWand,
  Crop,
  ClipboardText,
} from "@phosphor-icons/react";
import { pasteFromClipboardOrStore } from "@/lib/io/clipboard-utils";
import { SaveImageFromBase64 } from "../../../../../wailsjs/go/main/App";
import { wailsIsDesktop } from "@/lib/wails-env";
import type { ImageElement, CanvasElement } from "@/lib/store/types";
import {
  menuItemClassName,
  menuItemDangerClassName,
  menuItemSpinnerClassName,
  menuSectionLabelClassName,
  menuSeparatorClassName,
} from "./menu-item-styles";

export interface ElementMenuShared {
  targetId: string;
  onClose: () => void;
  handleAction: (action: () => void) => void;
  setCropTarget: (target: {
    imageSrc: string;
    originalImageSrc?: string;
    onSave: (croppedB64: string, dims?: { width: number; height: number }) => void;
  }) => void;
  isRemovingBg: boolean;
  isEnhancing: boolean;
  handleRemoveBg: (el: ImageElement) => void;
  handleEnhance: (el: ImageElement) => void;
}

/**
 * 🧭 قسم قائمة السياق للعناصر الحرة على الكانفس: معالجة الصور (قص/عزل
 * الخلفية/ترميم الوجه) والتحكم والترتيب (نسخ/قص/لصق/تكرار/طبقة/حذف) —
 * كان JSX هذا مضمّناً في ContextMenu.
 */
export function ElementMenuSection({ targetId, onClose, handleAction, setCropTarget, isRemovingBg, isEnhancing, handleRemoveBg, handleEnhance }: ElementMenuShared) {
  const {
    copySelectedElements,
    cutSelectedElements,
    duplicateElement,
    duplicateElements,
    removeElement,
    bringToFront,
    sendToBack,
    updateElement,
    pushHistory,
    elements,
  } = useEditorStore(useShallow((state) => ({
    copySelectedElements: state.copySelectedElements,
    cutSelectedElements: state.cutSelectedElements,
    duplicateElement: state.duplicateElement,
    duplicateElements: state.duplicateElements,
    removeElement: state.removeElement,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    elements: state.elements,
  })));

  const el = elements.find((e) => e.id === targetId);
  const imgEl = el?.type === "image" ? (el as ImageElement) : null;

  return (
    <div className="space-y-1">
      {/* قسم الذكاء الاصطناعي إن كان عنصراً صورياً */}
      {imgEl?.imageSrc && (
        <>
          <div className={menuSectionLabelClassName}>
            معالجة الصور
          </div>
          <div className="space-y-0.5">
            <button
              role="menuitem"
              tabIndex={-1}
              className={menuItemClassName}
              onClick={() => {
                setCropTarget({
                  imageSrc: imgEl.imageSrc!,
                  originalImageSrc: imgEl.originalImageSrc,
                  onSave: async (croppedB64, dims) => {
                    try {
                      const isWailsDesktop = wailsIsDesktop();
                      let finalPath = croppedB64;
                      if (isWailsDesktop && croppedB64.startsWith("data:image/")) {
                        try {
                          const localPath = await SaveImageFromBase64(croppedB64);
                          if (localPath) finalPath = localPath;
                        } catch (e) {
                          console.error("Failed to save cropped image locally:", e);
                        }
                      }

                      const img = new Image();
                      img.onload = () => {
                        const w = dims?.width || img.width;
                        const h = dims?.height || img.height;
                        const croppedAspect = w / h;
                        const state = useEditorStore.getState();
                        const canvasRatio = state.canvasWidth / state.canvasHeight;
                        const newHeight = (imgEl.width * canvasRatio) / croppedAspect;

                        updateElement(imgEl.id, {
                          imageSrc: finalPath,
                          height: newHeight,
                          originalImageSrc: imgEl.originalImageSrc || imgEl.imageSrc,
                        } as Partial<CanvasElement>);

                        state.setLastEditedImage(finalPath);
                        state.setLastEditedImageAspect(croppedAspect);
                        state.pushHistory();
                      };
                      img.onerror = () => {
                        updateElement(imgEl.id, {
                          imageSrc: finalPath,
                          originalImageSrc: imgEl.originalImageSrc || imgEl.imageSrc,
                        } as Partial<CanvasElement>);
                        pushHistory();
                      };
                      img.src = croppedB64;
                    } catch (err) {
                      console.error("Failed to crop image in context menu:", err);
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
                handleRemoveBg(imgEl);
                onClose();
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
                handleEnhance(imgEl);
                onClose();
              }}
            >
              {isEnhancing ? <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} /> : <MagicWand className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="duotone" />}
              <span className="truncate">{isEnhancing ? "جاري المعالجة ..." : "ترميم الوجه"}</span>
            </button>
            </div>
          <div className={menuSeparatorClassName} role="separator" />
        </>
      )}

      {/* قسم التحكم والترتيب */}
      <div className={menuSectionLabelClassName}>
        التحكم والترتيب
      </div>
      <div className="space-y-0.5">
        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            copySelectedElements([targetId]);
          })}
        >
          <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">نسخ</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            cutSelectedElements([targetId]);
          })}
        >
          <Scissors className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">قص</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            pasteFromClipboardOrStore();
          })}
        >
          <ClipboardText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">لصق</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            const { selectedIds } = useEditorStore.getState();
            if (selectedIds.length > 1) {
              duplicateElements(selectedIds);
            } else {
              duplicateElement(targetId);
            }
          })}
        >
          <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">تكرار</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => bringToFront(targetId))}
        >
          <ArrowUp className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="bold" />
          <span className="truncate">تقديم للأمام</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => sendToBack(targetId))}
        >
          <ArrowDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" weight="bold" />
          <span className="truncate">تأخير للخلف</span>
        </button>

        <div className={menuSeparatorClassName} role="separator" />

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemDangerClassName}
          onClick={() => handleAction(() => {
            const { selectedIds, removeElements } = useEditorStore.getState();
            const removableIds = selectedIds.filter((id) => {
              const found = elements.find((e) => e.id === id);
              return found && !found.locked;
            });
            if (removableIds.length > 1) {
              removeElements(removableIds);
            } else if (removableIds.length === 1) {
              removeElement(removableIds[0]);
            } else if (!el?.locked) {
              removeElement(targetId);
            }
          })}
        >
          <Trash className="w-3.5 h-3.5 text-destructive shrink-0" weight="regular" />
          <span className="truncate font-bold">حذف</span>
        </button>
      </div>
    </div>
  );
}
