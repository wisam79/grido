import React from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import {
  TextT,
  CaretDown,
  TextHOne,
  TextHTwo,
  FileText,
  Circle,
  Square,
  Star,
  LineSegment,
  ArrowUUpLeft,
  ArrowUUpRight,
  SealCheck,
} from "@phosphor-icons/react";
import { GeometricShapesIcon } from "@/components/ui/image-icons";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const BarcodeDialog = React.lazy(() => import("../dialogs/barcode-dialog").then((m) => ({ default: m.BarcodeDialog })));

interface TooltipBtnProps {
  content: string;
  children: React.ReactElement;
}

function TooltipBtn({ content, children }: TooltipBtnProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

const preloadBarcodeDialog = () => {
  import("../dialogs/barcode-dialog");
};

const ToolbarAddTools = React.memo(function ToolbarAddTools() {
  const [isBarcodeOpen, setIsBarcodeOpen] = React.useState(false);
  const addTextPreset = useEditorStore((state) => state.addTextPreset);
  const addShapeElement = useEditorStore((state) => state.addShapeElement);

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
      {/* نص مع خيارات قياسية */}
      <DropdownMenu>
        <TooltipBtn content="إضافة نص">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid="toolbar-add-text"
              aria-label="إضافة نص"
              className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
            >
              <TextT className="w-5 h-5" />
              <CaretDown className="w-4 h-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipBtn>
        <DropdownMenuContent align="start" className="w-56 font-cairo rounded-2xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1.5 space-y-1">
          <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 uppercase tracking-wider select-none">
            نصوص قياسية
          </div>

          <DropdownMenuItem
            onClick={() => addTextPreset("heading")}
            className="flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <TextHOne className="w-5 h-5" weight="bold" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="font-bold text-foreground truncate">عنوان رئيسي</span>
                <span className="text-micro text-muted-foreground/80 truncate">نص عريض</span>
              </div>
            </div>
            <span className="text-micro font-mono font-bold px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
              48px
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => addTextPreset("subheading")}
            className="flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary/80 flex items-center justify-center shrink-0">
                <TextHTwo className="w-5 h-5" weight="bold" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="font-semibold text-foreground truncate">عنوان فرعي</span>
                <span className="text-micro text-muted-foreground/80 truncate">نص متوسط</span>
              </div>
            </div>
            <span className="text-micro font-mono font-medium px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
              28px
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => addTextPreset("body")}
            className="flex items-center justify-between gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0 text-start">
                <span className="font-normal text-foreground truncate">نص عادي</span>
                <span className="text-micro text-muted-foreground/80 truncate">فقرة تفاصيل</span>
              </div>
            </div>
            <span className="text-micro font-mono px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0">
              18px
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* أشكال أساسية */}
      <DropdownMenu>
        <TooltipBtn content="إضافة شكل">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid="toolbar-add-shape"
              className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-1"
              aria-label="إضافة شكل"
            >
              <GeometricShapesIcon className="w-5 h-5" />
              <CaretDown className="w-4 h-4 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipBtn>
        <DropdownMenuContent align="start" className="w-44 font-cairo rounded-2xl backdrop-blur-2xl bg-popover/95 border border-border/80 dark:border-white/10 shadow-fluent-16 p-1.5 space-y-1">
          <div className="px-2.5 py-1 text-mini font-bold text-muted-foreground/70 uppercase tracking-wider select-none">
            أشكال أساسية
          </div>
          <DropdownMenuItem
            onClick={() => addShapeElement("rect")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Square className="w-5 h-5" />
            </div>
            <span className="font-semibold text-foreground">مستطيل</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => addShapeElement("ellipse")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Circle className="w-5 h-5" />
            </div>
            <span className="font-semibold text-foreground">دائرة</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => addShapeElement("line")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <LineSegment className="w-5 h-5" />
            </div>
            <span className="font-semibold text-foreground">خط</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => addShapeElement("star")}
            className="flex items-center gap-2.5 p-2 text-xs rounded-xl cursor-pointer hover:bg-accent/80 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Star className="w-5 h-5" weight="fill" />
            </div>
            <span className="font-semibold text-foreground">نجمة</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

const ToolbarHistoryTools = React.memo(function ToolbarHistoryTools() {
  const canUndo = useEditorStore((state) => state.historyIndex > 0);
  const canRedo = useEditorStore((state) => state.historyIndex < state.history.length - 1);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <div className="fluent-command-group shadow-2xs">
      <TooltipBtn content="تراجع">
        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          data-testid="toolbar-undo"
          aria-label="تراجع"
          className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <ArrowUUpLeft className="w-5 h-5" />
        </Button>
      </TooltipBtn>
      <TooltipBtn content="إعادة">
        <Button
          variant="ghost"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          data-testid="toolbar-redo"
          aria-label="إعادة"
          className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
        >
          <ArrowUUpRight className="w-5 h-5" />
        </Button>
      </TooltipBtn>
    </div>
  );
});

export { TooltipBtn, ToolbarAddTools, ToolbarHistoryTools };
