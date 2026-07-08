
import { useState, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Toolbar } from "@/components/editor/toolbar";
import { TemplatePanel } from "@/components/editor/template-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { EditorCanvas } from "@/components/editor/editor-canvas";

const PrintDialog = lazy(() => import("@/components/editor/print-dialog").then(module => ({ default: module.PrintDialog })));
const ExportDialog = lazy(() => import("@/components/editor/export-dialog").then(module => ({ default: module.ExportDialog })));
import { PrintArea } from "@/components/editor/print-area";
import { saveProjectAsJSON } from "@/components/editor/export-utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import {
  Settings2,
  PanelsTopLeft,
  Sun,
  Moon,
  Minus,
  Square,
  Minimize2,
  X,
  LayoutGrid,
  Images,
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useWindowControls } from "@/hooks/use-window-controls";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAutoSave } from "@/hooks/use-autosave";
import { useEditorStore } from "@/lib/editor-store";
import { cn } from "@/lib/utils";

export default function App() {
  const [printOpen, setPrintOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileTemplatesOpen, setMobileTemplatesOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const {
    isMaximized,
    isFocused,
    handleMinimize,
    handleMaximize,
    handleClose,
  } = useWindowControls();

  useKeyboardShortcuts();
  useAutoSave();

  const mode = useEditorStore((state) => state.mode);
  const setMode = useEditorStore((state) => state.setMode);

  const isModalOpen = printOpen || exportOpen || mobileTemplatesOpen || mobilePropsOpen;

  return (
    <div 
      className={cn(
        "h-screen flex flex-col overflow-hidden font-cairo transition-colors duration-200",
        isModalOpen 
          ? "bg-background" // خلفية صلبة عند فتح النوافذ المنبثقة لمنع بطء الرسوميات (GPU Compositing Overdraw)
          : "bg-background/80 backdrop-blur-xl" // مظهر زجاجي شفاف فاخر في الصفحة الرئيسية
      )}
      dir="rtl"
    >
      {/* الرأس */}
      <header
        className={`border-b bg-card/90 backdrop-blur-md no-print title-bar-draggable select-none transition-opacity duration-200 ${
          !isFocused ? "opacity-75" : ""
        }`}
        onDoubleClick={handleMaximize}
      >
        <div className="flex items-center justify-between px-4 py-1.5 relative">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/80 shrink-0" />
            <h1 className="text-xs font-bold text-foreground/80">
              Grido Studio | استوديو الهوية
            </h1>
          </div>

          {/* وضع العمل */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-900/60 p-0.5 rounded-full border border-zinc-200/60 dark:border-zinc-800/50 shadow-inner z-10 backdrop-blur-xs title-bar-controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("collage")}
              aria-label="وضع الكولاج"
              className={cn(
                "h-7 px-3.5 rounded-full cursor-pointer gap-1.5 flex items-center justify-center font-cairo text-[10px] z-10 relative transition-colors duration-300",
                mode === "collage"
                  ? "text-primary dark:text-blue-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {mode === "collage" && (
                <motion.div
                  layoutId="active-mode-pill"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/40 dark:border-zinc-700/40 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="leading-none">كولاج</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode("single")}
              aria-label="وضع التعديل الحر"
              className={cn(
                "h-7 px-3.5 rounded-full cursor-pointer gap-1.5 flex items-center justify-center font-cairo text-[10px] z-10 relative transition-colors duration-300",
                mode === "single"
                  ? "text-primary dark:text-blue-400 font-bold"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
              )}
            >
              {mode === "single" && (
                <motion.div
                  layoutId="active-mode-pill"
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/40 dark:border-zinc-700/40 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Images className="w-3.5 h-3.5" />
              <span className="leading-none">تعديل حر</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 title-bar-controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-1.5 h-7 w-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
              title={theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
            >
              {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-7 px-2"
              onClick={() => setMobileTemplatesOpen(true)}
            >
              <PanelsTopLeft className="w-3.5 h-3.5" />
              <span className="text-xs">القوالب</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5 h-7 px-2"
              onClick={() => setMobilePropsOpen(true)}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="text-xs">خصائص</span>
            </Button>

            {/* Separator */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Window Buttons */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMinimize}
              className="w-7 h-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
              title="تصغير"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaximize}
              className="w-7 h-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-muted"
              title={isMaximized ? "استعادة" : "تكبير"}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Square className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-7 h-7 p-0 flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* شريط الأدوات */}
      <Toolbar
        onPrint={() => setPrintOpen(true)}
        onExport={() => setExportOpen(true)}
        onSave={saveProjectAsJSON}
      />

      {/* المحتوى الرئيسي */}
      <main className="flex-1 flex overflow-hidden">
        {/* اللوحة اليسرى - القوالب (للأجهزة الكبيرة) */}
        <aside className="hidden lg:flex h-full w-[28%] min-w-[320px] max-w-[420px] border-l bg-card flex-col no-print animate-panel-right">
          <TemplatePanel />
        </aside>

        {/* الكانفس - الوسط */}
        <section className="flex-1 flex flex-col min-w-0 bg-muted/20 animate-fade-in">
          <div className="flex-1 relative">
            <EditorCanvas />
          </div>

          {/* شريط الحالة السفلي */}
          <div className="border-t bg-card px-4 py-1.5 no-print flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl+Z</kbd>
                تراجع
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Delete</kbd>
                حذف العنصر
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span>اضغط على عنصر لتحديده · اسحب لتغيير الموضع</span>
            </div>
          </div>
        </section>

        {/* اللوحة اليمنى - الخصائص (للأجهزة الكبيرة) */}
        <aside className="hidden lg:flex h-full w-[28%] min-w-[320px] max-w-[420px] border-r bg-card flex-col no-print animate-panel-left">
          <PropertiesPanel />
        </aside>
      </main>

      {/* النوافذ المنزلقة للجوال */}
      <Sheet open={mobileTemplatesOpen} onOpenChange={setMobileTemplatesOpen}>
        <SheetContent side="right" className="w-[85vw] sm:w-96 p-0" dir="rtl">
          <SheetHeader className="border-b">
            <SheetTitle>القوالب الجاهزة</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <TemplatePanel />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={mobilePropsOpen} onOpenChange={setMobilePropsOpen}>
        <SheetContent side="left" className="w-[85vw] sm:w-96 p-0" dir="rtl">
          <SheetHeader className="border-b">
            <SheetTitle>خصائص التعديل</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <PropertiesPanel />
          </div>
        </SheetContent>
      </Sheet>

      {/* نوافذ الطباعة والتصدير */}
      <Suspense fallback={null}>
        <PrintDialog open={printOpen} onOpenChange={setPrintOpen} />
        <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />
      </Suspense>

      {/* منطقة الطباعة - مخفية عن الشاشة ولكن تبقى نشطة ليقوم المتصفح بتحميل وفك تشفير الصور مسبقاً */}
      <div id="print-container" className="absolute left-[-9999px] top-[-9999px] w-0 h-0 overflow-hidden print:block">
        <PrintArea />
      </div>

      <SonnerToaster position="top-center" duration={2500} richColors />
    </div>
  );
}
