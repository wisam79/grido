import React from 'react';

import { useEditorStore } from '@/lib/editor-store';

import { REEDIT_STICKER_EVENT, type ReeditStickerEventDetail } from './sticker-reedit-bus';

import type { StickerElementSource } from '@/lib/store/types';

const BarcodeDialog = React.lazy(() =>
  import('./barcode-dialog').then((m) => ({ default: m.BarcodeDialog })),
);

const preloadBarcodeDialog = () => {
  import('./barcode-dialog');
  // 🚀 تسخين مولدات الباركود/QR الكسولة مع الحوار — أول توليد يصبح فورياً
  import('@/features/stickers/lib/barcode-svg').then((m) => m.warmupBarcodeLibs());
};

/**
 * مضيف استوديو الملصقات الدائم — يملك النافذة وحد إعادة التحرير خارج شريط
 * الأدوات، فيبقى الفتح متاحاً من مكتبة العناصر ولوحة الأوامر وقائمة سطح المكتب.
 * كان يعيش داخل ToolbarAddTools فتُفقد النافذة كلها بحذف أدوات الإضافة.
 */
export const StickerStudioHost = React.memo(function StickerStudioHost() {
  const [isOpen, setIsOpen] = React.useState(false);
  // معرّف عنصر الملصق قيد إعادة التحرير (null = فتح جديد من المكتبة)
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
    // تحميل مسبق في وقت خمول الواجهة لضمان الفتح الفوري عند النقر
    const timer = setTimeout(() => {
      preloadBarcodeDialog();
    }, 1500);

    const openHandler = () => {
      preloadBarcodeDialog();
      setEditingId(null);
      setIsOpen(true);
    };

    const reeditHandler = (e: Event) => {
      const detail = (e as CustomEvent<ReeditStickerEventDetail>).detail;
      if (!detail?.elementId) return;
      preloadBarcodeDialog();
      setEditingId(detail.elementId);
      setIsOpen(true);
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

  if (!isOpen) return null;

  return (
    <React.Suspense fallback={null}>
      <BarcodeDialog
        key={editingElement ? `edit-${editingElement.id}` : 'new'}
        open={isOpen}
        onOpenChange={setIsOpen}
        editingElement={editingElement}
      />
    </React.Suspense>
  );
});
