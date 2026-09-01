import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/lib/editor-store";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import {
  Image,
  Images,
  FolderOpen,
  Export,
  Printer,
  Broom,
  ArrowUUpLeft,
  ArrowUUpRight,
  ArrowClockwise,
  Copy,
  Trash,
  SelectionAll,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
  Ruler,
  SquaresFour,
  Eye,
  SidebarSimple,
  SlidersHorizontal,
  Scissors,
  ShieldCheck,
  Sparkle,
  Question,
  Info,
} from "@phosphor-icons/react";
import { openDirectoryImageDialog } from "@/lib/io/file-dialog-utils";
import { resolveImageAspectRatio } from "@/lib/canvas/image-dimensions";
import { toast } from "sonner";

export function DesktopMenuBar() {
  const {
    mode,
    setMode,
    undo,
    redo,
    history,
    historyIndex,
    selectedId,
    selectedIds,
    duplicateElement,
    removeElement,
    removeElements,
    selectAllElements,
    selectElement,
    showRuler,
    setShowRuler,
    showGrid,
    setShowGrid,
    collageShowCutLines,
    setCollageShowCutLines,
    setCanvasZoom,
    canvasWidth,
    canvasHeight,
    setCanvasSize,
    addImageElementsBatch,
    setAccountModalOpen,
    userGuides,
    showUserGuides,
    setShowUserGuides,
    clearUserGuides,
  } = useEditorStore(
    useShallow((state) => ({
      mode: state.mode,
      setMode: state.setMode,
      undo: state.undo,
      redo: state.redo,
      history: state.history,
      historyIndex: state.historyIndex,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      duplicateElement: state.duplicateElement,
      removeElement: state.removeElement,
      removeElements: state.removeElements,
      selectAllElements: state.selectAllElements,
      selectElement: state.selectElement,
      showRuler: state.showRuler,
      setShowRuler: state.setShowRuler,
      showGrid: state.showGrid,
      setShowGrid: state.setShowGrid,
      collageShowCutLines: state.collageShowCutLines,
      setCollageShowCutLines: state.setCollageShowCutLines,
      canvasZoom: state.canvasZoom,
      setCanvasZoom: state.setCanvasZoom,
      canvasWidth: state.canvasWidth,
      canvasHeight: state.canvasHeight,
      setCanvasSize: state.setCanvasSize,
      addImageElementsBatch: state.addImageElementsBatch,
      setAccountModalOpen: state.setAccountModalOpen,
      userGuides: state.userGuides,
      showUserGuides: state.showUserGuides,
      setShowUserGuides: state.setShowUserGuides,
      clearUserGuides: state.clearUserGuides,
    }))
  );

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasSelection = !!selectedId || selectedIds.length > 0;

  // Handle open directory directly
  const handleOpenDirectory = async () => {
    try {
      const paths = await openDirectoryImageDialog();
      if (paths && paths.length > 0) {
        const items: { src: string; aspectRatio: number }[] = [];
        for (const p of paths) {
          const aspect = await resolveImageAspectRatio(p);
          items.push({ src: p, aspectRatio: aspect });
        }
        addImageElementsBatch(items);
        toast.success(`تم استيراد وتوزيع ${items.length} صورة من المجلد`);
      }
    } catch (e) {
      console.error(e);
      toast.error("فشل استيراد المجلد");
    }
  };

  const handleToggleOrientation = () => {
    setCanvasSize(canvasHeight, canvasWidth);
  };

  return (
    <div className="flex items-center gap-1 select-none font-cairo" dir="rtl">
      {/* 1. قائمة ملف (File) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
          >
            ملف
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-file-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Image className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">فتح صورة...</span>
            <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-batch-insert-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Images className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">إدراج دفعة...</span>
            <DropdownMenuShortcut>Ctrl+Shift+O</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleOpenDirectory}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <FolderOpen className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">استيراد مجلد...</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-projects-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <FolderOpen className="w-4.5 h-4.5 text-primary" />
              <span className="font-medium">المشاريع...</span>
            </div>
            <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-export-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Export className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">تصدير...</span>
            <DropdownMenuShortcut>Ctrl+E</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-print-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Printer className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">طباعة...</span>
            <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => useEditorStore.getState().reset()}
            className="gap-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md py-1.5"
          >
            <Broom className="w-4.5 h-4.5" />
            <span className="font-medium">تفريغ العمل</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 2. قائمة تحرير (Edit) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
          >
            تحرير
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            disabled={!canUndo}
            onClick={undo}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <ArrowUUpLeft className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">تراجع</span>
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!canRedo}
            onClick={redo}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <ArrowUUpRight className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">إعادة</span>
            <DropdownMenuShortcut>Ctrl+Y</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            disabled={!hasSelection}
            onClick={() => {
              if (selectedId) duplicateElement(selectedId);
            }}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Copy className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">تكرار</span>
            <DropdownMenuShortcut>Ctrl+D</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!hasSelection}
            onClick={() => {
              if (selectedIds.length > 0) removeElements(selectedIds);
              else if (selectedId) removeElement(selectedId);
            }}
            className="gap-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md py-1.5"
          >
            <Trash className="w-4.5 h-4.5" />
            <span className="font-medium">حذف</span>
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={selectAllElements}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <SelectionAll className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">تحديد الكل</span>
            <DropdownMenuShortcut>Ctrl+A</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => selectElement(null)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <span className="font-medium">إلغاء التحديد</span>
            <DropdownMenuShortcut>Esc</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 3. قائمة عرض (View) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
          >
            عرض
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => setCanvasZoom((z) => Math.min(5, parseFloat((z + 0.1).toFixed(2))))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <MagnifyingGlassPlus className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">تكبير</span>
            <DropdownMenuShortcut>Ctrl++</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCanvasZoom((z) => Math.max(0.1, parseFloat((z - 0.1).toFixed(2))))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <MagnifyingGlassMinus className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">تصغير</span>
            <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCanvasZoom(1)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <span className="font-medium">الحجم الفعلي</span>
            <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowRuler(!showRuler)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Ruler className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">المساطر</span>
            <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowGrid(!showGrid)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <SquaresFour className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">الشبكة</span>
            <DropdownMenuShortcut>Ctrl+'</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowUserGuides(!showUserGuides)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Eye className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">الخطوط الإرشادية</span>
            <DropdownMenuShortcut>Ctrl+;</DropdownMenuShortcut>
          </DropdownMenuItem>

          {userGuides.length > 0 && (
            <DropdownMenuItem
              onClick={clearUserGuides}
              className="gap-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md py-1.5"
            >
              <Trash className="w-4.5 h-4.5" />
              <span className="font-medium">مسح الإرشادات</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:toggle-right-sidebar"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <SidebarSimple className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">القوالب</span>
            <DropdownMenuShortcut>Ctrl+B</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:toggle-left-sidebar"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <SlidersHorizontal className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">الخصائص</span>
            <DropdownMenuShortcut>Ctrl+Shift+B</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 4. قائمة كولاج (Collage) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
          >
            كولاج
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => setMode("collage")}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <SquaresFour
                className={cn("w-4.5 h-4.5", mode === "collage" ? "text-primary" : "text-muted-foreground")}
                weight={mode === "collage" ? "fill" : "regular"}
              />
              <span className="font-medium">كولاج شبكي</span>
            </div>
            {mode === "collage" && (
              <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold">نشط</span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setMode("single")}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Image
                className={cn("w-4.5 h-4.5", mode === "single" ? "text-primary" : "text-muted-foreground")}
                weight={mode === "single" ? "fill" : "regular"}
              />
              <span className="font-medium">وضع حر</span>
            </div>
            {mode === "single" && (
              <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold">نشط</span>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleToggleOrientation}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <ArrowClockwise className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">تدوير الورقة</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCollageShowCutLines(!collageShowCutLines)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Scissors className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">علامات القص</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 5. قائمة أدوات (Tools) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
          >
            أدوات
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => setAccountModalOpen(true)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-500" weight="duotone" />
              <span className="font-medium">الترخيص</span>
            </div>
            <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">مرخص</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-batch-insert-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <Sparkle className="w-4.5 h-4.5 text-primary" weight="duotone" />
              <span className="font-medium">معالجة الدفعات</span>
            </div>
            <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded font-bold">AI Pro</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 6. قائمة مساعدة (Help) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs font-semibold text-foreground/80 hover:text-foreground hover:bg-muted/80 rounded-md transition-colors cursor-pointer"
          >
            مساعدة
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-shortcuts"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Question className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">الاختصارات</span>
            <DropdownMenuShortcut>Ctrl+/</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:check-updates"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <Info className="w-4.5 h-4.5 text-muted-foreground" />
            <span className="font-medium">التحديثات</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
