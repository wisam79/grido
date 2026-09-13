import React from "react";
import { StickerStudioDialog, StickerStudioDialogProps } from "@/features/stickers";

export type BarcodeDialogProps = StickerStudioDialogProps;

export const BarcodeDialog = React.memo(function BarcodeDialog(props: BarcodeDialogProps) {
  return <StickerStudioDialog {...props} />;
});

BarcodeDialog.displayName = "BarcodeDialog";

export { StickerStudioDialog };
