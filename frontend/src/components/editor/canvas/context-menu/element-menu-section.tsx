import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

import { requestStickerReedit } from '@/components/editor/dialogs/sticker-reedit-bus';
import { Spinner } from '@/components/ui/huge-icon';
import {
  Copy,
  Scissors,
  Trash,
  ArrowUp,
  ArrowDown,
  Sparkle,
  MagicWand,
  Crop,
  FrameCorners,
  ClipboardText,
  Sticker,
  Code,
} from '@/components/ui/icons';
import {
  canCopyStickerSvg,
  copyStickerSvgWithFeedback,
} from '@/features/stickers/lib/clipboard-utils';
import { useImageShapeMaskAction } from '@/hooks/use-image-shape-mask-action';
import { useCanvasInteraction } from '@/lib/canvas/canvas-interaction-store';
import { commitImageElementCrop } from '@/lib/canvas/image-crop-commit';
import { getImageShapePair } from '@/lib/canvas/image-shape-fill';
import { useEditorStore } from '@/lib/editor-store';
import { pasteFromClipboardOrStore } from '@/lib/io/clipboard-utils';
import { getDocumentSession } from '@/lib/io/document-session';

import {
  menuItemClassName,
  menuItemDangerClassName,
  menuItemSpinnerClassName,
  menuSectionLabelClassName,
  menuSeparatorClassName,
} from './menu-item-styles';

import type { ContextMenuCropTarget } from '../context-menu';
import type { ImageElement } from '@/lib/store/types';

