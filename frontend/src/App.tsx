"use client";

import { useState, useEffect } from "react";
import { Toolbar } from "@/components/editor/toolbar";
import { TemplatePanel } from "@/components/editor/template-panel";
import { PropertiesPanel } from "@/components/editor/properties-panel";
import { EditorCanvas } from "@/components/editor/editor-canvas";
import { PrintDialog } from "@/components/editor/print-dialog";
import { ExportDialog } from "@/components/editor/export-dialog";
import { PrintArea } from "@/components/editor/print-area";
import { useEditorStore } from "@/lib/editor-store";
import { saveProjectAsJSON } from "@/components/editor/export-utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import {
  Palette,
  Settings2,
  PanelsTopLeft,
  Sparkles,
  Images,
  Sun,
  Moon,
  Minus,
  Square,
  Minimize2,
  X,
} from "lucide-react";
import { WindowMinimise, WindowToggleMaximise, Quit as WindowClose } from "../wailsjs/runtime/runtime";

export default function App() {
  const [printOpen, setPrintOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mobileTemplatesOpen, setMobileTemplatesOpen] = useState(false);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");

      const handleResize = () => {
        const isMax =
          window.outerWidth >= window.screen.availWidth &&
          window.outerHeight >= window.screen.availHeight;
        setIsMaximized(isMax);
      };
      window.addEventListener("resize", handleResize);
      handleResize();

      const handleFocus = () => setIsFocused(true);
      const handleBlur = () => setIsFocused(false);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);

      const handleContextMenu = (e: MouseEvent) => {
        if (
          (e.target as HTMLElement).tagName !== "INPUT" &&
          (e.target as HTMLElement).tagName !== "TEXTAREA"
        ) {
          e.preventDefault();
        }
      };
      window.addEventListener("contextmenu", handleContextMenu);

      return () => {
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("contextmenu", handleContextMenu);
      };
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleMinimize = () => WindowMinimise();
  const handleMaximize = () => {
    WindowToggleMaximise();
    setIsMaximized((prev) => !prev);
  };
  const handleClose = () => WindowClose();

  const { template, collageTemplate } = useEditorStore();

  return (
    <div className="h-screen flex flex-col bg-background/80 backdrop-blur-xl overflow-hidden font-cairo" dir="rtl">
      {/* الرأس */}
      <header
        className={`border-b bg-card/90 backdrop-blur-md no-print title-bar-draggable select-none transition-opacity duration-200 ${
          !isFocused ? "opacity-75" : ""
        }`}
        onDoubleClick={handleMaximize}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
              ID
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">
                استوديو الهوية (Grido Studio)
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                تعديل صور الهوية والجواز والكولاج · طباعة احترافية
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 title-bar-controls">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-1.5"
              title={theme === "light" ? "الوضع الداكن" : "الوضع المضيء"}
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5"
              onClick={() => setMobileTemplatesOpen(true)}
            >
              <PanelsTopLeft className="w-4 h-4" />
              <span className="text-xs">القوالب</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden gap-1.5"
              onClick={() => setMobilePropsOpen(true)}
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-xs">خصائص</span>
            </Button>
            <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
              <Sparkles className="w-3 h-3" />
              <span>تعديل فوري · طباعة دقيقة</span>
            </div>

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
        <aside className="hidden lg:flex w-72 border-l bg-card flex-col no-print">
          <TemplatePanel />
        </aside>

        {/* الكانفس - الوسط */}
        <section className="flex-1 flex flex-col min-w-0 bg-muted/20">
          <div className="flex-1 relative">
            <EditorCanvas />
            {/* شارة وضع التحرير */}
            <div className="absolute top-3 right-3 no-print">
              <div className="bg-card/90 backdrop-blur border rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm flex items-center gap-2">
                {template ? (
                  <>
                    {(() => {
                      const Icon = template.icon;
                      return <Icon className="w-3.5 h-3.5 text-primary" />;
                    })()}
                    <span>{template.name}</span>
                    <span className="text-muted-foreground">
                      · {template.widthMM}×{template.heightMM} مم
                    </span>
                  </>
                ) : collageTemplate ? (
                  <>
                    <Images className="w-3.5 h-3.5 text-primary" />
                    <span>{collageTemplate.name}</span>
                  </>
                ) : (
                  <>
                    <Palette className="w-3.5 h-3.5" />
                    <span>وضع فارغ</span>
                  </>
                )}
              </div>
            </div>
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
        <aside className="hidden lg:flex w-80 border-r bg-card flex-col no-print">
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
      <PrintDialog open={printOpen} onOpenChange={setPrintOpen} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} />

      {/* منطقة الطباعة - مخفية عن الشاشة */}
      <div className="hidden print:block">
        <PrintArea />
      </div>

      <Toaster />
      <SonnerToaster position="top-center" richColors />
    </div>
  );
}
