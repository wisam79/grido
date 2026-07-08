import { useState } from "react";
import { useEditorStore } from "@/lib/editor-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Type,
  Square,
  Circle,
  Star,
  Minus,
  Undo2,
  Redo2,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Download,
  Printer,
  Save,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Grid3x3,
  Magnet,
  Columns,
  Link,
  Unlink,
  Ruler,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ToolbarFileOps } from "./toolbar-file-ops";

import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

interface ToolbarProps {
  onPrint: () => void;
  onExport: () => void;
  onSave: () => void;
}

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
      <TooltipContent 
        side="bottom" 
        className="font-cairo text-[11px] py-1.5 px-3 bg-primary text-primary-foreground border-0 shadow-md rounded-md font-medium"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

export function Toolbar({ onPrint, onExport, onSave }: ToolbarProps) {
  const {
    mode,
    elements,
    updateElement,
    pushHistory,
    addTextElement,
    addShapeElement,
    selectedId,
    selectedIds,
    groupSelectedElements,
    ungroupSelectedElements,
    removeElement,
    duplicateElement,
    bringToFront,
    sendToBack,
    undo,
    redo,
    history,
    historyIndex,
    template,
    canvasWidth,
    canvasHeight,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    showColumns,
    setShowColumns,
    showRuler,
    setShowRuler,
  } = useEditorStore(useShallow((state) => ({
    mode: state.mode,
    elements: state.elements,
    updateElement: state.updateElement,
    pushHistory: state.pushHistory,
    addTextElement: state.addTextElement,
    addShapeElement: state.addShapeElement,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    groupSelectedElements: state.groupSelectedElements,
    ungroupSelectedElements: state.ungroupSelectedElements,
    removeElement: state.removeElement,
    duplicateElement: state.duplicateElement,
    bringToFront: state.bringToFront,
    sendToBack: state.sendToBack,
    undo: state.undo,
    redo: state.redo,
    history: state.history,
    historyIndex: state.historyIndex,
    template: state.template,
    canvasWidth: state.canvasWidth,
    canvasHeight: state.canvasHeight,
    showGrid: state.showGrid,
    setShowGrid: state.setShowGrid,
    snapToGrid: state.snapToGrid,
    setSnapToGrid: state.setSnapToGrid,
    showColumns: state.showColumns,
    setShowColumns: state.setShowColumns,
    showRuler: state.showRuler,
    setShowRuler: state.setShowRuler,
  })));

  const alignElement = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    if (!selectedId) return;
    const el = elements.find((e) => e.id === selectedId);
    if (!el) return;
    
    let patch = {};
    if (type === "left") patch = { x: 0 };
    else if (type === "center") patch = { x: 0.5 - el.width / 2 };
    else if (type === "right") patch = { x: 1 - el.width };
    else if (type === "top") patch = { y: 0 };
    else if (type === "middle") patch = { y: 0.5 - el.height / 2 };
    else if (type === "bottom") patch = { y: 1 - el.height };
    
    updateElement(selectedId, patch);
    pushHistory();
    toast.success("تمت محاذاة العنصر");
  };

  const hasSelection = !!selectedId;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative flex items-center gap-2 p-1 px-3 border-b bg-card/65 backdrop-blur-md flex-nowrap overflow-x-auto select-none no-print h-12.5 shrink-0 scrollbar-none shadow-xs">
        
        {/* المجموعة 1: إدارة الملفات والمستندات */}
        <ToolbarFileOps />


        {/* المجموعة 3: إضافة عناصر */}
        <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
          {/* نص */}
          <TooltipBtn content="إضافة نص جديد">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => addTextElement()} 
              aria-label="إضافة نص"
              className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
            >
              <Type className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>

          {/* أشكال */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-0.5" 
                aria-label="إضافة شكل"
              >
                <Square className="w-3.5 h-3.5" />
                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 font-cairo">
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground select-none">أشكال أساسية</div>
              <DropdownMenuItem onClick={() => addShapeElement("rect")} className="gap-2 text-[11px] cursor-pointer">
                <Square className="w-4 h-4 text-muted-foreground" />
                <span>مستطيل</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("ellipse")} className="gap-2 text-[11px] cursor-pointer">
                <Circle className="w-4 h-4 text-muted-foreground" />
                <span>دائرة</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("star")} className="gap-2 text-[11px] cursor-pointer">
                <Star className="w-4 h-4 text-muted-foreground" />
                <span>نجمة</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addShapeElement("line")} className="gap-2 text-[11px] cursor-pointer">
                <Minus className="w-4 h-4 text-muted-foreground" />
                <span>خط مستقيم</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground select-none">رموز وأشكال متجهة</div>
              
              <DropdownMenuItem onClick={() => addShapeElement("path", "M 12,21.35 L 10.55,20.03 C 5.4,15.36 2,12.28 2,8.5 C 2,5.42 4.42,3 7.5,3 C 9.24,3 10.91,3.81 12,5.09 C 13.09,3.81 14.76,3 16.5,3 C 19.58,3 22,5.42 22,8.5 C 22,12.28 18.6,15.36 13.45,20.04 L 12,21.35 Z")} className="gap-2 text-[11px] cursor-pointer">
                <span className="text-xs shrink-0 select-none">❤️</span>
                <span>قلب رومانسي</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => addShapeElement("path", "M 10,40 L 60,40 L 60,20 L 90,50 L 60,80 L 60,60 L 10,60 Z")} className="gap-2 text-[11px] cursor-pointer">
                <span className="text-xs shrink-0 select-none">➡️</span>
                <span>سهم توجيهي</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => addShapeElement("path", "M 20 2 H 4 C 2.9 2 2 2.9 2 4 V 22 L 6 18 H 20 C 21.1 18 22 17.1 22 16 V 4 C 22 2.9 21.1 2 20 2 Z")} className="gap-2 text-[11px] cursor-pointer">
                <span className="text-xs shrink-0 select-none">💬</span>
                <span>فقاعة كلام</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => addShapeElement("path", "M 12 2.163 c 3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069 z M 12 0 C 8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12 c 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98 C 15.668.014 15.259 0 12 0 z M 12 5.838 c -3.403 0 -6.162 2.759 -6.162 6.162 0 3.403 2.759 6.162 6.162 6.162 3.403 0 6.162 -2.759 6.162 -6.162 0 -3.403 -2.759 -6.162 -6.162 -6.162 z M 12 16 c -2.209 0 -4 -1.79 -4 -4 0 -2.209 1.791 -4 4 -4 2.209 0 4 1.791 4 4 0 2.21 -1.79 4 -4 4 z M 18.406 4.156 c -.796 0 -1.441.645 -1.441 1.44 0 .797.645 1.44 1.441 1.44.795 0 1.439 -.643 1.439 -1.44 0 -.795 -.644 -1.44 -1.439 -1.44 z")} className="gap-2 text-[11px] cursor-pointer">
                <span className="text-xs shrink-0 select-none">📸</span>
                <span>إنستغرام</span>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => addShapeElement("path", "M 24 12.073 c 0 -6.627 -5.373 -12 -12 -12 s -12 5.373 -12 12 c 0 5.99 4.388 10.954 10.125 11.854 v -8.385 H 7.078 v -3.47 h 3.047 V 9.43 c 0 -3.007 1.792 -4.669 4.533 -4.669 c 1.312 0 2.686.235 2.686.235 v 2.953 H 15.83 c -1.491 0 -1.956.925 -1.956 1.874 v 2.25 h 3.328 l -0.532 3.47 h -2.796 v 8.385 C 19.612 23.027 24 18.062 24 12.073 z")} className="gap-2 text-[11px] cursor-pointer">
                <span className="text-xs shrink-0 select-none">📘</span>
                <span>فيسبوك</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* المجموعة 4: تعديل وترتيب ومحاذاة العنصر المحدد */}
        {hasSelection && (
          <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs animate-in fade-in zoom-in-95 duration-200">
            <TooltipBtn content="ترتيب: إحضار للأمام">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedId && bringToFront(selectedId)}
                aria-label="إحضار للأمام"
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </Button>
            </TooltipBtn>
            <TooltipBtn content="ترتيب: إرسال للخلف">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedId && sendToBack(selectedId)}
                aria-label="إرسال للخلف"
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </TooltipBtn>
            <TooltipBtn content="تكرار العنصر المحدد">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectedId && duplicateElement(selectedId)}
                aria-label="تكرار"
                className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </TooltipBtn>

            {selectedIds.length >= 2 && (
              <TooltipBtn content="تجميع العناصر المحددة (Group)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={groupSelectedElements}
                  aria-label="تجميع"
                  className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/5 rounded-md transition-all cursor-pointer"
                >
                  <Link className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>
            )}

            {elements.some((el) => selectedIds.includes(el.id) && el.groupId) && (
              <TooltipBtn content="فك تجميع العناصر (Ungroup)">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={ungroupSelectedElements}
                  aria-label="فك التجميع"
                  className="h-7 px-2 text-warning hover:text-warning hover:bg-warning/5 rounded-md transition-all cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>
            )}
            
            <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

            {/* محاذاة */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer gap-0.5" 
                  aria-label="محاذاة العنصر المحدد"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 font-cairo">
                <DropdownMenuItem onClick={() => alignElement("left")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" />
                  <span>محاذاة ليسار الكانفس</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("center")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignCenter className="w-4 h-4 text-muted-foreground" />
                  <span>توسيط أفقي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("right")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignRight className="w-4 h-4 text-muted-foreground" />
                  <span>محاذاة ليمين الكانفس</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => alignElement("top")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignLeft className="w-4 h-4 text-muted-foreground rotate-90" />
                  <span>محاذاة لأعلى الكانفس</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("middle")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignCenter className="w-4 h-4 text-muted-foreground rotate-90" />
                  <span>توسيط عمودي</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => alignElement("bottom")} className="gap-2 text-[11px] cursor-pointer">
                  <AlignRight className="w-4 h-4 text-muted-foreground rotate-90" />
                  <span>محاذاة لأسفل الكانفس</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />

            {/* حذف */}
            <TooltipBtn content="حذف العنصر المحدد">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedId) {
                    removeElement(selectedId);
                    toast.success("تم حذف العنصر");
                  }
                }}
                aria-label="حذف"
                className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/5 rounded-md transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipBtn>
          </div>
        )}

        {/* المجموعة 5: التراجع والإعادة */}
        <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
          <TooltipBtn content="تراجع (Ctrl+Z)">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              aria-label="تراجع"
              className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
          <TooltipBtn content="إعادة (Ctrl+Y)">
            <Button
              variant="ghost"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              aria-label="إعادة"
              className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-background/80 rounded-md transition-all cursor-pointer"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
        </div>

        {/* المجموعة 6: خيارات الرؤية والشبكة (Grid & Snapping - تظهر في وضع التعديل الحر فقط) */}
        {mode === "single" && (
          <>
            <Separator orientation="vertical" className="h-4 bg-border/40 mx-0.5" />
            <div className="flex items-center gap-0.5 bg-muted/30 dark:bg-muted/10 p-0.5 rounded-lg border border-border/20 shadow-xs">
              <TooltipBtn content={showGrid ? "إخفاء الشبكة الإرشادية" : "إظهار الشبكة الإرشادية"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowGrid(!showGrid)}
                  aria-label="إظهار/إخفاء الشبكة"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    showGrid
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Grid3x3 className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>

              <TooltipBtn content={showColumns ? "إخفاء أعمدة التخطيط" : "إظهار أعمدة التخطيط"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowColumns(!showColumns)}
                  aria-label="إظهار/إخفاء الأعمدة"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    showColumns
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Columns className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>

              <TooltipBtn content={showRuler ? "إخفاء المسطرة القياسية" : "إظهار المسطرة القياسية"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRuler(!showRuler)}
                  aria-label="إظهار/إخفاء المسطرة"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    showRuler
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Ruler className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>

              <TooltipBtn content={snapToGrid ? "إيقاف المحاذاة المغناطيسية للشبكة" : "تفعيل المحاذاة المغناطيسية للشبكة"}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSnapToGrid(!snapToGrid)}
                  aria-label="محاذاة مغناطيسية"
                  className={cn(
                    "h-7 px-2 rounded-md transition-all cursor-pointer",
                    snapToGrid
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Magnet className="w-3.5 h-3.5" />
                </Button>
              </TooltipBtn>
            </div>
          </>
        )}

        <div className="flex-1" />

        {/* معلومات القالب */}
        {template && (
          <div className="text-[11px] text-muted-foreground bg-muted/20 dark:bg-muted/10 border border-border/10 rounded-lg px-2.5 py-1.5 hidden lg:flex items-center gap-2 font-medium">
            {(() => {
              const Icon = template.icon;
              return <Icon className="w-3.5 h-3.5 text-primary" />;
            })()}
            <span className="font-bold">{template.name}</span>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono text-muted-foreground/75">{canvasWidth}×{canvasHeight}px</span>
          </div>
        )}

        <Separator orientation="vertical" className="h-5 mx-0.5" />

        {/* المجموعة 6: الحفظ والتصدير والطباعة */}
        <div className="flex items-center gap-1.5">
          <TooltipBtn content="حفظ المشروع محلياً">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onSave} 
              aria-label="حفظ المشروع محلياً"
              className="h-8 w-8 border-border/60 hover:bg-accent/40 rounded-lg cursor-pointer transition-all text-muted-foreground hover:text-foreground"
            >
              <Save className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
          <TooltipBtn content="تصدير كصورة عالية الجودة">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onExport} 
              aria-label="تصدير كصورة"
              className="h-8 w-8 border-border/60 hover:bg-accent/40 rounded-lg cursor-pointer transition-all text-muted-foreground hover:text-foreground"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </TooltipBtn>
          <TooltipBtn content="بدء عملية الطباعة">
            <Button 
              variant="default" 
              size="icon" 
              onClick={onPrint} 
              aria-label="طباعة"
              className="h-8 w-8 bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg cursor-pointer transition-all shadow-xs border-0 hover:shadow-md hover:shadow-indigo-500/10 active:scale-95 flex items-center justify-center"
            >
              <Printer className="w-3.5 h-3.5 text-white" />
            </Button>
          </TooltipBtn>
        </div>

      </div>
    </TooltipProvider>
  );
}
