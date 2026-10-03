import React from 'react';
import { Button } from '@/components/ui/button';
import { Sticker } from '@/components/ui/icons';
import { FluentTooltip as TooltipBtn } from '@/components/ui/blocks';
import { useEditorStore } from '@/lib/editor-store';
import type { StickerElementSource } from '@/lib/store/types';
import { REEDIT_STICKER_EVENT, type ReeditStickerEventDetail } from './sticker-reedit-bus';
import { AddTextDropdown } from './toolbar-add-text';
import { AddShapesDropdown } from './toolbar-add-shapes';

const BarcodeDialog = React.lazy(() =>
  import('../dialogs/barcode-dialog').then((m) => ({ default: m.BarcodeDialog })),
);

const preloadBarcodeDialog = () => {
  import('../dialogs/barcode-dialog');
  // 🚀 تسخين مولدات الباركود/QR الكسولة مع الحوار — أول توليد يصبح فورياً
  import('@/features/stickers/lib/barcode-svg').then((m) => m.warmupBarcodeLibs());
};

/**
 * حد إعادة تحرير الملصق — انظر sticker-reedit-bus.ts
 * مالك حالة النافذة هو هذا المكوّن؛ يلتقط حد إعادة التحرير ويفتح الاستوديو على العنصر نفسه.
 */

/** مجموعة أدوات الإضافة (نص/أشكال/ملصقات) — تملك حالة نافذة الاستوديو والتحميل المسبق. */
export const ToolbarAddTools = React.memo(function ToolbarAddTools() {
  const [isBarcodeOpen, setIsBarcodeOpen] = React.useState(false);
  // معرّف عنصر الملصق قيد إعادة التحرير (null = فتح عادي من الشريط)
  const [editingId, setEditingId] = React.useState<string | null>(null);
  // العنصر يُقرأ من المتجر ليُمرر كمصدر ثابت للحوار (key يضمن إعادة التهيئة لكل عنصر)
  const editingEl = useEditorStore(
    React.useCallback(
      (s: {
        elements: Array<{ id: string; type: string; stickerSource?: StickerElementSource }>;
      }) => (editingId ? (s.elements.find((e) => e.id === editingId) ?? null) : null),
      [editingId],
    ),
  );

  React.useEffect(() => {
    // تحميل مسبق لنافذة الاستوديو في وقت خمول الواجهة لضمان الفتح الفوري اللحظي عند النقر
    const timer = setTimeout(() => {
      preloadBarcodeDialog();
    }, 1500);

    const openHandler = () => {
      preloadBarcodeDialog();
      setEditingId(null);
      setIsBarcodeOpen(true);
    };

    const reeditHandler = (e: Event) => {
      const detail = (e as CustomEvent<ReeditStickerEventDetail>).detail;
      if (!detail?.elementId) return;
      preloadBarcodeDialog();
      setEditingId(detail.elementId);
      setIsBarcodeOpen(true);
    };

    window.addEventListener('grido:open-stickers-dialog', openHandler);
    window.addEventListener(REEDIT_STICKER_EVENT, reeditHandler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('grido:open-stickers-dialog', openHandler);
      window.removeEventListener(REEDIT_STICKER_EVENT, reeditHandler);
    };
  }, []);

  const editingElement =
    editingEl && editingEl.type === 'image' && editingEl.stickerSource
      ? { id: editingEl.id, source: editingEl.stickerSource }
      : null;

  return (
    <div className="fluent-command-group shadow-2xs">
      <AddTextDropdown />
      <AddShapesDropdown />

      {/* استوديو الملصقات والإطارات */}
      <TooltipBtn content="الملصقات والإطارات">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsBarcodeOpen(true)}
          onMouseEnter={preloadBarcodeDialog}
          onFocus={preloadBarcodeDialog}
          aria-label="الملصقات"
          className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer flex items-center justify-center"
        >
          {/* 🎨 الأيقونة ترث حالة الزر (رمادي في الراحة → داكن عند التمرير) —
              الأزرق محجوز لحالة التفعيل الفعلية، فراجع نمط «مفعّل» في
              toolbar-image-filters بدل تلوين أيقونة في حالة الراحة */}
          <Sticker className="w-5 h-5" weight="bold" />
        </Button>
      </TooltipBtn>

      {isBarcodeOpen && (
        <React.Suspense fallback={null}>
          <BarcodeDialog
            key={editingElement ? `edit-${editingElement.id}` : 'new'}
            open={isBarcodeOpen}
            onOpenChange={setIsBarcodeOpen}
            editingElement={editingElement}
          />
        </React.Suspense>
      )}
    </div>
  );
});