export interface ElementMenuShared {
  targetId: string;
  onClose: () => void;
  handleAction: (action: () => void) => void;
  setCropTarget: (target: ContextMenuCropTarget) => void;
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
export function ElementMenuSection({
  targetId,
  onClose,
  handleAction,
  setCropTarget,
  isRemovingBg,
  isEnhancing,
  handleRemoveBg,
  handleEnhance,
}: ElementMenuShared) {
  const {
    copySelectedElements,
    cutSelectedElements,
    duplicateElement,
    duplicateElements,
    removeElement,
    removeElements,
    bringToFront,
    sendToBack,
    elements,
    selectedIds,
  } = useEditorStore(
    useShallow((state) => ({
      copySelectedElements: state.copySelectedElements,
      cutSelectedElements: state.cutSelectedElements,
      duplicateElement: state.duplicateElement,
      duplicateElements: state.duplicateElements,
      removeElement: state.removeElement,
      removeElements: state.removeElements,
      bringToFront: state.bringToFront,
      sendToBack: state.sendToBack,
      elements: state.elements,
      selectedIds: state.selectedIds,
    })),
  );

  const el = elements.find((e) => e.id === targetId);
  const imgEl = el?.type === 'image' ? (el as ImageElement) : null;
  const isLocked = el?.locked === true;
  const targetSelectionIds =
    selectedIds.length > 1 && selectedIds.includes(targetId) ? selectedIds : [targetId];
  const selectedTargets = elements.filter((e) => targetSelectionIds.includes(e.id));
  const unlockedIds = selectedTargets.filter((e) => !e.locked).map((e) => e.id);
  const allTargetsLocked = selectedTargets.length > 0 && unlockedIds.length === 0;
  const hasSomeLocked = unlockedIds.length < selectedTargets.length;
  const lockableItemClassName = `${menuItemClassName} disabled:opacity-40 disabled:pointer-events-none`;
  const lockableSpinnerClassName = `${menuItemSpinnerClassName} disabled:pointer-events-none`;
  const imageShapePair = getImageShapePair(elements, targetSelectionIds);
  const { isMasking, triggerMaskImageWithShape } = useImageShapeMaskAction(onClose);

  return (
    <div className="space-y-1">
      {imageShapePair && (
        <button
          type="button"
          role="menuitem"
          tabIndex={-1}
          className={lockableSpinnerClassName}
          disabled={isMasking}
          onClick={() => void triggerMaskImageWithShape()}
        >
          {isMasking ? <Spinner size={14} /> : <Crop size={14} weight="regular" />}
          <span>قنّع الصورة بهذا الشكل</span>
        </button>
      )}
      {/* قسم إعادة تحرير الملصق — للعناصر المدرجة من استوديو الملصقات فقط */}
      {imgEl?.stickerSource && (
        <>
          <div className={menuSectionLabelClassName}>استوديو الملصقات</div>
          <div className="space-y-0.5">
            <button
              role="menuitem"
              tabIndex={-1}
              disabled={isLocked}
              className={lockableItemClassName}
              onClick={() => {
                if (isLocked) return;
                handleAction(() => requestStickerReedit(imgEl.id));
              }}
            >
              <Sticker
                className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
                weight="duotone"
              />
              <span className="truncate">تعديل الملصق</span>
            </button>

            {canCopyStickerSvg(imgEl.stickerSource) && (
              <button
                role="menuitem"
                tabIndex={-1}
                className={menuItemClassName}
                onClick={() => {
                  handleAction(() => {
                    void copyStickerSvgWithFeedback(imgEl.stickerSource);
                  });
                }}
              >
                <Code
                  className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
                  weight="duotone"
                />
                <span className="truncate">نسخ SVG متجه</span>
              </button>
            )}
          </div>
          <div className={menuSeparatorClassName} role="separator" />
        </>
      )}

      {/* قسم الذكاء الاصطناعي إن كان عنصراً صورياً */}
      {imgEl?.imageSrc && (
        <>
          <div className={menuSectionLabelClassName}>معالجة الصور</div>
          <div className="space-y-0.5">
            {!imgEl.stickerSource && (
              <button
                role="menuitem"
                tabIndex={-1}
                disabled={isLocked}
                className={lockableItemClassName}
                onClick={() => {
                  if (isLocked) return;
                  handleAction(() =>
                    useCanvasInteraction.getState().setCroppingElementId(imgEl.id),
                  );
                }}
              >
                <FrameCorners
                  className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
                  weight="regular"
                />
                <span className="truncate">ضبط الكادر</span>
              </button>
            )}

            <button
              role="menuitem"
              tabIndex={-1}
              disabled={isLocked}
              className={lockableItemClassName}
              onClick={() => {
                if (isLocked || !imgEl.imageSrc) return;
                const elementId = imgEl.id;
                const expectedImageSrc = imgEl.imageSrc;
                const session = getDocumentSession();
                setCropTarget({
                  imageSrc: expectedImageSrc,
                  originalImageSrc: imgEl.originalImageSrc,
                  onSave: (croppedB64, dims, isActive) =>
                    commitImageElementCrop({
                      elementId,
                      expectedImageSrc,
                      cropped: croppedB64,
                      dims,
                      session,
                      isActive,
                    }),
                });
              }}
            >
              <Crop
                className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
                weight="regular"
              />
              <span className="truncate">قص وتدوير</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              disabled={isLocked || isRemovingBg}
              className={lockableSpinnerClassName}
              onClick={() => {
                if (isLocked) return;
                handleRemoveBg(imgEl);
                onClose();
              }}
            >
              {isRemovingBg ? (
                <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} />
              ) : (
                <Sparkle
                  className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
                  weight="duotone"
                />
              )}
              <span className="truncate">{isRemovingBg ? 'جاري العزل ...' : 'عزل الخلفية'}</span>
            </button>

            <button
              role="menuitem"
              tabIndex={-1}
              disabled={isLocked || isEnhancing}
              className={lockableSpinnerClassName}
              onClick={() => {
                if (isLocked) return;
                handleEnhance(imgEl);
                onClose();
              }}
            >
              {isEnhancing ? (
                <Spinner className="w-3.5 h-3.5 text-primary shrink-0" size={14} />
              ) : (
                <MagicWand
                  className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
                  weight="duotone"
                />
              )}
              <span className="truncate">{isEnhancing ? 'جاري الترميم ...' : 'ترميم الوجه'}</span>
            </button>
          </div>
          <div className={menuSeparatorClassName} role="separator" />
        </>
      )}

      {/* قسم التحكم والترتيب */}
      <div className={menuSectionLabelClassName}>التحكم والترتيب</div>
      <div className="space-y-0.5">
        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() =>
            handleAction(() => {
              copySelectedElements(targetSelectionIds);
            })
          }
        >
          <Copy
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
            weight="regular"
          />
          <span className="truncate">نسخ</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          disabled={allTargetsLocked}
          className={lockableItemClassName}
          onClick={() => {
            if (unlockedIds.length === 0) {
              toast.info('العناصر المحددة مقفلة — ألغِ قفلها أولاً للقص');
              return;
            }
            if (hasSomeLocked) {
              toast.info('تجاهلنا العناصر المقفلة وقصصنا غير المقفلة فقط');
            }
            handleAction(() => {
              cutSelectedElements(unlockedIds);
            });
          }}
        >
          <Scissors
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
            weight="regular"
          />
          <span className="truncate">قص</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() =>
            handleAction(() => {
              pasteFromClipboardOrStore();
            })
          }
        >
          <ClipboardText
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
            weight="regular"
          />
          <span className="truncate">لصق</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() =>
            handleAction(() => {
              const { selectedIds: liveSelectedIds } = useEditorStore.getState();
              if (liveSelectedIds.length > 1) {
                duplicateElements(liveSelectedIds);
              } else {
                duplicateElement(targetId);
              }
            })
          }
        >
          <Copy
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
            weight="regular"
          />
          <span className="truncate">تكرار</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          disabled={isLocked}
          className={lockableItemClassName}
          onClick={() => !isLocked && handleAction(() => bringToFront(targetId))}
        >
          <ArrowUp
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
            weight="bold"
          />
          <span className="truncate">تقديم للأمام</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          disabled={isLocked}
          className={lockableItemClassName}
          onClick={() => !isLocked && handleAction(() => sendToBack(targetId))}
        >
          <ArrowDown
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
            weight="bold"
          />
          <span className="truncate">تأخير للخلف</span>
        </button>

        <div className={menuSeparatorClassName} role="separator" />

        <button
          role="menuitem"
          tabIndex={-1}
          disabled={allTargetsLocked}
          className={`${menuItemDangerClassName} disabled:opacity-40 disabled:pointer-events-none`}
          onClick={() => {
            if (unlockedIds.length === 0) {
              toast.info('العناصر المحددة مقفلة — ألغِ قفلها أولاً للحذف');
              return;
            }
            if (hasSomeLocked) {
              toast.info('تجاهلنا العناصر المقفلة وحذفنا غير المقفلة فقط');
            }
            handleAction(() => {
              if (unlockedIds.length > 1) {
                removeElements(unlockedIds);
              } else {
                removeElement(unlockedIds[0]);
              }
            });
          }}
        >
          <Trash className="w-3.5 h-3.5 text-destructive shrink-0" weight="regular" />
          <span className="truncate font-bold">حذف</span>
        </button>
      </div>
    </div>
  );
}
