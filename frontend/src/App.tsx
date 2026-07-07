
import { useState, lazy, Suspense } from "react";
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
} from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useWindowControls } from "@/hooks/use-window-controls";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAutoSave } from "@/hooks/use-autosave";

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

  return (
    <div className="h-screen flex flex-col bg-background/80 backdrop-blur-xl overflow-hidden font-cairo" dir="rtl">
      {/* الرأس */}
      <header
        className={`border-b bg-card/90 backdrop-blur-md no-print title-bar-draggable select-none transition-opacity duration-200 ${
          !isFocused ? "opacity-75" : ""
        }`}
        onDoubleClick={handleMaximize}
      >
        <div className="flex items-center justify-between px-4 py-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary/80 shrink-0" />
            <h1 className="text-xs font-bold text-foreground/80">
              Grido Studio | استوديو الهوية
            </h1>
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
        <aside className="hidden lg:flex w-[22%] min-w-[240px] max-w-[320px] border-l bg-card flex-col no-print">
          <TemplatePanel />
        </aside>

        {/* الكانفس - الوسط */}
        <section className="flex-1 flex flex-col min-w-0 bg-muted/20">
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
        <aside className="hidden lg:flex w-[22%] min-w-[240px] max-w-[320px] border-r bg-card flex-col no-print">
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

      {/* منطقة الطباعة - مخفية عن الشاشة */}
      <div id="print-container" className="hidden print:block">
        <PrintArea />
      </div>

      <SonnerToaster position="top-center" duration={2500} richColors />
    </div>
  );
}
