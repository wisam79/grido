import { useEditorStore } from "@/lib/editor-store";
import {
  ImageSquare,
  ClipboardText,
  Stack,
  CornersOut,
  Export,
  Printer,
} from "@phosphor-icons/react";
import { openImageFileDialog } from "@/lib/io/file-dialog-utils";
import { SaveImageFromBase64 } from "../../../../../wailsjs/go/main/App";
import { pasteFromClipboardOrStore } from "@/lib/io/clipboard-utils";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";
import { ZOOM_DEFAULT } from "@/lib/canvas/zoom";
import {
  menuItemClassName,
  menuSectionLabelClassName,
  menuSeparatorClassName,
} from "./menu-item-styles";

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
  const hasElements = useEditorStore((s) => s.mode === "single" && s.elements.length > 0);

  return (
    <div className="space-y-1">
      <div className={menuSectionLabelClassName}>
        إجراءات الصفحة
      </div>
      <div className="space-y-0.5">
        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(async () => {
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
              const aspect = await resolveImageAspectRatio(srcToUse);
              useEditorStore.getState().addImageElement(srcToUse, aspect);
            }
          })}
        >
          <ImageSquare className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">إدراج صورة</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            pasteFromClipboardOrStore();
          })}
        >
          <ClipboardText className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">
            لصق {clipboardCount > 0 ? `(${clipboardCount})` : ""}
          </span>
        </button>

        {hasElements && (
          <button
            role="menuitem"
            tabIndex={-1}
            className={menuItemClassName}
            onClick={() => handleAction(() => {
              useEditorStore.getState().selectAllElements();
            })}
          >
            <Stack className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
            <span className="truncate">تحديد الكل</span>
          </button>
        )}

        <div className={menuSeparatorClassName} role="separator" />

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            useEditorStore.getState().setCanvasZoom(ZOOM_DEFAULT);
          })}
        >
          <CornersOut className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">ملاءمة الشاشة (100%)</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            window.dispatchEvent(new CustomEvent("grido:open-export-dialog"));
          })}
        >
          <Export className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" weight="bold" />
          <span className="truncate">تصدير الصورة...</span>
        </button>

        <button
          role="menuitem"
          tabIndex={-1}
          className={menuItemClassName}
          onClick={() => handleAction(() => {
            window.dispatchEvent(new CustomEvent("grido:open-print-dialog"));
          })}
        >
          <Printer className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" weight="regular" />
          <span className="truncate">طباعة المستند...</span>
        </button>
      </div>
    </div>
  );
}
