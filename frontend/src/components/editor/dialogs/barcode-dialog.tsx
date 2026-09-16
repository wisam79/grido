import React from "react";
import { StickerStudioDialog, StickerStudioDialogProps } from "@/features/stickers";

export type BarcodeDialogProps = StickerStudioDialogProps;

/**
 * @deprecated اسم تاريخي مضلل — هذا الحوار هو استوديو الملصقات التجاري
 * وليس حوار باركود للمعاملات. استخدم StickerStudioDialog مباشرة.
 * محفوظ للتوافق مع الاستيرادات القائمة فقط.
 */
export const BarcodeDialog = React.memo(function BarcodeDialog(props: BarcodeDialogProps) {
  return <StickerStudioDialog {...props} />;
});

BarcodeDialog.displayName = "StickerStudioDialog(BarcodeAlias)";

export { StickerStudioDialog };
