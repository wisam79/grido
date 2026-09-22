import React from "react";
import { Button } from "@/components/ui/button";
import { SealCheck } from "@/components/ui/icons";
import { FluentTooltip as TooltipBtn } from "@/components/ui/blocks";
import { AddTextDropdown } from "./toolbar-add-text";
import { AddShapesDropdown } from "./toolbar-add-shapes";

const BarcodeDialog = React.lazy(() => import("../dialogs/barcode-dialog").then((m) => ({ default: m.BarcodeDialog })));

const preloadBarcodeDialog = () => {
  import("../dialogs/barcode-dialog");
};

/** مجموعة أدوات الإضافة (نص/أشكال/ملصقات) — تملك حالة نافذة الاستوديو والتحميل المسبق. */
export const ToolbarAddTools = React.memo(function ToolbarAddTools() {
  const [isBarcodeOpen, setIsBarcodeOpen] = React.useState(false);

  React.useEffect(() => {
    // تحميل مسبق لنافذة الاستوديو في وقت خمول الواجهة لضمان الفتح الفوري اللحظي عند النقر
    const timer = setTimeout(() => {
      preloadBarcodeDialog();
    }, 1500);

    const openHandler = () => {
      preloadBarcodeDialog();
      setIsBarcodeOpen(true);
    };
    window.addEventListener("grido:open-stickers-dialog", openHandler);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("grido:open-stickers-dialog", openHandler);
    };
  }, []);

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
          <SealCheck className="w-5 h-5 text-primary" weight="bold" />
        </Button>
      </TooltipBtn>

      {isBarcodeOpen && (
        <React.Suspense fallback={null}>
          <BarcodeDialog open={isBarcodeOpen} onOpenChange={setIsBarcodeOpen} />
        </React.Suspense>
      )}
    </div>
  );
});
