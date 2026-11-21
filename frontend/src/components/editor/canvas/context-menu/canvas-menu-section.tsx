import { ImageSquare, ClipboardText, Stack } from '@/components/ui/icons';
import { resolveImageAspectRatio } from '@/lib/canvas/image-dimensions';
import { useEditorStore } from '@/lib/editor-store';
import { pasteFromClipboardOrStore } from '@/lib/io/clipboard-utils';
import { openImageFileDialog, persistPickedImage } from '@/lib/io/file-dialog-utils';

import { menuItemClassName, menuSectionLabelClassName } from './menu-item-styles';

/**
 * 🧭 قسم قائمة السياق للمساحة الفارغة: إضافة صورة، لصق، وتحديد الكل —
 * كان JSX هذا مضمّناً في ContextMenu.
 */
export function CanvasMenuSection({
  handleAction,
}: {
  handleAction: (action: () => void) => void;
}) {
  const clipboardCount = useEditorStore((s) => s.clipboardElements?.length ?? 0);
  const canSelectAll = useEditorStore((s) =>
    s.mode === 'collage' ? s.slots.length > 0 : s.elements.length > 0,
  );

  return (
    <div className="space-y-1">
      <div className={menuSectionLabelClassName}>إجراءات الصفحة</div>
      <div className="space-y-0.5">
        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() =>
            handleAction(async () => {
              const [b64] = await openImageFileDialog(false);
              if (b64) {
                const srcToUse = await persistPickedImage(b64);
                const state = useEditorStore.getState();
                if (state.mode === 'collage') {
                  const targetSlot =
                    state.slots.find((s) => s.id === state.selectedId) ??
                    state.slots.find((s) => !s.imageSrc) ??
                    state.slots[0];
                  if (targetSlot) {
                    await state.setSlotImage(targetSlot.id, srcToUse);
                  }
                } else {
                  const aspect = await resolveImageAspectRatio(srcToUse);
                  state.addImageElement(srcToUse, aspect);
                }
              }
            })
          }
        >
          <ImageSquare
            className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
            weight="regular"
          />
          <span className="truncate">إدراج صورة</span>
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
          <span className="truncate">لصق {clipboardCount > 0 ? `(${clipboardCount})` : ''}</span>
        </button>

        {canSelectAll && (
          <button
            role="menuitem"
            tabIndex={-1}
            className={menuItemClassName}
            onClick={() =>
              handleAction(() => {
                const state = useEditorStore.getState();
                if (state.mode === 'collage') {
                  state.setSelectedIds(state.slots.map((s) => s.id));
                } else {
                  state.selectAllElements();
                }
              })
            }
          >
            <Stack
              className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0"
              weight="regular"
            />
            <span className="truncate">تحديد الكل</span>
          </button>
        )}
      </div>
    </div>
  );
}
