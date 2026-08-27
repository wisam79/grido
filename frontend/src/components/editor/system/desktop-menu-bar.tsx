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
import { HugeIcon } from "@/components/ui/huge-icon";
import {
  ImageAdd01Icon,
  Image02Icon,
  FolderOpenIcon,
  Download01Icon,
  PrinterIcon,
  BrushCleaningIcon,
  UndoIcon,
  RedoIcon,
  Copy01Icon,
  Delete02Icon,
  Select01Icon,
  ZoomInIcon,
  ZoomOutIcon,
  RulerIcon,
  Grid02Icon,
  SidebarLeft01Icon,
  Settings01Icon,
  RotateClockwiseIcon,
  Scissor01Icon,
  ShieldCheckIcon,
  SparklesIcon,
  HelpCircleIcon,
  InformationCircleIcon,
  ViewIcon,
} from "@hugeicons/core-free-icons";
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
        <DropdownMenuContent align="start" className="w-52 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-file-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={ImageAdd01Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">إضافة صورة...</span>
            <DropdownMenuShortcut>Ctrl+O</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-batch-insert-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={Image02Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">إدراج دفعة صور...</span>
            <DropdownMenuShortcut>Ctrl+Shift+O</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={handleOpenDirectory}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={FolderOpenIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">استيراد مجلد...</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-projects-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <HugeIcon icon={FolderOpenIcon} size={16} className="text-primary" />
              <span className="font-medium">مكتبة المشاريع...</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded">مشاريع</span>
              <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-export-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={Download01Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">تصدير...</span>
            <DropdownMenuShortcut>Ctrl+E</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-print-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={PrinterIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">طباعة...</span>
            <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => useEditorStore.getState().reset()}
            className="gap-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={BrushCleaningIcon} size={16} />
            <span className="font-medium">مسح مساحة العمل</span>
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
        <DropdownMenuContent align="start" className="w-52 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            disabled={!canUndo}
            onClick={undo}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={UndoIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">تراجع</span>
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            disabled={!canRedo}
            onClick={redo}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={RedoIcon} size={16} className="text-muted-foreground" />
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
            <HugeIcon icon={Copy01Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">تكرار المحدد</span>
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
            <HugeIcon icon={Delete02Icon} size={16} />
            <span className="font-medium">حذف المحدد</span>
            <DropdownMenuShortcut>Del</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={selectAllElements}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={Select01Icon} size={16} className="text-muted-foreground" />
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
        <DropdownMenuContent align="start" className="w-52 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => setCanvasZoom((z) => Math.min(5, parseFloat((z + 0.1).toFixed(2))))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={ZoomInIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">تكبير</span>
            <DropdownMenuShortcut>Ctrl++</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCanvasZoom((z) => Math.max(0.1, parseFloat((z - 0.1).toFixed(2))))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={ZoomOutIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">تصغير</span>
            <DropdownMenuShortcut>Ctrl+-</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCanvasZoom(1)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <span className="font-medium">الحجم الفعلي (100%)</span>
            <DropdownMenuShortcut>Ctrl+0</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => setShowRuler(!showRuler)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={RulerIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">{showRuler ? "إخفاء المساطر" : "إظهار المساطر"}</span>
            <DropdownMenuShortcut>Ctrl+R</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowGrid(!showGrid)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={Grid02Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">{showGrid ? "إخفاء الشبكة" : "إظهار الشبكة"}</span>
            <DropdownMenuShortcut>Ctrl+'</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setShowUserGuides(!showUserGuides)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={ViewIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">{showUserGuides ? "إخفاء الخطوط الإرشادية" : "إظهار الخطوط الإرشادية"}</span>
            <DropdownMenuShortcut>Ctrl+;</DropdownMenuShortcut>
          </DropdownMenuItem>

          {userGuides.length > 0 && (
            <DropdownMenuItem
              onClick={clearUserGuides}
              className="gap-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer rounded-md py-1.5"
            >
              <HugeIcon icon={Delete02Icon} size={16} />
              <span className="font-medium">مسح كافة الخطوط الإرشادية</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:toggle-right-sidebar"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={SidebarLeft01Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">لوحة القوالب</span>
            <DropdownMenuShortcut>Ctrl+B</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:toggle-left-sidebar"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={Settings01Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">لوحة الخصائص</span>
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
        <DropdownMenuContent align="start" className="w-52 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => setMode("collage")}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <HugeIcon
                icon={Grid02Icon}
                size={16}
                className={mode === "collage" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="font-medium">وضع الكولاج</span>
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
              <HugeIcon
                icon={Image02Icon}
                size={16}
                className={mode === "single" ? "text-primary" : "text-muted-foreground"}
              />
              <span className="font-medium">الوضع الحر</span>
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
            <HugeIcon icon={RotateClockwiseIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">تدوير الورقة</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setCollageShowCutLines(!collageShowCutLines)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={Scissor01Icon} size={16} className="text-muted-foreground" />
            <span className="font-medium">{collageShowCutLines ? "إخفاء علامات القص" : "إظهار علامات القص"}</span>
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
        <DropdownMenuContent align="start" className="w-52 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => setAccountModalOpen(true)}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <HugeIcon icon={ShieldCheckIcon} size={16} className="text-emerald-500" />
              <span className="font-medium">الحساب والترخيص</span>
            </div>
            <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">مرخص</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-batch-insert-dialog"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <HugeIcon icon={SparklesIcon} size={16} className="text-primary" />
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
        <DropdownMenuContent align="start" className="w-52 font-cairo rounded-xl backdrop-blur-xl fluent-specular shadow-fluent-16">
          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:open-shortcuts"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={HelpCircleIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">اختصارات المفاتيح</span>
            <DropdownMenuShortcut>Ctrl+/</DropdownMenuShortcut>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => window.dispatchEvent(new CustomEvent("grido:check-updates"))}
            className="gap-2.5 text-xs cursor-pointer rounded-md py-1.5"
          >
            <HugeIcon icon={InformationCircleIcon} size={16} className="text-muted-foreground" />
            <span className="font-medium">التحقق من التحديثات</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
